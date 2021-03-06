# -*- coding: utf-8 -*-
from __future__ import unicode_literals
# Django imports

from django.conf import settings
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.shortcuts import render

# Apps imports

from poc.choices import ENVIRONMENTS, API_HEADERS, ALPHABET
from poc.forms import ProcessForm, FileForm
from poc.models import Status, Process, File, ProcessStep, ProcessHeaders

# Another imports
import json
import numpy as np
import os
import pandas as pd
import requests
import sys


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

    """Verify if api user and api token are valid."""

    session = requests.Session()

    api_user = request.POST['api_user']

    api_key = request.POST['api_key']

    environment = request.POST['environment']

    auth_url = url_environment[environment]

    session.auth = (api_user, api_key)

    res = session.get(auth_url + api_user)

    return HttpResponse(json.dumps({"code": res.status_code}), content_type="application/json")


def get_headers(request):

    """Verify if file has valid headers before column mapping step."""

    # is used

    csv_file = request.FILES["csv_file"]

    process_id = request.POST['process_id']

    process = Process.objects.get(pk=request.POST['process_id'])

    csv_input = pd.read_csv(csv_file)

    headers = list(csv_input)

    if all(elem in API_HEADERS for elem in headers):

        return HttpResponse(json.dumps({"status": 'ok'}), content_type="application/json")

    process.used_column_mapping = True

    upload_file_step = ProcessStep.objects.get(step='column-mapping')

    process.id_step = upload_file_step

    process.save()

    return HttpResponse(json.dumps({"headers": headers}), content_type="application/json")


def show_correct_file_in_ui(request):

    """Send data to build the table with data from original file."""

    # is used

    if request.method == 'POST':

        file_form = FileForm(request.POST, request.FILES)

        process_id = request.POST['process_id']

        process = Process.objects.get(pk=process_id)

        if file_form.is_valid():

            new_csv = file_form.save(commit=False)

            new_csv.filename_original = 'original_file_' + str(process.pk)

            new_csv.num_column = 0

            new_csv.id_process = process

            new_csv.save()

            csv_input = pd.read_csv(new_csv.path)

            csv_input = csv_input.replace(np.nan, '', regex=True)

            data_list = csv_input.values.tolist()

            data_headers = csv_input.columns.tolist()

            new_csv.num_column = len(data_headers)

            new_csv.save()

            type_exists = False

            if 'Transaction Type' in data_headers:

                type_exists = True

            upload_file_step = ProcessStep.objects.get(step='editing-data')

            process.id_step = upload_file_step

            process.save()

            return HttpResponse(json.dumps({"headers": data_headers,
                                            "data": data_list,
                                            "is_type": type_exists,
                                            "process": process.pk,
                                            }), content_type="application/json")

        else:
            
            print("file form errors", file_form.errors)

    return HttpResponse(json.dumps({"error": "nothing to show"}), content_type="application/json")


def replace_headers(request):

    """Create file with correct headers after mapping them."""

    # is used

    if request.method == 'POST':

        process_id = request.POST['process_id']

        process = Process.objects.get(pk=process_id)

        file = File.objects.get(id_process=process)

        file.num_column = len(json.loads(request.POST["new_headers"]))

        file.save()

        new_headers = request.POST["new_headers"]

        new_headers = json.loads(new_headers)

        csv_input = pd.read_csv(file.path)

        csv_input = csv_input.replace(np.nan, '', regex=True)

        csv_input.columns = new_headers

        csv_input.to_csv(os.environ['HOME'] + '/Documents/myfiles/' + 'original_file_' + str(process.pk) + '.csv', index=False)

        file.path = 'original_file_' + str(process.pk) + '.csv'

        file.save()

        data_list = csv_input.values.tolist()

        data_headers = csv_input.columns.tolist()

        type_exists = False

        if 'Transaction Type' in data_headers:

            type_exists = True

        upload_file_step = ProcessStep.objects.get(step='editing-data')

        process.id_step = upload_file_step

        process.save()

        return HttpResponse(json.dumps({"headers": data_headers,
                                        "data": data_list,
                                        "is_type": type_exists,
                                        "process": process.pk,
                                        }), content_type="application/json")

    return HttpResponse(json.dumps({"error": "nothing to show"}), content_type="application/json")


