# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.shortcuts import render
from django.http import HttpResponse
import pandas as pd
import json
import requests

import sys

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

    try:

        errors_data_frame = pd.DataFrame(errors)

        for index, row in errors_data_frame.iterrows():

            csv_input.at[row['line'] - 1, 'Errors'] = row['errors']

        print(csv_input.values.tolist())

        csv_input.to_csv('./poc/static/csv/' + process_id + '.csv', index=False)

        csv_route = './poc/static/csv/' + process_id + '.csv'

        return render(request, 'poc/elements/column-mapping.html', {'csv_route': csv_route, })

    except Exception as e:

        print("Este es el error", e)


def basic_auth(request):

    session = requests.Session()

    api_user = request.POST['api_user']

    api_key = request.POST['api_key']

    environment = request.POST['environment']

    auth_url = url_environment[environment]

    session.auth = (api_user, api_key)

    res = session.get(auth_url + api_user)

    return HttpResponse(json.dumps({"code": res.status_code}), content_type="application/json")


def get_headers(request):

    csv_file = request.FILES["csv_file"]

    csv_input = pd.read_csv(csv_file)

    headers = list(csv_input)

    # return HttpResponse(status=200)
    return HttpResponse(json.dumps({"headers": headers}), content_type="application/json")


def replace_headers(request):

    csv_file = request.FILES["csv_file"]

    new_headers = request.POST["new_headers"]

    new_headers = json.loads(new_headers)

    # print("new headers", type(new_headers))

    csv_input = pd.read_csv(csv_file)

    csv_input.columns = new_headers

    csv_input.to_csv('./poc/static/csv/new_headers.csv', index=False)

    files = {'file': open('./poc/static/csv/new_headers.csv', 'rb')}

    header_data = {

        'Accept': 'application/json',

    }

    try:

        r = requests.post('http://localhost:8080/poc-forklift/validate/', headers=header_data,  files=files)

        print("r: ", r.content, "status: ", r.status_code)

    except requests.exceptions.RequestException as e:
        # catastrophic error. bail.
        print("error", e)
        sys.exit(1)

    return HttpResponse(status=r.status_code)
