# -*- coding: utf-8 -*-
from django.contrib import admin

from poc.models import Process, File, Status


@admin.register(Process)
class ProcessAdmin(admin.ModelAdmin):
    list_display = ['name', 'api_user', 'api_token', 'environment']


@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ['filename', 'path', 'num_column', 'id_process', 'deleted']


@admin.register(Status)
class StatusAdmin(admin.ModelAdmin):
    list_display = ['status']
