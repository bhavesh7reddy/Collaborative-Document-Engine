import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Document, DocumentAccessLog

class DocumentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.doc_id = self.scope['url_route']['kwargs']['doc_id']
        self.room_group_name = f'doc_{self.doc_id}'
        self.user = self.scope['user']

        # Join document websocket room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Log access in DB asynchronously
        if self.user.is_authenticated:
            await self.log_user_access()

        # Broadcast active join event
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_presence',
                'event': 'JOIN',
                'user_id': str(self.user.id) if self.user.is_authenticated else 'anonymous',
                'username': self.user.username if self.user.is_authenticated else 'Guest'
            }
        )

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Broadcast disconnect event
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_presence',
                'event': 'LEAVE',
                'user_id': str(self.user.id) if self.user.is_authenticated else 'anonymous',
            }
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')

        # Real-time document edit content updates
        if message_type == 'doc_update':
            content = data.get('content')
            
            # Save document content payload asynchronously
            await self.save_document_content(content)

            # Broadcast changes to other clients in room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_doc_update',
                    'content': content,
                    'sender_channel_name': self.channel_name
                }
            )

    async def broadcast_doc_update(self, event):
        # Prevent echoing back updates to sender
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps({
                'type': 'doc_update',
                'content': event['content']
            }))

    async def user_presence(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def log_user_access(self):
        DocumentAccessLog.objects.update_or_create(
            document_id=self.doc_id,
            user=self.user
        )

    @database_sync_to_async
    def save_document_content(self, content):
        Document.objects.filter(id=self.doc_id).update(content_json=content)