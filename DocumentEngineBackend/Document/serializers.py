from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Document, DocumentAccessLog

User = get_user_model()

class UserRegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=True, max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'password')
        read_only_fields = ('id',)

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            password=validated_data['password']
        )
        return user


class DocumentSerializer(serializers.ModelSerializer):
    main_author_name = serializers.ReadOnlyField(source='main_author.username')

    class Meta:
        model = Document
        fields = ('id', 'title', 'main_author', 'main_author_name', 'content_json', 'created_at', 'updated_at')
        read_only_fields = ('id', 'main_author', 'created_at', 'updated_at')


class DocumentAccessLogSerializer(serializers.ModelSerializer):
    document_title = serializers.ReadOnlyField(source='document.title')
    document_id = serializers.ReadOnlyField(source='document.id')

    class Meta:
        model = DocumentAccessLog
        fields = ('document_id', 'document_title', 'last_accessed_at')