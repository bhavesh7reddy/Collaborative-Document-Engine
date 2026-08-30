import json
import uuid
import logging
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from .models import Document, DocumentAccessLog

logger = logging.getLogger(__name__)

ROOM_PRESENCE = {}

class DocumentConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.save_task = None
        self.pending_content = None

    async def connect(self):
        self.doc_id = self.scope['url_route']['kwargs']['doc_id']
        self.room_group_name = f'doc_{self.doc_id}'
        self.user = self.scope.get('user')

        doc_status = await self.get_or_create_document()

        if doc_status == "INVALID_UUID":
            await self.close(code=4000)
            return

        if doc_status == "ERROR":
            await self.close(code=4004)
            return

        if getattr(self.user, 'is_authenticated', False):
            self.user_id = str(self.user.id)
            self.username = self.user.username
        else:
            guest_tag = self.channel_name[-3:].upper()
            self.user_id = f'anon_{self.channel_name[-6:]}'
            self.username = f'Guest {guest_tag}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        if self.room_group_name not in ROOM_PRESENCE:
            ROOM_PRESENCE[self.room_group_name] = {}

        ROOM_PRESENCE[self.room_group_name][self.channel_name] = {
            'user_id': self.user_id,
            'username': self.username
        }

        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'request_presence_sync'}
        )

        if getattr(self.user, 'is_authenticated', False):
            await self.log_user_access()

    async def disconnect(self, close_code):
        if self.pending_content is not None:
            if self.save_task and not self.save_task.done():
                self.save_task.cancel()
            await self.save_document_content(self.pending_content)
            self.pending_content = None

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

        msg_type = data.get('type')

        # 1. Handle Document Content Sync
        if msg_type == 'doc_update':
            content = data.get('content')
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_doc_update',
                    'content': content,
                    'sender_channel_name': self.channel_name
                }
            )

            self.pending_content = content
            if self.save_task and not self.save_task.done():
                self.save_task.cancel()
            self.save_task = asyncio.create_task(self.debounced_save(1.0))

        # 2. Handle Live Title Updates
        elif msg_type == 'doc_title_update':
            title = data.get('title')

            # Save title to DB asynchronously
            await self.save_document_title(title)

            # Broadcast live title change to all connected clients in the room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_doc_title_update',
                    'title': title,
                    'sender_channel_name': self.channel_name
                }
            )

    async def debounced_save(self, delay):
        try:
            await asyncio.sleep(delay)
            if self.pending_content is not None:
                await self.save_document_content(self.pending_content)
                self.pending_content = None
        except asyncio.CancelledError:
            pass

    async def broadcast_doc_update(self, event):
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps({
                'type': 'doc_update',
                'content': event['content']
            }))

    async def broadcast_doc_title_update(self, event):
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps({
                'type': 'doc_title_update',
                'title': event['title']
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
            User = get_user_model()
            author = self.user if getattr(self.user, 'is_authenticated', False) else None
            
            if not author:
                author = User.objects.filter(is_superuser=True).first() or User.objects.first()

            if not author:
                return "ERROR"

            doc, created = Document.objects.get_or_create(
                id=doc_uuid,
                defaults={
                    'title': 'Untitled Document',
                    'main_author': author,
                }
            )
            return "OK"

        except Exception as e:
            logger.error(f"Error in get_or_create_document: {e}")
            return "ERROR"

    @database_sync_to_async
    def log_user_access(self):
        try:
            doc_uuid = uuid.UUID(self.doc_id)
            DocumentAccessLog.objects.update_or_create(
                document_id=doc_uuid,
                user=self.user
            )
        except Exception as e:
            logger.error(f"Error logging access: {e}")

    @database_sync_to_async
    def save_document_content(self, content):
        try:
            doc_uuid = uuid.UUID(self.doc_id)

            if isinstance(content, str):
                try:
                    content = json.loads(content)
                except json.JSONDecodeError:
                    return

            Document.objects.filter(id=doc_uuid).update(content_json=content)

        except Exception as e:
            logger.error(f"Error saving content: {e}")

    @database_sync_to_async
    def save_document_title(self, title):
        try:
            doc_uuid = uuid.UUID(self.doc_id)
            Document.objects.filter(id=doc_uuid).update(title=title)
        except Exception as e:
            logger.error(f"Error saving document title: {e}")