def get_process_id(request):

    """Send file to `/validate` request that returns a processId which is used through all the process."""

    # is used

    data = json.loads(request.POST['data'])

    headers = json.loads(request.POST['headers'])

    process_id = json.loads(request.POST['process_id'])

    section = json.loads(request.POST['section'])

    remove_from_list = ['Errors', 'Line']

    result = all(elem in headers for elem in remove_from_list)

    if not isinstance(headers, list):

        headers = headers.split(',')

    data_frame = pd.DataFrame(data)

    data_frame.columns = headers

    if result:

        data_frame.drop(["Errors", "Line"], axis=1, inplace=True)

    if section:

        name = section + '_file_' + str(process_id) + '.csv'

    else:

        name = 'get_process_id_' + str(process_id) + '.csv'

    file = File.objects.get(id_process=Process.objects.get(pk=process_id))

    data_frame.to_csv(os.environ['HOME'] + '/Documents/myfiles/' + name, index=False)

    file.path = os.environ['HOME'] + '/Documents/myfiles/' + name

    file.save()

    file = {'file': open(os.environ['HOME'] + '/Documents/myfiles/' + name, 'rb')}

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

    """Send data to create table with errors."""

    errors = request.POST['errors']

    errors = json.loads(errors)

    process_id = json.loads(request.POST['process_id'])

    process = Process.objects.get(pk=process_id)

    file = File.objects.get(id_process=process)

    csv_file = pd.read_csv(file.path)

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

        csv_file.to_csv(os.environ['HOME'] + '/Documents/myfiles/' + 'validating_file_' + str(process.pk) + '.csv',
                        index=False)

        file.path = 'validating_file_' + str(process.pk) + '.csv'

        file.filename_validated = 'validating_file_' + str(process.pk)

        file.save()

        process.id_step = ProcessStep.objects.get(step='data-validation')

        process.save()

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

    """Validate changes on file, if there are no more it continues to schedule job step."""

    data = json.loads(request.POST['data'])

    headers = json.loads(request.POST['headers'])

    if not isinstance(headers, list):

        headers = headers.split(',')

    process_id = json.loads(request.POST['process_id'])

    review = review_headers(headers)

    if review:

        return HttpResponse(json.dumps({"undefined_headers": review}))

    data_frame = pd.DataFrame(data)

    data_frame.columns = headers

    csv = pd.read_csv(os.environ['HOME'] + '/Documents/myfiles/get_process_id_' + str(process_id) + '.csv')

    csv = csv.replace(np.nan, '', regex=True)

    for index, row in data_frame.iterrows():

        for h in headers:

            if h != 'Line' and h != 'Errors' and row['Line']:

                line = row['Line'] - 1

                csv.at[line, h] = row[h]

    csv.to_csv(os.environ['HOME'] + '/Documents/myfiles/get_process_id_' + str(process_id) + '.csv', index=False)

    process = Process.objects.get(pk=process_id)

    file = File.objects.get(id_process=process)

    file.path = 'get_process_id_' + str(process_id) + '.csv'

    file.save()

    file = {'file': open(os.environ['HOME'] + '/Documents/myfiles/get_process_id_' + str(process_id) + '.csv', 'rb')}

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

    """Function that check if the headers of the file are in the array of valid headers."""

    if all(elem in API_HEADERS for elem in headers):

        return []

    not_in_api = []

    for elem in headers:

        if elem not in API_HEADERS and elem != 'Line' and elem != "Errors":

            not_in_api.append(elem)

    return not_in_api


def update_document(process_id, data, headers, file_name, status=None):

    # review this function, it could be refactor

    """Update process and file path."""

    try:

        update_process = Process.objects.get(pk=process_id)

        update_file = File.objects.get(id_process=update_process)

        data_frame = pd.read_csv(os.environ['HOME'] + '/Documents/myfiles/get_process_id_' + str(process_id) + '.csv')

        data_frame.to_csv(os.environ['HOME'] + '/Documents/myfiles/' + file_name, index=False)

        if status:

            step = ProcessStep.objects.get(step='submit-correct-data')

            update_process.id_step = step

            update_process.save()

        update_file.path = file_name

        update_file.save()

        return HttpResponse(json.dumps({"done": 'done'}), content_type="application/json")

    except Exception as e:

        return HttpResponse(json.dumps({"error": e}), content_type="application/json")


