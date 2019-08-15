# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

def index(request):
    context = {
        'posts': "posts"
    }
    return render(request, 'poc/home.html', context)

@csrf_exempt
def endpoint(request):
    print(request.method)
    csv_file = request.FILES["csv_file"]
    file_data = csv_file.read().decode("utf-8")
    lines = file_data.split("\n")
    for line in lines:
        fields = line.split(",")
        print(fields[0],fields[1],fields[2],fields[3])

    print(csv_file)

    return HttpResponse(status=200) 
