# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.shortcuts import render
from django.http import HttpResponse
import pandas as pd
import json
import requests
from operator import itemgetter

import sys

ENVIRONMENTS = (
    ('sbx', 'Sandbox'),
    ('stg', 'Staging'),
    ('qar', 'QAR API'),
    ('qa58', 'QA58'),

)

ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U',
            'V', 'W', 'X', 'Y', 'Z']

url_environment = {"sbx": "https://edna.identitymind.com/im/admin/jax/merchant/"}

api_headers = ['type', 'man', 'dob', 'tea', 'dfp', 'dft', 'phn', 'profile', 'bln', 'bfn', 'bsn', 'bco', 'bz',
               'bc', 'memo', 'ip', 'assn', 'amt', 'dman', 'ac', 'as', 'amn', 'az', 'aco', 'asn']


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

    if all(elem in api_headers for elem in headers):

        return HttpResponse(json.dumps({"status": 'ok'}), content_type="application/json")

    # return HttpResponse(status=200)
    return HttpResponse(json.dumps({"headers": headers}), content_type="application/json")


def show_correct_file_in_ui(request):

    csv_file = request.FILES["csv_file"]

    csv_input = pd.read_csv(csv_file)

    csv_input.to_csv('./poc/static/csv/show_csv.csv', index=False)

    new_csv = pd.read_csv('./poc/static/csv/show_csv.csv')

    new_csv = new_csv.fillna(0)

    data_list = new_csv.values.tolist()

    data_headers = new_csv.columns.tolist()

    type_exists = False

    if 'type' in data_headers:
        type_exists = True

    return HttpResponse(json.dumps({"headers": data_headers,
                                    "data": data_list,
                                    "is_type": type_exists
                                    }), content_type="application/json")


def replace_headers(request):

    csv_file = request.FILES["csv_file"]

    new_headers = request.POST["new_headers"]

    new_headers = json.loads(new_headers)

    csv_input = pd.read_csv(csv_file)

    csv_input.columns = new_headers

    csv_input.to_csv('./poc/static/csv/new_headers.csv', index=False)

    new_csv = pd.read_csv('./poc/static/csv/new_headers.csv')

    data_list = new_csv.values.tolist()

    data_headers = new_csv.columns.tolist()

    type_exists = False

    if 'type' in data_headers:

        type_exists = True

    return HttpResponse(json.dumps({"headers": data_headers,
                                    "data": data_list,
                                    "is_type": type_exists
                                    }), content_type="application/json")


def get_process_id(request):

    data = json.loads(request.POST['data'])

    headers = json.loads(request.POST['headers'])

    headers = headers.split(',')

    data_frame = pd.DataFrame(data)

    data_frame.columns = headers

    data_frame.to_csv('./poc/static/csv/get_process_id.csv', index=False)

    file = {'file': open('./poc/static/csv/get_process_id.csv', 'rb')}

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

    csv_file = pd.read_csv('./poc/static/csv/get_process_id.csv')

    csv_file['Line'] = ''

    csv_file['Errors'] = ''

    csv_file_with_errors = []

    lines = []

    new_err = sorted(errors, key = lambda i: i['line'])

    try:

        string_errors = convert_errors_to_string(errors)

        extract_errors = string_errors['extract_errors']

        extract_line_fields = string_errors['extract_line_fields']

        errors_data_frame = pd.DataFrame(extract_errors, columns=['Line', 'Errors']).sort_values(by='Line').reset_index(drop=True)

        print("data frmae", errors_data_frame)

        for index, row in errors_data_frame.iterrows():

            for i in range(len(extract_line_fields)):

                for key in extract_line_fields[i]:

                    if key == 'line' and row[0] == extract_line_fields[i][key]:

                        extract_line_fields[i][key] = index + 1

            lines.append(row[0])

            csv_file.at[row[0] - 1, 'Line'] = row[0]

            csv_file.at[row[0] - 1, 'Errors'] = row[1]

            for j in range(len(new_err)):

                for key in new_err[j]:

                    if key == 'line' and row[0] == new_err[j][key]:

                        new_err[j][key] = index + 1

        new_err = sorted(new_err, key=lambda i: i['line'])

        print("otr", new_err)

        csv_file.to_csv('./poc/static/csv/csv_errors.csv', index=False)

        csv_errors = pd.read_csv('./poc/static/csv/csv_errors.csv')

        for index, row in errors_data_frame.iterrows():

            csv_file_with_errors.append(csv_errors.iloc[row[0] - 1, :])

        data_frame_with_errors = pd.DataFrame(csv_file_with_errors)

        data = data_frame_with_errors.to_json()

        data = json.loads(data)

        headers = csv_file.columns.tolist()

        array_data = get_row_identifier(extract_line_fields, headers)

        style_dict = set_style(array_data)

        errors_per_cell = set_error_to_cell(new_err, headers)

        groups = []

        data_for_jexcel = []

        for attr, value in data.items():

            groups.append(value)

        for li in lines:

            array_per_line = []

            for index in range(len(groups)):

                for key in groups[index]:

                    linea = li - 1

                    if str(linea) == key:

                        array_per_line.append(groups[index][key])

            data_for_jexcel.append(array_per_line)

        data_for_jexcel = sorted(data_for_jexcel, key=itemgetter(-2))

        return HttpResponse(json.dumps({"headers": headers,
                                        "data": data_for_jexcel,
                                        "style_dict": style_dict,
                                        'errors_per_cell': errors_per_cell,
                                        }), content_type="application/json")

    except Exception as e:

        print("Este es el error", e)

    return HttpResponse(status=200)


