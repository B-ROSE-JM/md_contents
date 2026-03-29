from django.urls import path

from . import views


urlpatterns = [
    path("", views.index, name="index"),
    path("api/docs/", views.docs_collection, name="docs_collection"),
    path("api/docs/<int:doc_id>/", views.doc_detail, name="doc_detail"),
    path("api/docs/<int:doc_id>/important/", views.toggle_important, name="toggle_important"),
    path("api/docs/<int:doc_id>/comments/", views.add_comment, name="add_comment"),
    path(
        "api/docs/<int:doc_id>/comments/<int:comment_id>/",
        views.delete_comment,
        name="delete_comment",
    ),
]
