# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.shortcuts import render
from django.http import HttpResponse
import pandas as pd
import json
import requests

import sys

import numpy as np

from poc.choices import ENVIRONMENTS, API_HEADERS, ALPHABET
from poc.forms import ProcessForm, FileForm
from poc.models import Status, Process, File
from django.contrib.auth.models import User


url_environment = {"sbx": "https://edna.identitymind.com/im/admin/jax/merchant/"}


def index(request):

    process_form = ProcessForm()
    file_form = FileForm()
    processes = Process.objects.all()

    return render(request, 'poc/home.html', {'ENVIRONMENTS': ENVIRONMENTS,
                                             'process_form': process_form,
                                             'file_form': file_form,
                                             'processes': processes,
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

        csv_input.to_csv('./poc/static/csv/' + process_id + '.csv', index=False)

        csv_route = './poc/static/csv/' + process_id + '.csv'

        return render(request, 'poc/elements/column-mapping.html', {'csv_route': csv_route, })

    except Exception as e:

        print("Error here", e)


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

    if all(elem in API_HEADERS for elem in headers):

        return HttpResponse(json.dumps({"status": 'ok'}), content_type="application/json")

    # return HttpResponse(status=200)
    return HttpResponse(json.dumps({"headers": headers}), content_type="application/json")


def show_correct_file_in_ui(request):

    if request.method == 'POST':

        process_form = ProcessForm(request.POST or None)

        file_form = FileForm(request.POST, request.FILES)

        initial_status = Status.objects.get(pk=1)

        harcoded_user = User.objects.get(pk=1)

        if process_form.is_valid() and file_form.is_valid():

            new_process = process_form.save(commit=False)

            new_process.id_status = initial_status

            new_process.id_user = harcoded_user

            new_process.save()

            new_csv = file_form.save(commit=False)

            new_csv.filename = ''

            new_csv.num_column = 0

            new_csv.id_process = new_process

            new_csv.save()

            csv_input = pd.read_csv(new_csv.path)

            csv_input = csv_input.replace(np.nan, '', regex=True)

            data_list = csv_input.values.tolist()

            data_headers = csv_input.columns.tolist()

            new_csv.num_column = len(data_headers)

            new_csv.save()

            type_exists = False

            if 'type' in data_headers:

                type_exists = True

            return HttpResponse(json.dumps({"headers": data_headers,
                                            "data": data_list,
                                            "is_type": type_exists,
                                            "process": new_process.pk,
                                            }), content_type="application/json")

        else:
            
            print("process form errors", process_form.errors, "file form errors", file_form.errors)

    return HttpResponse(json.dumps({"error": "nothing to show"}), content_type="application/json")


def replace_headers(request):

    if request.method == 'POST':

        process_form = ProcessForm(request.POST or None)

        file_form = FileForm(request.POST, request.FILES)

        initial_status = Status.objects.get(pk=1)

        harcoded_user = User.objects.get(pk=1)

        if process_form.is_valid() and file_form.is_valid():

            new_process = process_form.save(commit=False)

            new_process.id_status = initial_status

            new_process.id_user = harcoded_user

            new_process.save()

            new_csv = file_form.save(commit=False)

            new_csv.filename = ''

            new_csv.id_process = new_process

            new_csv.num_column = len(json.loads(request.POST["new_headers"]))

            new_csv.save()

            new_headers = request.POST["new_headers"]

            new_headers = json.loads(new_headers)

            csv_input = pd.read_csv(new_csv.path)

            csv_input.columns = new_headers

            data_list = csv_input.values.tolist()

            data_headers = csv_input.columns.tolist()

            new_csv.save()

            type_exists = False

            if 'type' in data_headers:

                type_exists = True

            return HttpResponse(json.dumps({"headers": data_headers,
                                            "data": data_list,
                                            "is_type": type_exists,
                                            "process": new_process.pk,
                                            }), content_type="application/json")

        else:

            print("process form errors", process_form.errors, "file form errors", file_form.errors)

    return HttpResponse(json.dumps({"error": "nothing to show"}), content_type="application/json")


def get_process_id(request):

    data = json.loads(request.POST['data'])

    headers = json.loads(request.POST['headers'])

    process_id = json.loads(request.POST['process_id'])

    headers = headers.split(',')

    data_frame = pd.DataFrame(data)

    data_frame.columns = headers

    name = 'get_process_id_' + str(process_id) + '.csv'

    update_document(process_id, data, headers, name)

    file = {'file': open('./media/uploads/' + name, 'rb')}

    header_data = {

        'Accept': 'application/json',

    }

    try:

        r = requests.post('http://localhost:8080/poc-forklift/validate/', headers=header_data, files=file)

        content = r.json()

        return HttpResponse(json.dumps({"process_id": content['processId']}))

    except requests.exceptions.RequestException as e:
        # catastrophic error. bail.
        print("error", e)
        sys.exit(1)

    # return HttpResponse(status=200)


def show_row_with_errors(request):

    errors = request.POST['errors']

    errors = json.loads(errors)

    process_id = json.loads(request.POST['process_id'])

    csv_file = pd.read_csv('./media/uploads/get_process_id_' + str(process_id) + '.csv')

    csv_file['Line'] = ''

    csv_file['Errors'] = ''

    csv_file_with_errors = []

    lines = []

    headers = csv_file.columns.tolist()

    review = review_headers(headers)

    if review:

        return HttpResponse(json.dumps({"undefined_headers": review}))

    try:

        get_all_arrays = main_array(sorted(errors, key=lambda i: i['line']), headers)

        extract_errors = get_all_arrays['extract_errors']

        style_dict = get_all_arrays['style_dict'][0]

        errors_per_cell = get_all_arrays['errors_per_cell'][0]

        errors_data_frame = pd.DataFrame(extract_errors,
                                         columns=['Line', 'Errors']).sort_values(by='Line').reset_index(drop=True)

        for index, row in errors_data_frame.iterrows():

            lines.append(row[0])

            csv_file.at[row[0] - 1, 'Line'] = row[0]

            csv_file.at[row[0] - 1, 'Errors'] = row[1]

            csv_file_with_errors.append(csv_file.iloc[row[0] - 1, :])

        csv_file.to_csv('./media/uploads/csv_errors_' + str(process_id) + '.csv', index=False)

        data_frame_with_errors = pd.DataFrame(csv_file_with_errors).replace(np.nan, '', regex=True)

        data_for_jexcel = data_frame_with_errors.values.tolist()

        return HttpResponse(json.dumps({"headers": headers,
                                        "data": data_for_jexcel,
                                        "style_dict": style_dict,
                                        'errors_per_cell': errors_per_cell,
                                        }), content_type="application/json")

    except Exception as e:

        print("This is the error", e)

    return HttpResponse(status=200)


def validate_changes(request):

    data = json.loads(request.POST['data'])

    headers = json.loads(request.POST['headers'])

    process_id = json.loads(request.POST['process_id'])

    headers = headers.split(',')

    review = review_headers(headers)

    if review:
        return HttpResponse(json.dumps({"undefined_headers": review}))

    data_frame = pd.DataFrame(data)

    data_frame.columns = headers

    csv = pd.read_csv('./media/uploads/get_process_id_' + str(process_id) + '.csv')

    csv = csv.replace(np.nan, '', regex=True)

    for index, row in data_frame.iterrows():

        for h in headers:

            if h != 'Line' and h != 'Errors' and row['Line']:

                line = row['Line'] - 1

                csv.at[line, h] = row[h]

    csv.to_csv('./media/uploads/get_process_id_' + str(process_id) + '.csv', index=False)

    file = {'file': open('./media/uploads/get_process_id_' + str(process_id) + '.csv', 'rb')}

    header_data = {

        'Accept': 'application/json',

    }

    try:

        r = requests.post('http://localhost:8080/poc-forklift/validate/', headers=header_data, files=file)

        content = r.json()

        return HttpResponse(json.dumps({"process_id": content['processId']}))

    except requests.exceptions.RequestException as e:
        # catastrophic error. bail.
        print("error", e)
        sys.exit(1)


def main_array(errors, headers):
    """Get arrays to set style, comments and errors in the table."""

    new_array = []

    extract_errors = []

    style_dict = dict()

    list_errors_per_cell = []

    dict_errors_per_cell = dict()

    extract_line_fields = []

    letter = ''

    for index in range(len(errors)):

        new_array.append(errors[index]['line'])

        errors_to_string = ''

        for key in errors[index]['errors']:

            errors_to_string += 'Field: ' + key['field'] + ' Error: ' + key['error'] + '\n'

            location = headers.index(key['field'])

            if 25 < location < 51:

                letter += 'A'

                remainder = (location % 25) - 1

                letter += ALPHABET[remainder]

            elif location <= 25:

                letter = ALPHABET[location]

            identifier = letter + str(index + 1)

            style_dict[identifier] = 'background-color: #fff3cd'

            dict_errors_per_cell[identifier] = key['error']

        new_array.append(errors_to_string)

        extract_errors.append(new_array)

        new_array = []

    extract_line_fields.append(style_dict)

    list_errors_per_cell.append(dict_errors_per_cell)

    return {'extract_errors': extract_errors,
            'style_dict': extract_line_fields,
            'errors_per_cell': list_errors_per_cell
            }


def review_headers(headers):

    if all(elem in API_HEADERS for elem in headers):

        return []

    not_in_api = []

    for elem in headers:
        if elem not in API_HEADERS and elem != 'Line' and elem != "Errors":
            not_in_api += elem

    return not_in_api


def update_document(process_id, data, headers, file_name, status=None):

    """Update process and file path."""

    try:
        process_id = process_id

        update_process = Process.objects.get(pk=process_id)

        update_file = File.objects.get(id_process=update_process)

        data_frame = pd.DataFrame(data)

        data_frame.columns = headers

        data_frame.to_csv('./media/uploads/' + file_name, index=False)

        if status:

            status_ready = Status.objects.get(pk=2)

            update_process.id_status = status_ready

            update_process.save()

        update_file.path = '/uploads/' + file_name

        update_file.save()

        return HttpResponse(json.dumps({"done": 'done'}), content_type="application/json")

    except Exception as e:

        return HttpResponse(json.dumps({"error": e}), content_type="application/json")


def update_document_to_ready_to_upload(request):

    data = json.loads(request.POST['data'])

    headers = json.loads(request.POST['headers'])

    process_id = json.loads(request.POST['process_id'])

    headers = headers.split(',')

    file_name = 'csv_ready_to_upload_' + str(process_id) + '.csv'

    result = update_document(process_id, data, headers, file_name, 2)

    try:

        r = requests.post('http://localhost:8080/poc-forklift/process/')

        content = r.json()

    except requests.exceptions.RequestException as e:
        # catastrophic error. bail.
        print("error", e)
        sys.exit(1)

    return result
