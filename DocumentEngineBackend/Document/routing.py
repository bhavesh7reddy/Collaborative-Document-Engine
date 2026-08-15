from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/documents/(?P<doc_id>[0-9a-f-]+)/$', consumers.DocumentConsumer.as_asgi()),
]