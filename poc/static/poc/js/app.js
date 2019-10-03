const url = "http://localhost:8080/poc-forklift/validate/";

const url2 = "http://localhost:8080/poc-forklift/process/";

const url3 = "http://localhost:8080/poc-forklift/validate/results/";

var errors_cell;

//AJAX config for using CSRF
// using jQuery
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        let cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const csrftoken = getCookie('csrftoken');


class Poc{

    constructor(){

        this._api_key = undefined;
        this._api_user = undefined;
        this._environment = undefined;
        this._job_name = undefined;
        this._csv_file = undefined;
        this.errors_mapping = undefined;
        this.processId  = undefined;
        this.editing_table = undefined;
        this.validation_table = undefined;
        this.errors_per_cell = undefined;
        this._process_id = undefined;

        this.sleep = (milliseconds) => {
          return new Promise(resolve => setTimeout(resolve, milliseconds))
        };



    }

    async submit_account_setup() {

        this._api_key = document.getElementById("api_key").value;

        this._api_user = document.getElementById("api_user").value;

        this._environment = document.getElementById("environment_select").value;

        this._job_name = document.getElementById("job_name").value;

        if (this._api_key && this._api_user && this._environment && this._job_name) {

            // let result_validate_credentials = await this.validate_credentials(api_user, api_key, environment);

            let result_validate_credentials = true;

            // if (result_validate_credentials['code'] === 200) {
            if (result_validate_credentials) {

                this.continue_section("account-setup", "file-upload");

            } else {

                this.alert_message(document.getElementById("error_account_setup_text"),
                    'Wrong credentials', 'danger')

            }

        } else {

               this.alert_message(document.getElementById("error_account_setup_text"),
                   'Los campos son obligatorios', 'danger')

        }

    }

    async submit_upload_file(id){

        let myFile = document.getElementById(id).files[0];

        if (this.validate_csv(myFile)){

            await this.ValidateFormatDoc(myFile, id);

            if (this.errors_mapping.length > 0){

                let errors = 'errors';

                if (this.errors_mapping.length === 1)
                    errors = 'error';

                $('#summary-errors').html( `${this.errors_mapping.length} errors` );

            }



        }else{

            this.alert_message(document.getElementById("error_file_upload_text"),
                'File invalid', 'danger');

        }

    }

    create_validate_id(upload_file){

        return new Promise(resolve => {

            let h = new Headers();

            h.append('Accept', 'application/json');

            let form_data = new FormData();

            form_data.append('file', upload_file);

            let req = new Request(url, {
                method: 'POST',
                headers: h,
                body: form_data
            });

            fetch(req)
                .then((response) => {
                    response.json().then(function (data) {

                        resolve(data['processId']);
                    });

                })
                .catch((err) => {
                    console.log('ERROR:', err.message);
                });

        });

    }

    async query_process(process_id) {

        return new Promise(resolve => {

            let h = new Headers();

            h.append('Accept', 'application/json');

            let process_url = `${url2}${process_id}`;

            let req = new Request(process_url, {
                method: 'GET',
                headers: h,
            });

            fetch(req)
                .then((response) => {

                    resolve(response.json());

                })
                .catch((err) => {
                    console.log('ERROR:', err.message);
                });

        });


    }

    processor_request(upload_file){

        return new Promise(resolve => {

            let h = new Headers();

            h.append('Accept', 'application/json');

            h.append("env", "sbx");

            h.append("api-user", "icosandbox1");

            h.append("api-token", "58ca74560ee641a19ad19af2324f14c329eda75b");

            let form_data = new FormData();

            form_data.append('file', upload_file);

            let req = new Request(url2, {
                method: 'POST',
                headers: h,
                body: form_data
            });

            fetch(req)
                .then((response) => {
                    response.json().then(function (data) {

                        resolve(data['processId']);
                    });

                })
                .catch((err) => {
                    console.log('ERROR:', err.message);
                });

        });

    }

    async SubmitData(file_upload){

        this.processId = await this.processor_request(file_upload);

        let process_status = await this.query_process(this.processId);

        while(process_status['finished'] === false){

            await this.sleep(500);

            progress_bar(process_status['processed'], process_status['total'], 'submit_progress_bar');

            process_status = await this.query_process(this.processId);

        }
        if(process_status['interrupted'] === false){

            this.errors_mapping = await this.get_validate_results(this.processId);

            if (this.errors_mapping.length > 0){

                console.log("errores al mandar info a edna")

            } else {

                console.log("sin errores");

                $("#data_submitted_header").text("Data Sent").css("font-weight","Bold");

                // this.alert_message(document.getElementById("submit-data-errors"),
                // 'Your data was submitted to EDNA!', 'success')

            }

        }else {

            console.log("INTERRUPTED");

        }

    }

