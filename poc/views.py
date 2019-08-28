# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.shortcuts import render
from django.http import HttpResponse
import pandas as pd
import json
import requests

ENVIRONMENTS = (
    ('sbx', 'Sandbox'),
    ('stg', 'Staging'),
    ('qar', 'QAR API'),
    ('qa58', 'QA58'),

)

url_environment = {"sbx": "https://edna.identitymind.com/im/admin/jax/merchant/"}


def index(request):

    return render(request, 'poc/home.html', {'ENVIRONMENTS': ENVIRONMENTS,
                                             }
                  )


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


def basic_auth(request):

    session = requests.Session()

    api_user = request.POST['api_user']

    api_key = request.POST['api_key']

    environment = request.POST['environment']

    auth_url = url_environment[environment]

    session.auth = (api_user, api_key)

    res = session.get(auth_url + api_user)

    return HttpResponse(json.dumps({"code": res.status_code}), content_type="application/json")
