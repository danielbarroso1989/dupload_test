# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import pandas as pd
import json
import csv

ENVIRONMENTS = (
    ('sbx', 'Sandbox'),
    ('stg', 'Staging'),
    ('qar', 'QAR API'),
    ('qa58', 'QA58'),

)


def index(request):

    return render(request, 'poc/home.html', {'ENVIRONMENTS': ENVIRONMENTS,
                                             })

@csrf_exempt
def endpoint(request):

    csv_file = request.FILES["csv_file"]

    errors = request.POST['errors']

    errors = json.loads(errors)

    process_id = request.POST['process_id']

    csv_input = pd.read_csv(csv_file)

    csv_input['Errors'] = ''

    errors_data_frame = pd.DataFrame(errors)

    for index, row in errors_data_frame.iterrows():

        csv_input.at[row['line'] - 1, 'Errors'] = row['errors']

    csv_input.to_csv('./poc/static/csv/' + process_id + '.csv', index=False)

    return HttpResponse(status=200)


def csv_func(request):
    pass