    async ValidateFormatDoc(file_upload, id){

        this.processId = await this.create_validate_id(file_upload);

        let process_status = await this.query_process(this.processId);

        while(process_status['finished'] === false){

            await this.sleep(500);

            if (id === 'file_csv') {
                progress_bar(process_status['processed'], process_status['total'], 'the_progress_bar');
            } else {

                let button = document.createElement('button');

                let text_node = document.createTextNode("Loading...");

                button.id = 'download-csv';

                button.setAttribute('class', 'btn btn-primary');

                button.appendChild(text_node);

                let span = document.createElement('span');

                span.setAttribute('class', 'spinner-border spinner-border-sm');

                span.setAttribute('role', 'status');

                span.setAttribute('aria-hidden', 'true');

                let old_button = document.getElementById("download-csv");

                old_button.replaceWith(button);

                document.getElementById('download-csv').appendChild(span);

                progress_bar(process_status['processed'], process_status['total'], 'the_progress_bar_upload');
            }

            process_status = await this.query_process(this.processId);

        }

        if(process_status['interrupted'] === false){
            
            try {

                this.errors_mapping = await this.get_validate_results(this.processId);
                
                if (this.errors_mapping.length > 0){
    
                    await this.create_csv_with_errors(this.errors_mapping, file_upload, this.processId);

                    show_errors_table(this.errors_mapping);

    
                } else {
    
                    let active = $("#breadcrumb li.active").attr('id');
    
                    if (active === 'menu-file-upload') {
    
                        active = 'file-upload';
    
                    } else {
    
                        active = 'column-mapping';
                    }
    
                    this.continue_section(active, "submit-correct-data");
    
                    let summary = `<h6 class="card-subtitle my-2 text-muted"><b>Job Name: ${this._job_name}</b></h6><br>` +
                        `<h6 class="card-subtitle my-2 text-muted"><b>Api User: ${this._api_user}</b></h6><br>` +
                        `<h6 class="card-subtitle my-2 text-muted"><b>Environment: ${this._environment}</b></h6><br>`;

                    $('#summary').append(summary);
                }
            } catch (e) {

                console.error(e);

            }

        }else {

            console.log("INTERRUPTED");

        }
    }

    async create_csv_with_errors(results, file, process_id){

        let request_headers = new Headers();

        request_headers.append('Accept', 'application/json');

        request_headers.append('X-CSRFToken', csrftoken);

        let endpoint = 'http://localhost:8000/endpoint/';

        let form_data = new FormData();

        form_data.append('csv_file', file);

        form_data.append('errors', JSON.stringify(results));

        form_data.append('process_id', process_id);

        let req = new Request(endpoint, {
            method: 'POST',
            headers: request_headers,
            body: form_data,
        });

        fetch(req)
            .then((response)=>{

                if (response.status === 200){

                    create_download_button(process_id);

                }

            })
            .catch((error)=>{

                console.log('ERROR: ', error.message);

            });

    }

    async account_setup_process(){

        let results = await this.set_credentials();

        if (!results.hasOwnProperty('form_error')) {

            this._process_id = results['process'];

            this.continue_section('account-setup', 'file-upload')

        }
    }

    async set_credentials(){

        return new Promise(resolve => {

            let request_headers = new Headers();

            request_headers.append('Accept', 'application/json');

            request_headers.append('X-CSRFToken', csrftoken);

            let endpoint = 'http://localhost:8000/save_process_setup/';

            let form_data = new FormData();

            form_data.append('name', this._job_name);

            form_data.append('api_user', this._api_user);

            form_data.append('api_token', this._api_key);

            form_data.append('environment', this._environment);

            let req = new Request(endpoint, {
                method: 'POST',
                headers: request_headers,
                body: form_data,
            });

            fetch(req)
                .then((response) => {

                    resolve(response.json());

                })
                .catch((err) => {
                    console.log('ERROR:', err.message);
                });

        });
    }


    //esto empezaba aqui pero ahora se guarda primero las credenciales

    async mapping_columns(file) {

        let result = await this.show_correct_file_in_ui(file);

        let csv_headers = await this.get_headers(file);

        csv_headers = csv_headers['headers'];

        if (csv_headers) {

            this.display_mapping_headers_selects(csv_headers)

        } else {

            this.continue_section("file-upload", "editing-data");

            let headers = result['headers'];

            let data = result['data'];

            let is_type = result['is_type'];

            this._process_id = result['process'];

            var width = document.getElementById('breadcrumb').offsetWidth;

            this.editing_table = jexcel(document.getElementById('edit_data'),{
                data:data,
                colHeaders: headers,
                defaultColWidth: '200px',
                tableWidth: `${width}px`,
                tableOverflow:true,
                lazyLoading:true,
                loadingSpin:true,
            });

            $('div#edit_data table').addClass('edit_table');

            this.editing_table.setHeight(0, 25);

            if (!is_type){

                this.editing_table.insertColumn(1, 0, 1, null);

                this.editing_table.setHeader(0, 'Transaction Type');

            }

            $('.se-pre-con').css('display', 'none');

        }

    }

