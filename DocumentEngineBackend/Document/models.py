import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = f"user_{str(self.id)[:8]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.id})"


class Document(models.Model):
    class AccessLevel(models.TextChoices):
        PUBLIC_LINK = 'LINK', 'Anyone with link'
        RESTRICTED = 'PRIVATE', 'Only explicit collaborators'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Untitled Document")
    main_author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="authored_documents"
    )

    access_level = models.CharField(
        max_length=10,
        choices=AccessLevel.choices,
        default=AccessLevel.PUBLIC_LINK
    )

    accessed_by = models.ManyToManyField(
        User,
        through='DocumentAccessLog',
        related_name='accessed_documents'
    )

    content_json = models.JSONField(default=dict, blank=True)
    crdt_state = models.BinaryField(null=True, blank=True)
    search_vector_text = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} ({self.id})"


class DocumentAccessLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    first_accessed_at = models.DateTimeField(auto_now_add=True)
    last_accessed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('document', 'user')
        ordering = ['-last_accessed_at']

    def __str__(self):
        return f"{self.user.username} -> {self.document.title} at {self.last_accessed_at}"