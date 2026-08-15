from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import RegisterView, DocumentListCreateView, DocumentDetailView, RecentDocumentsListView

urlpatterns = [
    # Registration
    path('register/', RegisterView.as_view(), name='auth_register'),
    # Login (Obtain JWT access & refresh tokens)
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # Refresh Token
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('documents/', DocumentListCreateView.as_view(), name='document-list-create'),
    path('documents/recent/', RecentDocumentsListView.as_view(), name='recent-documents'),
    path('documents/<uuid:id>/', DocumentDetailView.as_view(), name='document-detail'),
]