    display_mapping_headers_selects(headers){

        this.continue_section("file-upload", "column-mapping");

            let select_html = `<select class="js-example-basic-single api_headers new_header"><option value=""></option></select>`;

            $.each(headers, function (i, val) {

                let tr = `<tr><th scope="row">${val}</th><th scope="row">${select_html}</th></tr>`;

                $("#headers_tables tbody").append(tr);

            });

            let headers_select = $('.api_headers');

            headers_select.select2({
                width: '30%',
                placeholder: 'Select Header'
            });

            $.fn.populate = function () {

                let $this = $(this);

                api_headers.forEach((element, index, array) => {

                    for (const [key, value] of Object.entries(element)) {

                      $this.append(`<option value="${value}">${value}</option>`);

                    }
                });
            };

            headers_select.populate();

    }

    async show_correct_file_in_ui(file){

        return new Promise(resolve => {

            let request_headers = new Headers();

            request_headers.append('Accept', 'application/json');

            request_headers.append('X-CSRFToken', csrftoken);

            let endpoint = 'http://localhost:8000/show_correct_file_in_ui/';

            let form_data = new FormData();

            form_data.append('path', file);

            form_data.append('process_id', JSON.stringify(this._process_id));

            let req = new Request(endpoint, {
                method: 'POST',
                headers: request_headers,
                body: form_data,
            });

            fetch(req)
                .then((response) => {

                    resolve(response.json());

                })
                .catch((err) => {
                    console.log('ERROR:', err.message);
                });

        });
    }

    async update_document_to_ready_to_upload(process_id, section){

         return new Promise(resolve => {

             let data;

             let headers;

             if (section === 'validate'){

                 data = this.validation_table.getData(false);

                 headers = this.validation_table.getHeaders();

             } else if (section === 'edit') {

                 data = this.editing_table.getData(false);

                headers = this.editing_table.getHeaders();

             }

             let request_headers = new Headers();

             request_headers.append('Accept', 'application/json');

             request_headers.append('X-CSRFToken', csrftoken);

             let endpoint = 'http://localhost:8000/update_document_to_ready_to_upload/';

             let form_data = new FormData();

             form_data.append('process_id', JSON.stringify(this._process_id));

             form_data.append('data', JSON.stringify(data));

             form_data.append('headers', JSON.stringify(headers));

             let req = new Request(endpoint, {
                method: 'POST',
                headers: request_headers,
                body: form_data,
            });

            fetch(req)
                .then((response) => {

                    resolve(response.json());

                })
                .catch((err) => {
                    console.log('ERROR:', err.message);
                });
         });
    }

    async get_headers(file){

        return new Promise(resolve => {

            let request_headers = new Headers();

            request_headers.append('Accept', 'application/json');

            request_headers.append('X-CSRFToken', csrftoken);

            let endpoint = 'http://localhost:8000/get_headers/';

            let form_data = new FormData();

            form_data.append('csv_file', file);

            form_data.append('process_id', JSON.stringify(this._process_id));

            let req = new Request(endpoint, {
                method: 'POST',
                headers: request_headers,
                body: form_data,
            });

            fetch(req)
                .then((response) => {

                    resolve(response.json());

                })
                .catch((err) => {
                    console.log('ERROR:', err.message);
                });

        });

    }

    async change_csv_headers_and_editing_data(file){

        let result = await this.get_new_headers(file);

        this._process_id = result['process'];

        this.continue_section("column-mapping", "editing-data");

        let headers = result['headers'];

        let data = result['data'];

        let is_type = result['is_type'];

        var width = document.getElementById('breadcrumb').offsetWidth;

        this.editing_table = jexcel(document.getElementById('edit_data'),{
                data:data,
                colHeaders: headers,
                defaultColWidth: '200px',
                tableWidth: `${width}px`,
                tableOverflow:true,
                lazyLoading:true,
                loadingSpin:true,
                // onchange: this.changed,
                // onselection: this.selectionActive,
            });

        $('div#edit_data table').addClass('edit_table');
        
        if (!is_type){

            this.editing_table.insertColumn(1, 0, 1, null);

            this.editing_table.setHeader(0, 'Transaction Type');
        }

        $('.se-pre-con').css('display', 'none');

    }

    async get_new_headers(file){

        return new Promise(resolve => {

            let new_headers = $('.new_header');

            let headers_array = [];

            for(var i = 0; i < new_headers.length; i++) {

                headers_array.push(new_headers[i].value);

            }

            let request_headers = new Headers();

            request_headers.append('Accept', 'application/json');

            request_headers.append('X-CSRFToken', csrftoken);

            let endpoint = 'http://localhost:8000/replace_headers/';

            let form_data = new FormData();

            form_data.append('path', file);

            form_data.append('process_id', JSON.stringify(this._process_id));

            form_data.append('new_headers', JSON.stringify(headers_array));

            let req = new Request(endpoint, {
                method: 'POST',
                headers: request_headers,
                body: form_data,
            });

            fetch(req)
            .then((response)=>{

                resolve(response.json())

            })
            .catch((error)=>{

                console.log('ERROR: ', error.message);

            });

        });
    }

