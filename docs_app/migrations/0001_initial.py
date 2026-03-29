# Generated manually for initial schema
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Document",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("content", models.TextField()),
                ("source", models.CharField(default="manual", max_length=30)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
        migrations.CreateModel(
            name="ImportantLine",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("line_number", models.PositiveIntegerField()),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="important_lines",
                        to="docs_app.document",
                    ),
                ),
            ],
            options={
                "ordering": ["line_number"],
                "unique_together": {("document", "line_number")},
            },
        ),
        migrations.CreateModel(
            name="Comment",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "target_type",
                    models.CharField(
                        choices=[("document", "문서"), ("line", "라인")],
                        default="document",
                        max_length=20,
                    ),
                ),
                ("line_number", models.PositiveIntegerField(blank=True, null=True)),
                ("author", models.CharField(default="익명", max_length=50)),
                ("text", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comments",
                        to="docs_app.document",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
