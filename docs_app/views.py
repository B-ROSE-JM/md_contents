import json

from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import Comment, Document, ImportantLine


def index(request):
    return render(request, "docs_app/index.html")


def parse_json_body(request):
    if not request.body:
        return {}
    return json.loads(request.body.decode("utf-8"))


def serialize_comment(comment):
    return {
        "id": comment.id,
        "author": comment.author,
        "text": comment.text,
        "targetType": comment.target_type,
        "lineNumber": comment.line_number,
        "createdAt": comment.created_at.isoformat(),
    }


def serialize_document(document):
    important_lines = list(
        document.important_lines.order_by("line_number").values_list("line_number", flat=True)
    )
    comments = [serialize_comment(c) for c in document.comments.order_by("-created_at")]

    return {
        "id": document.id,
        "title": document.title,
        "content": document.content,
        "source": document.source,
        "createdAt": document.created_at.isoformat(),
        "updatedAt": document.updated_at.isoformat(),
        "importantLines": important_lines,
        "comments": comments,
    }


def touch_document(document_id):
    Document.objects.filter(id=document_id).update(updated_at=timezone.now())


@csrf_exempt
def docs_collection(request):
    if request.method == "GET":
        documents = [serialize_document(d) for d in Document.objects.all().order_by("-updated_at")]
        updated_at = documents[0]["updatedAt"] if documents else None
        return JsonResponse({"documents": documents, "updatedAt": updated_at})

    if request.method == "POST":
        try:
            body = parse_json_body(request)
        except (ValueError, json.JSONDecodeError):
            return JsonResponse({"error": "JSON 형식이 올바르지 않습니다."}, status=400)

        title = (body.get("title") or "").strip() or "Untitled"
        content = (body.get("content") or "").replace("\r\n", "\n")
        source = (body.get("source") or "manual").strip() or "manual"

        if not content.strip():
            return JsonResponse({"error": "문서 내용이 비어 있습니다."}, status=400)

        document = Document.objects.create(
            title=title,
            content=content,
            source=source[:30],
        )
        return JsonResponse(
            {"document": serialize_document(document), "updatedAt": document.updated_at.isoformat()},
            status=201,
        )

    return JsonResponse({"error": "지원하지 않는 메서드입니다."}, status=405)


@csrf_exempt
def doc_detail(request, doc_id):
    document = get_object_or_404(Document, id=doc_id)

    if request.method == "GET":
        return JsonResponse({"document": serialize_document(document)})

    if request.method == "PUT":
        try:
            body = parse_json_body(request)
        except (ValueError, json.JSONDecodeError):
            return JsonResponse({"error": "JSON 형식이 올바르지 않습니다."}, status=400)

        document.title = (body.get("title") or "").strip() or "Untitled"
        document.content = (body.get("content") or "").replace("\r\n", "\n")
        if not document.content.strip():
            return JsonResponse({"error": "문서 내용이 비어 있습니다."}, status=400)
        document.save()
        return JsonResponse({"document": serialize_document(document)})

    if request.method == "DELETE":
        document.delete()
        return JsonResponse({"ok": True})

    return JsonResponse({"error": "지원하지 않는 메서드입니다."}, status=405)


@csrf_exempt
def toggle_important(request, doc_id):
    if request.method != "POST":
        return JsonResponse({"error": "지원하지 않는 메서드입니다."}, status=405)

    document = get_object_or_404(Document, id=doc_id)
    try:
        body = parse_json_body(request)
        line_number = int(body.get("lineNumber"))
    except (ValueError, TypeError, json.JSONDecodeError):
        return JsonResponse({"error": "유효한 라인 번호가 필요합니다."}, status=400)

    if line_number < 1:
        return JsonResponse({"error": "유효한 라인 번호가 필요합니다."}, status=400)

    important_line, created = ImportantLine.objects.get_or_create(
        document=document, line_number=line_number
    )
    if not created:
        important_line.delete()

    touch_document(document.id)
    document.refresh_from_db()
    return JsonResponse({"document": serialize_document(document)})


@csrf_exempt
def add_comment(request, doc_id):
    if request.method != "POST":
        return JsonResponse({"error": "지원하지 않는 메서드입니다."}, status=405)

    document = get_object_or_404(Document, id=doc_id)

    try:
        body = parse_json_body(request)
    except (ValueError, json.JSONDecodeError):
        return JsonResponse({"error": "JSON 형식이 올바르지 않습니다."}, status=400)

    text = (body.get("text") or "").strip()
    author = (body.get("author") or "").strip() or "익명"
    target_type = Comment.TARGET_LINE if body.get("targetType") == Comment.TARGET_LINE else Comment.TARGET_DOCUMENT
    line_number = body.get("lineNumber")

    if not text:
        return JsonResponse({"error": "코멘트 내용이 비어 있습니다."}, status=400)

    if target_type == Comment.TARGET_LINE:
        try:
            line_number = int(line_number)
        except (ValueError, TypeError):
            return JsonResponse({"error": "라인 코멘트에는 유효한 라인 번호가 필요합니다."}, status=400)
        if line_number < 1:
            return JsonResponse({"error": "라인 코멘트에는 유효한 라인 번호가 필요합니다."}, status=400)
    else:
        line_number = None

    comment = Comment.objects.create(
        document=document,
        target_type=target_type,
        line_number=line_number,
        author=author[:50],
        text=text,
    )

    touch_document(document.id)
    document.refresh_from_db()
    return JsonResponse(
        {"comment": serialize_comment(comment), "document": serialize_document(document)},
        status=201,
    )


@csrf_exempt
def delete_comment(request, doc_id, comment_id):
    if request.method != "DELETE":
        return JsonResponse({"error": "지원하지 않는 메서드입니다."}, status=405)

    document = get_object_or_404(Document, id=doc_id)
    comment = get_object_or_404(Comment, id=comment_id, document=document)
    comment.delete()

    touch_document(document.id)
    document.refresh_from_db()
    return JsonResponse({"document": serialize_document(document)})