    async init_process(data=null, headers=null, section=''){

        let process_id = await this.get_process_id(data, headers, section);

        process_id = process_id['process_id'];

        let process_status = await this.query_process(process_id);

        let validate_button = $('#validate-jexcel');

        validate_button.toggle();

        let validating_button = $('#validating_button');

        validating_button.toggle();

        while(process_status['finished'] === false){

            await this.sleep(500);

            process_status = await this.query_process(process_id);
        }

        if(process_status['interrupted'] === false){

            try {

                this.errors_mapping = await this.get_validate_results(process_id);

                if (this.errors_mapping.length > 0){

                    // await this.create_csv_with_errors(this.errors_mapping, file_upload, process_id);

                    let results = await this.show_row_with_errors(this.errors_mapping);

                    if (results.hasOwnProperty('undefined_headers')) {

                        let undefined_length = "is not a valid header";

                        if (results['undefined_headers'].length > 1)

                            undefined_length = "are not valid headers";

                        this.alert_message(document.getElementById("error_editing_data"),
                            `${results['undefined_headers'].join(', ')} ${undefined_length}`,
                            "danger");

                        validate_button.toggle();

                        validating_button.toggle();

                    } else {

                        this.continue_section("editing-data", "data-validation");

                        let revalidate_spinner = $('.se-pre-con-val');

                        revalidate_spinner.css('display', 'block');

                        let data = results['data'];

                        let style_dict = results['style_dict'];

                        let errors_per_cell = results['errors_per_cell'];

                        var width = document.getElementById('breadcrumb').offsetWidth;

                        errors_cell = results['errors_per_cell'];

                        this.validation_table = jexcel(document.getElementById('my_tests'),{
                            data: data,
                            colHeaders: results['headers'],
                            defaultColWidth: '200px',
                            tableWidth: `${width}px`,
                            tableOverflow:true,
                            lazyLoading:true,
                            loadingSpin:true,
                            style: style_dict,
                            onchange: this.changed,
                            onselection: this.selectionActive,
                        });

                        $('div#my_tests table').addClass('validation_table');

                        revalidate_spinner.toggle();

                        let error_column = results['headers'].length - 1;

                        this.validation_table.setWidth(error_column, 1000);

                        // add_comments_to_cell(errors_per_cell, this.validation_table);
                    }



                } else {

                    let update_document = await this.update_document_to_ready_to_upload(this._process_id, 'edit');

                    let active = $("#breadcrumb li.active").attr('id');

                    if (active === 'menu-file-upload') {

                        active = 'file-upload';

                    }else if(active === 'menu-editing-data'){

                        active = 'editing-data';
                    }
                    else {

                        active = 'column-mapping';
                    }

                    this.continue_section(active, "submit-correct-data");

                    let summary = `<h6 class="card-subtitle my-2 text-muted"><b>Job Name: ${this._job_name}</b></h6><br>` +
                        `<h6 class="card-subtitle my-2 text-muted"><b>Api User: ${this._api_user}</b></h6><br>` +
                        `<h6 class="card-subtitle my-2 text-muted"><b>Environment: ${this._environment}</b></h6><br>`;

                    $('#summary').append(summary);

                }
            } catch (e) {

                console.error(e);

            }

        }else {

            this.alert_message(document.getElementById("error_editing_data"),
                `Something went wrong, please try again`,
                "danger");

            console.log("INTERRUPTED");

        }

    }

