from django.db import models


class Document(models.Model):
    title = models.CharField(max_length=255)
    content = models.TextField()
    source = models.CharField(max_length=30, default="manual")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class ImportantLine(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="important_lines")
    line_number = models.PositiveIntegerField()

    class Meta:
        unique_together = [("document", "line_number")]
        ordering = ["line_number"]

    def __str__(self):
        return f"{self.document_id}:{self.line_number}"


class Comment(models.Model):
    TARGET_DOCUMENT = "document"
    TARGET_LINE = "line"

    TARGET_CHOICES = [
        (TARGET_DOCUMENT, "문서"),
        (TARGET_LINE, "라인"),
    ]

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="comments")
    target_type = models.CharField(max_length=20, choices=TARGET_CHOICES, default=TARGET_DOCUMENT)
    line_number = models.PositiveIntegerField(null=True, blank=True)
    author = models.CharField(max_length=50, default="익명")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.document_id}:{self.target_type}:{self.author}"
