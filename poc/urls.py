# Project Urls

from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('endpoint/', views.endpoint, name='endpoint'),
    path('auth/', views.basic_auth, name='basic_auth'),
    path('get_headers/', views.get_headers, name='get_headers'),
    path('replace_headers/', views.replace_headers, name='replace_headers'),
    path('show_correct_file_in_ui/', views.show_correct_file_in_ui, name='show_correct_file_in_ui'),
    path('get_process_id/', views.get_process_id, name='get_process_id'),
    path('show_row_with_errors/', views.show_row_with_errors, name='show_row_with_errors'),
    path('validate_changes/', views.validate_changes, name='validate_changes'),
    path('update_document_to_ready_to_upload/', views.update_document_to_ready_to_upload, name='update_document_to_ready_to_upload'),
]