    async revalidate_document() {

        let error_data_validation = $('#error_data_validation');

        error_data_validation.css('display', 'none');

        let re_validate_button = $('#re-validating-spin');

        let validate_button = $('#validate-changes');

        re_validate_button.toggle();

        validate_button.toggle();

        let results = await this.validate_changes();

        if (results.hasOwnProperty('undefined_headers')) {

            let undefined_length = "is not a valid header";

            if (results['undefined_headers'].length > 1)

                undefined_length = "are not valid headers";

            this.alert_message(document.getElementById("error_data_validation"),
                `${results['undefined_headers'].join(', ')} ${undefined_length}`,
                "danger");

            error_data_validation.css('display', 'block');

            re_validate_button.toggle();

            validate_button.toggle();

        } else {

            let process_id = results['process_id'];

            let process_status = await this.query_process(process_id);

            while (process_status['finished'] === false) {

                await this.sleep(500);

                process_status = await this.query_process(process_id);
            }

            if (process_status['interrupted'] === false) {

                try {

                    this.errors_mapping = await this.get_validate_results(process_id);

                    if (this.errors_mapping.length > 0) {

                        // await this.create_csv_with_errors(this.errors_mapping, file_upload, process_id);

                        let results = await this.show_row_with_errors(this.errors_mapping, process_id, 'file');

                        this.continue_section("editing-data", "data-validation");

                        let data = results['data'];

                        let style_dict = results['style_dict'];

                        let errors_per_cell = results['errors_per_cell'];

                        errors_cell = results['errors_per_cell'];

                        let table = $("#my_tests");

                        table.remove();

                        let div = document.createElement('div');

                        div.id = 'my_tests';

                        document.getElementById('jexcel').appendChild(div);

                        var width = document.getElementById('breadcrumb').offsetWidth;

                        this.validation_table = jexcel(document.getElementById("my_tests"), {
                            data: data,
                            colHeaders: results['headers'],
                            defaultColWidth: '200px',
                            tableWidth: `${width}px`,
                            tableOverflow: true,
                            lazyLoading: true,
                            loadingSpin: true,
                            style: style_dict,
                            onchange: this.changed,
                            onselection: this.selectionActive,
                        });

                        $('div#my_tests table').addClass('validation_table');

                        re_validate_button.toggle();

                        validate_button.toggle();

                        let error_column = results['headers'].length - 1;

                        this.validation_table.setWidth(error_column, 1000);

                        // add_comments_to_cell(errors_per_cell, this.validation_table);

                    } else {

                        let update_document = await this.update_document_to_ready_to_upload(this._process_id, 'validate');

                        let active = $("#breadcrumb li.active").attr('id');

                        if (active === 'menu-file-upload') {

                            active = 'file-upload';

                        } else if ('menu-data-validation') {

                            active = 'data-validation'

                        } else {

                            active = 'column-mapping';
                        }

                        this.continue_section(active, "submit-correct-data");

                        let summary = `<h6 class="card-subtitle my-2 text-muted"><b>Job Name: ${this._job_name}</b></h6><br>` +
                        `<h6 class="card-subtitle my-2 text-muted"><b>Api User: ${this._api_user}</b></h6><br>` +
                        `<h6 class="card-subtitle my-2 text-muted"><b>Environment: ${this._environment}</b></h6><br>`;

                        $('#summary').append(summary);

                    }
                } catch (e) {

                    console.error(e);

                }

            } else {

                console.log("INTERRUPTED");

            }
        }
    }

    async validate_changes(data, headers){

        return new Promise(resolve => {

            if (!data && !headers){

                data = this.validation_table.getData(false);

                headers = this.validation_table.getHeaders();

            }

            let request_headers = new Headers();

            request_headers.append('Accept', 'application/json');

            request_headers.append('X-CSRFToken', csrftoken);

            let endpoint = 'http://localhost:8000/validate_changes/';

            let form_data = new FormData();

            form_data.append('data', JSON.stringify(data));

            form_data.append('headers', JSON.stringify(headers));

            form_data.append('process_id', JSON.stringify(this._process_id));

            let req = new Request(endpoint, {
                method: 'POST',
                headers: request_headers,
                body: form_data,
            });

            fetch(req)
                .then((response)=>{

                    resolve(response.json())

                })
                .catch((error)=>{

                    console.log('ERROR: ', error.message);

                });

        });

    }

    async show_row_with_errors(results){

        return new Promise(resolve => {

            let request_headers = new Headers();

            request_headers.append('Accept', 'application/json');

            request_headers.append('X-CSRFToken', csrftoken);

            let endpoint = 'http://localhost:8000/show_row_with_errors/';

            let form_data = new FormData();

            form_data.append('errors', JSON.stringify(results));

            form_data.append('process_id', JSON.stringify(this._process_id));

            let req = new Request(endpoint, {
                method: 'POST',
                headers: request_headers,
                body: form_data,
            });

            fetch(req)
                .then((response)=>{

                    resolve(response.json())

                })
                .catch((error)=>{

                    console.log('ERROR: ', error.message);

                });

        });
    }

    async get_process_id(data, headers, section){

        return new Promise(resolve => {

            if (!data && !headers){

                data = this.editing_table.getData(false);

                headers = this.editing_table.getHeaders();

            }

            let request_headers = new Headers();

            request_headers.append('Accept', 'application/json');

            request_headers.append('X-CSRFToken', csrftoken);

            let endpoint = 'http://localhost:8000/get_process_id/';

            let form_data = new FormData();

            form_data.append('data', JSON.stringify(data));

            form_data.append('headers', JSON.stringify(headers));

            form_data.append('section', JSON.stringify(section));

            form_data.append('process_id', JSON.stringify(this._process_id));

            let req = new Request(endpoint, {
                method: 'POST',
                headers: request_headers,
                body: form_data,
            });

            fetch(req)
                .then((response) => {

                    resolve(response.json())

                })
                .catch((error) => {

                    console.log('ERROR: ', error.message);

                });
        });

    }

    async get_validate_results(process_id) {


        return new Promise(resolve => {

            let h = new Headers();

            h.append('Accept', 'application/json');

            let results_url = `${url3}${process_id}`;

            let req = new Request(results_url, {
                method: 'GET',
                headers: h,
            });

            fetch(req)
                .then((response) => {

                    resolve(response.json());

                })
                .catch((err) => {
                    console.log('ERROR:', err.message);
                });

        });

    }

