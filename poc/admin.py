# -*- coding: utf-8 -*-
from django.contrib import admin

from poc.models import Process, File, Status, ProcessStep, ProcessHeaders


@admin.register(Process)
class ProcessAdmin(admin.ModelAdmin):
    list_display = ('name', 'api_user', 'api_token', 'environment',)


@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ('filename_original', 'path', 'num_column', 'id_process', 'deleted',)
    list_display_links = ('filename_original', 'num_column')


@admin.register(Status)
class StatusAdmin(admin.ModelAdmin):
    list_display = ('status',)


@admin.register(ProcessStep)
class ProcessStepAdmin(admin.ModelAdmin):
    list_display = ('step',)


@admin.register(ProcessHeaders)
class ProcessHeadersAdmin(admin.ModelAdmin):
    list_display = ('__str__',)
