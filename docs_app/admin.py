from django.contrib import admin

from .models import Comment, Document, ImportantLine


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "source", "updated_at")
    search_fields = ("title", "content")
    list_filter = ("source",)


@admin.register(ImportantLine)
class ImportantLineAdmin(admin.ModelAdmin):
    list_display = ("id", "document", "line_number")
    list_filter = ("document",)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("id", "document", "target_type", "line_number", "author", "created_at")
    search_fields = ("author", "text")
    list_filter = ("target_type",)