    async validate_credentials(api_user, api_key, environment){

        return new Promise(resolve => {

            let request_headers = new Headers();

            request_headers.append('Accept', 'application/json');

            request_headers.append('X-CSRFToken', csrftoken);

            let endpoint = 'http://localhost:8000/auth/';

            let form_data = new FormData();

            form_data.append('api_user', api_user);

            form_data.append('api_key', api_key);

            form_data.append('environment', environment);

            let req = new Request(endpoint, {
                method: 'POST',
                headers: request_headers,
                body: form_data,
            });

            fetch(req)
                .then((response) => {

                    resolve(response.json());

                })
                .catch((err) => {
                    console.log('ERROR:', err.message);
                });
        });

    }

    async save_file_changes(section){

        let data;

        let headers;

        if (section === 'edit'){

            data = this.editing_table.getData(false);

            headers = this.editing_table.getHeaders();

        } else {

            data = this.validation_table.getData(false);

            headers = this.validation_table.getHeaders();
        }

        let request_headers = new Headers();

        request_headers.append('Accept', 'application/json');

        request_headers.append('X-CSRFToken', csrftoken);

        let endpoint = 'http://localhost:8000/save_progress_file/';

        let form_data = new FormData();

        form_data.append('process_id', JSON.stringify(this._process_id));

        form_data.append('data', JSON.stringify(data));

        form_data.append('headers', JSON.stringify(headers));

        form_data.append('section', JSON.stringify(section));

        let req = new Request(endpoint, {
            method: 'POST',
            headers: request_headers,
            body: form_data,
        });

        fetch(req)
            .then((response)=>{

                if (response.status === 200){

                    console.log("todo ok");

                }

            })
            .catch((error)=>{

                console.log('ERROR: ', error.message);

            });

    }

    async return_to_process(process_id){

        let result = await this.go_section_from_process_table(process_id);

        let data = result['data'];

        let headers = result['headers'];

        let step = result['step'];

        let new_headers = result['new_headers'];

        this._process_id = result['process_id'];

        this._job_name = result['job_name'];

        this._api_user = result['api_user'];

        this._environment = result['environment'];

        this.continue_section('process-table', step);

        if (step === 'column-mapping'){

            this.display_mapping_headers_selects(headers);

            new_headers = new_headers.split(", ");

            let iteration = 0;

            $( ".new_header" ).each(function() {

                let $this = $(this);

                    let value = new_headers[iteration].replace('"', "");

                    if (value === '"'){

                        $this.val("");


                    } else {

                        $this.val(value);

                    }

                    $this.select2({width: '30%',
                                   placeholder: 'Select Header'}
                                   ).trigger('change');

                    iteration ++;

            });

        } else if (step === 'editing-data'){

            let width = document.getElementById('breadcrumb').offsetWidth;

            this.editing_table = jexcel(document.getElementById('edit_data'),{
                    data:data,
                    colHeaders: headers,
                    defaultColWidth: '200px',
                    tableWidth: `${width}px`,
                    tableOverflow:true,
                    lazyLoading:true,
                    loadingSpin:true,
                });

            $('div#edit_data table').addClass('edit_table');

            $('.se-pre-con').css('display', 'none');

        } else if (step === 'submit-correct-data'){

            let summary = `<h6 class="card-subtitle my-2 text-muted"><b>Job Name: ${this._job_name}</b></h6><br>` +
                `<h6 class="card-subtitle my-2 text-muted"><b>Api User: ${this._api_user}</b></h6><br>` +
                `<h6 class="card-subtitle my-2 text-muted"><b>Environment: ${this._environment}</b></h6><br>`;

            $('#summary').append(summary);

        } else if (step === 'data-validation'){

            let get_process_id = await this.init_process(data, headers, 'validating')
        }

    }

    async go_section_from_process_table(process_id){

        return new Promise(resolve => {

            let request_headers = new Headers();

            request_headers.append('Accept', 'application/json');

            request_headers.append('X-CSRFToken', csrftoken);

            let endpoint = 'http://localhost:8000/get_draft/';

            let form_data = new FormData();

            form_data.append('process_id', JSON.stringify(process_id));

            let req = new Request(endpoint, {
                method: 'POST',
                headers: request_headers,
                body: form_data,
            });

            fetch(req)
            .then((response)=>{

                resolve(response.json())

            })
            .catch((error)=>{

                console.log('ERROR: ', error.message);

            });

        });

    }

    async save_headers_for_later(headers){

        let request_headers = new Headers();

            request_headers.append('Accept', 'application/json');

            request_headers.append('X-CSRFToken', csrftoken);

            let endpoint = 'http://localhost:8000/save_headers_for_later/';

            let form_data = new FormData();

            form_data.append('process_id', JSON.stringify(this._process_id));

            form_data.append('new_headers', JSON.stringify(headers));

            let req = new Request(endpoint, {
                method: 'POST',
                headers: request_headers,
                body: form_data,
            });

            fetch(req)

            .then((response)=>{

                if (response.status === 200){

                    console.log("ok")
                }

            })
            .catch((error)=>{

                console.log('ERROR: ', error.message);

            });

    }