def validate_changes(request):

    data = json.loads(request.POST['data'])

    headers = json.loads(request.POST['headers'])

    headers = headers.split(',')

    data_frame = pd.DataFrame(data)

    data_frame.columns = headers

    csv = pd.read_csv('./poc/static/csv/get_process_id.csv')

    for index, row in data_frame.iterrows():

        for h in headers:

            if h != 'Line' and h != 'Errors':

                line = row['Line'] - 1

                csv.at[line, h] = row[h]

    csv.to_csv('./poc/static/csv/get_process_id.csv', index=False)

    file = {'file': open('./poc/static/csv/get_process_id.csv', 'rb')}

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


def set_style(array):
    """Create Dictionary with cell Identifier as key and background color as value. It sets style to those cells"""

    back_ground = 'background-color: #fff3cd'

    style_dict = dict()

    letter = ''

    for index in range(len(array)):

        for key in array[index]['location']:

            if 25 < key > 51:

                letter += 'A'

                remainder = (key % 25) - 1

                letter += ALPHABET[remainder]

            elif key <= 25:

                letter = ALPHABET[key]

            identifier = letter + str(array[index]['line'])

            style_dict[identifier] = back_ground

    return style_dict


def convert_errors_to_string(errors_list):

    """Iterate over errors list and extract line and errors. It converts errors objects in string."""

    new_array = []

    extract_errors = []

    line_fields = dict()

    extract_line_fields = []

    for index in range(len(errors_list)):

        new_array.append(errors_list[index]['line'])

        line_fields['line'] = errors_list[index]['line']

        line_fields['field'] = []

        errors_to_string = ''

        for key in errors_list[index]['errors']:

            errors_to_string += 'Field: ' + key['field'] + ' Error: ' + key['error'] + '\n'

            line_fields['field'].append(key['field'])

        new_array.append(errors_to_string)

        extract_errors.append(new_array)

        extract_line_fields.append(line_fields)

        new_array = []

        line_fields = dict()

    return {'extract_errors': extract_errors, 'extract_line_fields': extract_line_fields}


def get_row_identifier(extract_line_fields, headers):
    """Get header position and convert it to a letter to locate it on csv file."""

    line_and_location_lis = dict()

    array_data = []

    for indice in range(len(extract_line_fields)):

        line_and_location_lis['line'] = extract_line_fields[indice]['line']

        line_and_location_lis['location'] = []

        for key in extract_line_fields[indice]['field']:

            location = headers.index(key)

            line_and_location_lis['location'].append(location)

        array_data.append(line_and_location_lis)

        line_and_location_lis = dict()

    return array_data


def set_error_to_cell(errors_list, headers):

    array_data = []

    line_and_location_list = dict()

    for index in range(len(errors_list)):

        line_and_location_list['line'] = errors_list[index]['line']

        line_and_location_list['field'] = dict()

        for key in errors_list[index]['errors']:

            location = headers.index(key['field'])

            line_and_location_list['field'][location] = key['error']

        array_data.append(line_and_location_list)

        line_and_location_list = dict()

    erros_dict = dict()

    letter = ''

    for index in range(len(array_data)):

        for key in array_data[index]['field']:

            if 25 < key > 51:

                letter += 'A'

                remainder = (key % 25) - 1

                letter += ALPHABET[remainder]

            elif key <= 25:

                letter = ALPHABET[key]

            identifier = letter + str(array_data[index]['line'])

            erros_dict[identifier] = array_data[index]['field'][key]

    return erros_dict
