from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Document, DocumentAccessLog
from .serializers import (
    DocumentSerializer,
    DocumentAccessLogSerializer,
    UserRegisterSerializer,
)


class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # Explicitly bypass token checks for registration
    serializer_class = UserRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': {
                    'id': str(user.id),
                    'username': user.username,
                },
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(main_author=self.request.user)

    def perform_create(self, serializer):
        serializer.save(main_author=self.request.user)


# Fetch, Update, or Delete Single Doc (Auto-logs user access)
class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Track access timestamp
        DocumentAccessLog.objects.update_or_create(
            document=instance, user=request.user
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


# List Recently Viewed Documents for Dashboard
class RecentDocumentsListView(generics.ListAPIView):
    serializer_class = DocumentAccessLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DocumentAccessLog.objects.filter(user=self.request.user)[:10]