    selectionActive(instance, x1, y1, x2, y2, origin,) {

        let entries = Object.entries(errors_cell);

        var cellName1 = jexcel.getColumnNameFromId([x1, y1]);

        for (const [key, value] of entries){

            if (cellName1 === key){

                $('#log').css('display', 'block');

                let element = `<p id="error_text" class="text-center">${value}</p>`;

                $('#error_text').replaceWith(element);

                break;

            } else {

                $('#log').css('display', 'none');

            }
        }

    };

    changed(instance, cell, x, y, value) {

        let entries = Object.entries(errors_cell);

        let cellName = jexcel.getColumnNameFromId([x,y]);

        for (const [key, value] of entries){

            if (cellName === key){

                $('#log').css('display', 'none');

                delete errors_cell[key];

                break;

            } else {

                $('#log').css('display', 'none');

            }
        }

    }

    alert_message(id_to_append, text, classes){

        id_to_append.innerHTML = `<div id="error-text" class="alert alert-${classes} text-center id" role="alert">${text}</div>`;

    }

     add_html_element(element, html){

         document.getElementById(element).innerHTML = `<div class="alert alert-danger text-center" role="alert">${html}</div>`;

    }

    continue_section(section, next_section) {

        let section_all = `section-${section}`;

        let nex_section = `section-${next_section}`;

        let menu_section = `menu-${section}`;

        let menu_next_section = `menu-${next_section}`;

        this.add_class(section_all,'d-none');

        this.remove_class(menu_section,'active');

        this.remove_class(nex_section,'d-none');

        this.add_class(menu_next_section,'active');

    }

    add_class(element,name_class){

      document.getElementById(element).classList.add(name_class);


    }

      remove_class(element,name_class){

      document.getElementById(element).classList.remove(name_class);


    }

    validate_csv(file) {

        let fileName = file.name;

        let fileExtension = fileName.replace(/^.*\./, '');

        return (fileExtension === "csv");

    }


}

const Poc_functions = new Poc();

//Dom events

document.getElementById('new_upload').addEventListener('click', function (e) {

    Poc_functions.continue_section('process-table', 'account-setup');


});

document.getElementById('schedule-job').addEventListener('click', function (e) {

    window.location.reload()

    // Poc_functions.continue_section('submit-correct-data', 'process-table');


});

document.getElementById('submit-account-setup').addEventListener('click', function (e) {

    Poc_functions.submit_account_setup();


});

document.getElementById('process_form').addEventListener('submit', function (e) {

    e.preventDefault();

        Poc_functions.account_setup_process();

});

document.getElementById('file_form').addEventListener('submit', function (e) {

    e.preventDefault();

    let my_file = get_file('file_csv');

    let is_file = select_file_alert('file_csv');

    if (is_file){

        Poc_functions.mapping_columns(my_file);

    }

});

document.getElementById('save-headers').addEventListener('click', function () {

    let headers = [];


    $( ".new_header" ).each(function() {

        let value = $(this).find('option:selected').text();

        headers.push(value)

    });

    Poc_functions.save_headers_for_later(headers);



});

document.getElementById('change-header').addEventListener('click', function (e) {

    let my_file = get_file('file_csv');

    let header_set = [];

    let duplicates = [];

    let empty_elements = [];


    $( ".new_header" ).each(function() {

        let value = $(this).find('option:selected').text();

        if (!value) {

            duplicates = [];

            duplicates.push('');

            empty_elements.push($(this));

        }

        let is_in_list = $.inArray(value, header_set);

        if (is_in_list === -1){

            header_set.push(value);

        }else{

            duplicates.push(value);

        }

    });

    if (duplicates.includes("")){

        Poc_functions.alert_message(document.getElementById("mapping_errors_alert"),
                `You have to select an option`,
                "danger");

        $(empty_elements).each(function() {

            $(this).siblings(".select2-container").css({'border': '1px solid #dc3545', 'border-radius': '4px'});

        });


    } else if (duplicates.length > 0){

        Poc_functions.alert_message(document.getElementById("mapping_errors_alert"),
            `Please check your options, it seems you repeated these: ${duplicates.join(', ')}`,
            "danger")

    } else{

        Poc_functions.change_csv_headers_and_editing_data(my_file);

    }


});

document.getElementById('validate-jexcel').addEventListener('click', function (e) {

    let duplicates = verify_duplicate_headers('edit_table');


    if (duplicates.length > 0 && duplicates.length < 2){

        Poc_functions.alert_message(document.getElementById("error_editing_data"),
            `Header columns must be unique, it seems you repeated this: ${duplicates.join(', ')}`,
            "danger");

    } else if(duplicates.length > 1){

        Poc_functions.alert_message(document.getElementById("error_editing_data"),
            `Headers must be unique, it seems you repeated these: ${duplicates.join(', ')}`,
            "danger");

    } else {

        Poc_functions.init_process();
    }

});

