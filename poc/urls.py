# Project Urls

from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('endpoint/', views.endpoint, name='endpoint'),
    path('auth/', views.basic_auth, name='basic_auth'),
    path('get_headers/', views.get_headers, name='get_headers'),
    path('replace_headers/', views.replace_headers, name='replace_headers'),
]
