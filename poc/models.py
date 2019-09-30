# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from django.contrib.auth.models import User
from poc.choices import ENVIRONMENTS, STEPS
from django.core.files.storage import FileSystemStorage
from mysite import settings

private_storage = FileSystemStorage(location=settings.PRIVATE_STORAGE_ROOT)


class Status(models.Model):
    status = models.CharField(max_length=255, blank=True, null=True)
    initial_date = models.DateTimeField(null=True, blank=True)
    ending_data = models.DateTimeField(null=True, blank=True)
    register_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):

        return self.status

    class Meta:

        verbose_name = "Status"

        verbose_name_plural = "Status"


class ProcessStep(models.Model):
    step = models.CharField(max_length=255, choices=STEPS, default='process-table')
    initial_date = models.DateTimeField(null=True, blank=True)
    ending_data = models.DateTimeField(null=True, blank=True)
    register_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):

        return self.step

    class Meta:

        verbose_name = 'Step'

        verbose_name_plural = 'Steps'


class Process(models.Model):
    pid_validation = models.CharField(max_length=255, blank=True, null=True)
    pid_upload = models.CharField(max_length=255, blank=True, null=True)
    starting_time = models.DateTimeField(null=True, blank=True)
    updating_time = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    completion_percentage = models.FloatField(blank=True, null=True)
    num_successful_reg = models.IntegerField(blank=True, null=True)
    num_failed_reg = models.IntegerField(blank=True, null=True)
    register_date = models.DateTimeField(auto_now_add=True)
    api_user = models.CharField(max_length=255, blank=True, null=True)
    api_token = models.CharField(max_length=255, blank=True, null=True)
    environment = models.CharField(max_length=255, choices=ENVIRONMENTS)
    id_user = models.ForeignKey(User, on_delete=models.PROTECT)
    id_status = models.ForeignKey(Status, on_delete=models.PROTECT)
    id_step = models.ForeignKey(ProcessStep, on_delete=models.PROTECT, null=True)
    used_column_mapping = models.BooleanField(default=False)

    def __str__(self):

        return self.name

    class Meta:

        verbose_name = "Process"

        verbose_name_plural = "Processes"


class File(models.Model):
    path = models.FileField(storage=private_storage, blank=True)
    filename_original = models.CharField(max_length=255, blank=True, null=True)
    filename_validated = models.CharField(max_length=255, blank=True, null=True)
    filename_editing = models.CharField(max_length=255, blank=True, null=True)
    filename = models.CharField(max_length=255, blank=True, null=True)
    num_column = models.IntegerField()
    id_process = models.ForeignKey(Process, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted = models.BooleanField(default=False)

    def __str__(self):

        return self.filename_original

    class Meta:

        verbose_name = "File"

        verbose_name_plural = "Files"


class ProcessHeaders(models.Model):
    header_user = models.CharField(max_length=255, blank=True, null=True)
    header_system = models.CharField(max_length=255, blank=True, null=True)
    initial_date = models.DateTimeField(null=True, blank=True)
    ending_data = models.DateTimeField(null=True, blank=True)
    register_date = models.DateTimeField(auto_now_add=True)
    id_process = models.ForeignKey(Process, models.CASCADE)

    def __str__(self):

        return self.id_process.name

    class Meta:

        verbose_name = 'Headers'

        verbose_name_plural = 'Headers'