document.getElementById('validate-changes').addEventListener('click', function (e) {

    let duplicates = verify_duplicate_headers('validation_table');

    if (duplicates.length > 0 && duplicates.length < 2){

        Poc_functions.alert_message(document.getElementById("error_data_validation"),
            `Header columns must be unique, it seems you repeated this: ${duplicates.join(', ')}`,
            "danger");

        $('#error_data_validation').css('display', 'block');

    } else if(duplicates.length > 1){

        Poc_functions.alert_message(document.getElementById("error_data_validation"),
            `Headers must be unique, it seems you repeated these: ${duplicates.join(', ')}`,
            "danger");

        $('#error_data_validation').css('display', 'block');

    } else {

        Poc_functions.revalidate_document();
    }

});

document.getElementById('save-edit-file').addEventListener('click', function () {

    Poc_functions.save_file_changes('edit');

});

document.getElementById('save-validate-file').addEventListener('click', function () {

    Poc_functions.save_file_changes('validating');

});


function select_file_alert(input_id){

    let alert_element_id = 'count-errors-mapping';

    if (input_id === 'file_csv'){

        alert_element_id = 'error_file_upload_text';

    }

    let myFile = document.getElementById(input_id).files[0];

    if (myFile !== undefined){

        // Poc_functions.submit_upload_file(input_id);

        return true;

    } else {

        Poc_functions.alert_message(document.getElementById(alert_element_id),
            'Select a file!',
            'danger');

        return false;

    }

}

function create_download_button(process_id) {

    let link = document.createElement('a');

    let text_node = document.createTextNode("Download CSV");

    link.id = 'download-csv';

    link.setAttribute('href', 'http://localhost:8000/static/csv/' + process_id + '.csv');

    link.setAttribute('class', 'btn btn-danger');

    link.setAttribute('download', 'errors.csv');

    link.appendChild(text_node);

    if (document.getElementById('download-csv')) {

            let old_button = document.getElementById("download-csv");

            old_button.replaceWith(link)

        } else {

            document.getElementById("csv-container").appendChild(link);

        }

}


function progress_bar(progress, total, id) {

    let percentage = Math.round((progress * 100) / total);

    if (id === 'the_progress_bar'){

        $('#progress_container').css('display', 'block');

        $('#the_progress_bar').attr('aria-valuenow', progress).css('width', percentage +'%');

        let div = document.getElementById(id);

        div.innerHTML = Math.round(percentage) + `% data verified`;

    } else if(id === 'the_progress_bar_upload') {

        $('#progress_container_upload').css('display', 'block');

        $('#the_progress_bar_upload').attr('aria-valuenow', progress).css('width', percentage +'%');

        let div = document.getElementById(id);

        div.innerHTML = Math.round(percentage) + `% data verified`;

    } else if (id === 'submit_progress_bar') {

        $('#submit_progress_bar_container').css('display', 'block');

        $('#submit_progress_bar').attr('aria-valuenow', progress).css('width', percentage +'%');

        let div = document.getElementById(id);

        div.innerHTML = Math.round(percentage) + `% data sent`;
    }

}

$('input[type="file"]').change(function(e){

    let fileName = e.target.files[0].name;

    $(this).next('.custom-file-label').html(fileName);

});


function get_file(input_id) {

    let myFile = document.getElementById(input_id).files[0];

    return myFile

}

function add_comments_to_cell(errors_per_cell, table) {
    
    let entries = Object.entries(errors_per_cell);
    
    for (const[key, value] of entries){

        table.setComments(key, value);
    }
    
    
}

let previous;

$(document).on('select2:open', '.new_header', function (e) {
    // Store the current value on focus and on change
    previous = this.value;

});

$(document).on('change', '.new_header',function() {
    if (previous) {

        $(".js-example-basic-single option[value=" +"'" +  previous + "'" + "]").removeAttr('disabled');

    }

	let actual = this.value;

    $(".js-example-basic-single option[value=" +"'" + actual + "'" + "]").attr('disabled', 'disabled');

    $(this).siblings(".select2-container").css({'border': ''});

});


function verify_duplicate_headers(table) {

    let duplicates = [];

    let headers = [];

    $("table." + table + " thead tr td").each(function(){

        let value = $(this).text();

        let is_in_list = $.inArray(value, headers);

        if (is_in_list === -1){

            headers.push(value);

        }else{

            duplicates.push(value);

        }
    });

    return duplicates

}

$(document).on("keyup",'table.validation_table tbody tr td', function(){
    $(this).css('background', '')
});


window.onbeforeunload = e => {

return true

};

$(document).on('click', '.draft_process', function () {

    let process_id = $(this).attr('name');

    Poc_functions.return_to_process(process_id)

});
