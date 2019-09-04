# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from django.contrib.auth.models import User


class Process(models.Model):
    name = models.CharField(max_length=255, blank=True)
    validation_process_id = models.CharField(max_length=255, blank=True)
    sending_process_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    user_id = models.ForeignKey(User, on_delete=models.PROTECT)
    completion_percentage = models.FloatField()
    successful_registers = models.IntegerField()
    failed_registers = models.IntegerField()

    def __str__(self):

        return self.name

    verbose_name = "Process"

    verbose_name_plural = "Processes"


class Status(models.Model):
    status = models.CharField(max_length=255)
    initial_date = models.DateTimeField(null=True, blank=True)
    ending_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):

        return self.status

    verbose_name = "Status"

    verbose_name_plural = "Status"


class File(models.Model):
    csv_path = models.FileField(upload_to='uploads/', blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    num_column = models.IntegerField()
    id_process = models.ForeignKey(Process, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted = models.BooleanField(default=False)

    def __str__(self):

        return self.file_name

    verbose_name = "File"

    verbose_name_plural = "Files"


