import json
import uuid
from django.core.exceptions import ValidationError
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Document, DocumentAccessLog

ROOM_PRESENCE = {}

class DocumentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.doc_id = self.scope['url_route']['kwargs']['doc_id']
        self.room_group_name = f'doc_{self.doc_id}'
        self.user = self.scope['user']

        print(f"\n--- WEBSOCKET CONNECT ATTEMPT ---")
        print(f"Requested Doc ID: {self.doc_id}")

        # Validate and get or create document in DB
        doc_status = await self.get_or_create_document()

        if doc_status == "INVALID_UUID":
            print(f"REJECTED: '{self.doc_id}' is an invalid UUID format.")
            await self.close(code=4000)
            return

        if doc_status == "ERROR":
            print(f"REJECTED: Database error occurred for {self.doc_id}.")
            await self.close(code=4004)
            return

        # Assign user metadata
        if getattr(self.user, 'is_authenticated', False):
            self.user_id = str(self.user.id)
            self.username = self.user.username
        else:
            guest_tag = self.channel_name[-3:].upper()
            self.user_id = f'anon_{self.channel_name[-6:]}'
            self.username = f'Guest {guest_tag}'

        # Join channel group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Track presence
        if self.room_group_name not in ROOM_PRESENCE:
            ROOM_PRESENCE[self.room_group_name] = {}

        ROOM_PRESENCE[self.room_group_name][self.channel_name] = {
            'user_id': self.user_id,
            'username': self.username
        }

        # Sync presence
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'request_presence_sync'}
        )

        if getattr(self.user, 'is_authenticated', False):
            await self.log_user_access()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name') and self.room_group_name in ROOM_PRESENCE:
            ROOM_PRESENCE[self.room_group_name].pop(self.channel_name, None)
            if not ROOM_PRESENCE[self.room_group_name]:
                del ROOM_PRESENCE[self.room_group_name]

        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_presence',
                    'event': 'LEAVE',
                    'user_id': getattr(self, 'user_id', 'unknown'),
                    'leaving_channel': self.channel_name
                }
            )
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        if data.get('type') == 'doc_update':
            content = data.get('content')
            await self.save_document_content(content)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_doc_update',
                    'content': content,
                    'sender_channel_name': self.channel_name
                }
            )

    async def broadcast_doc_update(self, event):
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps({
                'type': 'doc_update',
                'content': event['content']
            }))

    async def request_presence_sync(self, event):
        await self.send(text_data=json.dumps({
            'type': 'presence_snapshot',
            'users': list(ROOM_PRESENCE.get(self.room_group_name, {}).values())
        }))

    async def user_presence(self, event):
        if event.get('event') == 'LEAVE' and 'leaving_channel' in event:
            if self.room_group_name in ROOM_PRESENCE:
                ROOM_PRESENCE[self.room_group_name].pop(event['leaving_channel'], None)

        snapshot = list(ROOM_PRESENCE.get(self.room_group_name, {}).values())
        await self.send(text_data=json.dumps({
            'type': 'presence_snapshot',
            'users': snapshot
        }))

    @database_sync_to_async
    def get_or_create_document(self):
        try:
            doc_uuid = uuid.UUID(self.doc_id)
        except (ValueError, ValidationError):
            return "INVALID_UUID"

        try:
            author = self.user if getattr(self.user, 'is_authenticated', False) else None
            if not author:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                author = User.objects.filter(is_superuser=True).first() or User.objects.first()

            # Atomically get existing or create new record
            doc, created = Document.objects.get_or_create(
                id=doc_uuid,
                defaults={
                    'title': 'Untitled Document',
                    'main_author': author,
                }
            )
            print(f"DB ACTION: {'Created new' if created else 'Loaded existing'} document {doc_uuid}.")
            return "OK"

        except Exception as e:
            print(f"DB ERROR: {e}")
            return "ERROR"

    @database_sync_to_async
    def log_user_access(self):
        try:
            doc_uuid = uuid.UUID(self.doc_id)
            DocumentAccessLog.objects.update_or_create(
                document_id=doc_uuid,
                user=self.user
            )
        except Exception:
            pass

    @database_sync_to_async
    def save_document_content(self, content):
        try:
            doc_uuid = uuid.UUID(self.doc_id)
            Document.objects.filter(id=doc_uuid).update(content_json=content)
        except Exception:
            pass