def update_document_to_ready_to_upload(request):

    """Set process instance to ready to upload status."""

    data = json.loads(request.POST['data'])

    headers = json.loads(request.POST['headers'])

    process_id = json.loads(request.POST['process_id'])

    if not isinstance(headers, list):

        headers = headers.split(',')

    file_name = 'csv_ready_to_upload_' + str(process_id) + '.csv'

    result = update_document(process_id, data, headers, file_name, 2)

    # try:
    #
    #     r = requests.post('http://localhost:8080/poc-forklift/process/')
    #
    #     content = r.json()
    #
    # except requests.exceptions.RequestException as e:
    #     # catastrophic error. bail.
    #     print("error", e)
    #     sys.exit(1)

    return result


def save_process_setup(request):

    """Save process after set credentials."""
    # Is used

    if request.method == 'POST':

        process_form = ProcessForm(request.POST or None)

        initial_status = Status.objects.get(pk=7)

        harcoded_user = User.objects.get(pk=1)

        step = ProcessStep.objects.get(step='file-upload')

        if process_form.is_valid():

            new_process = process_form.save(commit=False)

            new_process.id_status = initial_status

            new_process.id_user = harcoded_user

            new_process.id_step = step

            new_process.save()

            return HttpResponse(json.dumps({"process": new_process.pk}), content_type="application/json")

        else:

            print("process form errors", process_form.errors)

            return HttpResponse(json.dumps({"form_error": 'form error'}), content_type="application/json")

    return HttpResponse(json.dumps({"error": "nothing to show"}), content_type="application/json")


def save_progress_file(request):

    """Save progress file. It could be in editing data step or validating data step."""

    if request.method == 'POST':

        data = json.loads(request.POST['data'])

        headers = json.loads(request.POST['headers'])

        process_id = json.loads(request.POST['process_id'])

        section = json.loads(request.POST['section'])

        headers = headers.split(',')

        data_frame = pd.DataFrame(data)

        data_frame.columns = headers

        file_name = section + '_file_' + str(process_id)

        file_path = section + '_file_' + str(process_id) + '.csv'

        num_column = len(headers)

        data_frame.to_csv(settings.PRIVATE_STORAGE_ROOT + file_path, index=False)

        process = Process.objects.get(pk=process_id)

        file = File.objects.get(id_process=process)

        file.filename_editing = file_name

        file.path = file_path

        file.num_column = num_column

        file.save()

        return HttpResponse(json.dumps({"status": 'ok'}), content_type="application/json")

    return HttpResponse(json.dumps({"error": "nothing to show"}), content_type="application/json")


def get_draft(request):

    """Return user to last step."""

    if request.method == 'POST':

        process_id = json.loads(request.POST['process_id'])

        process = Process.objects.get(pk=process_id)

        step = process.id_step.step

        data_headers = []

        data_list = []

        new_headers = []

        try:

            file = File.objects.get(id_process=process)

        except File.DoesNotExist:

            file = None

        if file:

            df_file = pd.read_csv(file.path)

            df_file = df_file.replace(np.nan, '', regex=True)

            data_list = df_file.values.tolist()

            data_headers = df_file.columns.tolist()

        if step == 'column-mapping':

            try:

                headers_instance = ProcessHeaders.objects.filter(id_process=process).last()

            except ProcessHeaders.DoesNotExist:

                headers_instance = None

            if headers_instance:

                new_headers = json.dumps(headers_instance.header_system)

            else:

                for header in data_headers:

                    new_headers.append("")

            new_headers = ", ".join(new_headers)

        return HttpResponse(json.dumps({"data": data_list,
                                        "headers": data_headers,
                                        "step": step,
                                        "new_headers": new_headers,
                                        "process_id": process.pk,
                                        "job_name": process.name,
                                        "api_user": process.api_user,
                                        "environment": process.environment,
                                        }), content_type="application/json")

    return HttpResponse(json.dumps({"error": "nothing to show"}), content_type="application/json")


def save_headers_for_later(request):

    """Save headers on column mapping step, if user needs to save and return later, they don't lose the headers that
    already was mapped."""

    if request.method == 'POST':

        process_id = request.POST['process_id']

        process = Process.objects.get(pk=process_id)

        process.id_step = ProcessStep.objects.get(step='column-mapping')

        process.save()

        new_headers = json.loads(request.POST['new_headers'])

        new_array = []

        for header in new_headers:

            new_array.append(header)

        new_array = ", ".join(new_array)

        ProcessHeaders.objects.create(id_process=process, header_system=new_array)

        return HttpResponse(json.dumps({"status": "ok"}), content_type="application/json")

    return HttpResponse(json.dumps({"error": "nothing to show"}), content_type="application/json")
