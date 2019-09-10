const url = "http://localhost:8080/poc-forklift/validate/";

const url2 = "http://localhost:8080/poc-forklift/process/";

const url3 = "http://localhost:8080/poc-forklift/validate/results/";

const api_headers = ['type', 'man', 'dob', 'tea', 'dfp', 'dft', 'phn', 'profile', 'bln', 'bfn', 'bsn', 'bco', 'bz',
    'bc', 'memo', 'ip', 'assn', 'amt', 'dman', 'ac', 'as', 'amn', 'az', 'aco', 'asn'];

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

        this._api_key= undefined;
        this._api_user = undefined;
        this._environment = undefined;
        this._csv_file = undefined;
        this.errors_mapping = undefined;
        this.processId  = undefined;
        this.editing_table = undefined;
        this.validation_table = undefined;
        this.errors_per_cell = undefined;

        this.sleep = (milliseconds) => {
          return new Promise(resolve => setTimeout(resolve, milliseconds))
        };



    }

    async submit_account_setup() {

        let api_key = document.getElementById("api_key").value;

        let api_user = document.getElementById("api_user").value;

        let environment = document.getElementById("environment_select").value;

        let job_name = document.getElementById("job_name").value;

        if (api_key && api_user && environment) {

            // let result_validate_credentials = await this.validate_credentials(api_user, api_key, environment);

            let result_validate_credentials = true;

            // if (result_validate_credentials['code'] === 200) {
            if (result_validate_credentials) {

                this._api_key = api_key;

                this._api_user = api_user;

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

                console.log("thus: ", this.errors_mapping);
                
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
    
                    // this.alert_message(document.getElementById("submit-data-errors"),
                    // 'File Without Errors!', 'success')
    
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

    async mapping_columns(file) {
        // debugger;

        let csv_headers = await this.get_headers(file);

        csv_headers = csv_headers['headers'];

        if (csv_headers) {

            this.continue_section("file-upload", "column-mapping");

            let select_html = `<select class="js-example-basic-single api_headers new_header"></select>`;

            $.each(csv_headers, function (i, val) {

                let tr = `<tr><th scope="row">${val}</th><th scope="row">${select_html}</th></tr>`;

                $("#headers_tables tbody").append(tr);

            });

            let headers_select = $('.api_headers');

            headers_select.select2({
                width: '30%'
            });

            $.fn.populate = function () {

                let $this = $(this);

                $.each(api_headers, function (i, val) {

                    $this.append(`<option value="${val}">${val}</option>`);

                });
            };

            headers_select.populate();

        } else {

            this.continue_section("file-upload", "editing-data");

            let result = await this.show_correct_file_in_ui(file);

            let headers = result['headers'];

            let data = result['data'];

            let is_type = result['is_type'];

            let headers_length = headers.length;

            let set_table_width = $('#edit_data');

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

            this.editing_table.setHeight(0, 25);

            if (!is_type){

                this.editing_table.insertColumn(1, 0, 1, null);

                this.editing_table.setHeader(0, 'type');

            }

        }

    }

    async show_correct_file_in_ui(file){

        return new Promise(resolve => {

            let request_headers = new Headers();

            request_headers.append('Accept', 'application/json');

            request_headers.append('X-CSRFToken', csrftoken);

            let endpoint = 'http://localhost:8000/show_correct_file_in_ui/';

            let form_data = new FormData();

            form_data.append('csv_file', file);

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

        this.continue_section("column-mapping", "editing-data");

        let headers = result['headers'];

        let data = result['data'];

        let is_type = result['is_type'];

        let headers_length = headers.length;

        console.log(is_type);

        let table_id = $('#edit_data');

        var width = document.getElementById('breadcrumb').offsetWidth;

        this.editing_table = jexcel(document.getElementById('edit_data'),{
                data:data,
                colHeaders: headers,
                defaultColWidth: '200px',
                tableWidth: `${width}px`,
                tableOverflow:true,
                lazyLoading:true,
                loadingSpin:true,
                onselection: this.selectionActive,
            });
        
        if (!is_type){

            this.editing_table.insertColumn(1, 0, 1, null);

            this.editing_table.setHeader(0, 'type');
        }

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

            form_data.append('csv_file', file);

            form_data.append('new_headers', JSON.stringify(headers_array));

            let req = new Request(endpoint, {
                method: 'POST',
                headers: request_headers,
                body: form_data,
            });

            fetch(req)
            .then((response)=>{

                // resolve({"file_location": window.location.origin + "/static/csv/new_headers.csv", "process_id": response['processId']})

                resolve(response.json())

            })
            .catch((error)=>{

                console.log('ERROR: ', error.message);

            });

        });
    }

    async init_process(){

        let process_id = await this.get_process_id();

        process_id = process_id['process_id'];

        let process_status = await this.query_process(process_id);

        while(process_status['finished'] === false){

            await this.sleep(500);

            process_status = await this.query_process(process_id);
        }

        if(process_status['interrupted'] === false){

            try {

                this.errors_mapping = await this.get_validate_results(process_id);

                if (this.errors_mapping.length > 0){

                    // await this.create_csv_with_errors(this.errors_mapping, file_upload, process_id);

                    this.continue_section("editing-data", "data-validation");

                    let results = await this.show_row_with_errors(this.errors_mapping, process_id, 'file');

                    let data = results['data'];

                    let style_dict = results['style_dict'];

                    let errors_per_cell = results['errors_per_cell'];

                    let set_table_width = $('#my_tests');

                    var width = document.getElementById('breadcrumb').offsetWidth;

                    let data_length = data.length;

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
                        onselection: this.selectionActive,
                    });

                    let error_column = results['headers'].length - 1;

                    this.validation_table.setWidth(error_column, 1000);

                    add_comments_to_cell(errors_per_cell, this.validation_table);

                } else {

                    let active = $("#breadcrumb li.active").attr('id');

                    if (active === 'menu-file-upload') {

                        active = 'file-upload';

                    } else {

                        active = 'column-mapping';
                    }

                    this.continue_section(active, "submit-correct-data");

                }
            } catch (e) {

                console.error(e);

            }

        }else {

            console.log("INTERRUPTED");

        }

    }

    async revalidate_document(){

        let results = await this.validate_changes();

        let process_id = results['process_id'];

        let process_status = await this.query_process(process_id);

        while(process_status['finished'] === false){

            await this.sleep(500);

            process_status = await this.query_process(process_id);
        }

        if(process_status['interrupted'] === false){

            try {

                this.errors_mapping = await this.get_validate_results(process_id);

                if (this.errors_mapping.length > 0){

                    // await this.create_csv_with_errors(this.errors_mapping, file_upload, process_id);

                    let results = await this.show_row_with_errors(this.errors_mapping, process_id, 'file');

                    this.continue_section("editing-data", "data-validation");

                    let data = results['data'];

                    let style_dict = results['style_dict'];

                    let errors_per_cell = results['errors_per_cell'];

                    errors_cell = results['errors_per_cell'];

                    let table = $( "#my_tests" );

                    table.remove();

                    let div = document.createElement('div');

                    div.id = 'my_tests';

                    document.getElementById('jexcel').appendChild(div);

                    let set_table_width = $("#my_tests");

                    var width = document.getElementById('breadcrumb').offsetWidth;

                    this.validation_table = jexcel(document.getElementById("my_tests"),{
                        data: data,
                        colHeaders: results['headers'],
                        defaultColWidth: '200px',
                        tableWidth: `${width}px`,
                        tableOverflow:true,
                        lazyLoading:true,
                        loadingSpin:true,
                        style: style_dict,
                        onselection: this.selectionActive,
                    });

                    let error_column = results['headers'].length - 1;

                    this.validation_table.setWidth(error_column, 1000);

                    add_comments_to_cell(errors_per_cell, this.validation_table);

                } else {

                    let active = $("#breadcrumb li.active").attr('id');

                    if (active === 'menu-file-upload') {

                        active = 'file-upload';

                    }else if('menu-data-validation'){

                        active = 'data-validation'

                    } else {

                        active = 'column-mapping';
                    }

                    this.continue_section(active, "submit-correct-data");

                    // this.alert_message(document.getElementById("submit-data-errors"),
                    // 'File Without Errors!', 'success')

                }
            } catch (e) {

                console.error(e);

            }

        }else {

            console.log("INTERRUPTED");

        }
    }

    async validate_changes(){

        return new Promise(resolve => {

            // let table = $('#my_tests');

            let data = this.validation_table.getData(false);

            let headers = this.validation_table.getHeaders();

            let request_headers = new Headers();

            request_headers.append('Accept', 'application/json');

            request_headers.append('X-CSRFToken', csrftoken);

            let endpoint = 'http://localhost:8000/validate_changes/';

            let form_data = new FormData();

            form_data.append('data', JSON.stringify(data));

            form_data.append('headers', JSON.stringify(headers));

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

    async show_row_with_errors(results, process_id, file){

        return new Promise(resolve => {

            let request_headers = new Headers();

            request_headers.append('Accept', 'application/json');

            request_headers.append('X-CSRFToken', csrftoken);

            let endpoint = 'http://localhost:8000/show_row_with_errors/';

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

                    resolve(response.json())

                })
                .catch((error)=>{

                    console.log('ERROR: ', error.message);

                });

        });
    }

    async get_process_id(){

        return new Promise(resolve => {

            let data = this.editing_table.getData(false);

            let headers = this.editing_table.getHeaders();

            let request_headers = new Headers();

            request_headers.append('Accept', 'application/json');

            request_headers.append('X-CSRFToken', csrftoken);

            let endpoint = 'http://localhost:8000/get_process_id/';

            let form_data = new FormData();

            form_data.append('data', JSON.stringify(data));

            form_data.append('headers', JSON.stringify(headers));

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

                    // console.log(response.json())
                })
                .catch((err) => {
                    console.log('ERROR:', err.message);
                });
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

document.getElementById('submit-account-setup').addEventListener('click', function (e) {

    Poc_functions.submit_account_setup();


});

document.getElementById('get-headers-button').addEventListener('click', function (e) {

    let my_file = get_file('file_csv');

    let is_file = select_file_alert('file_csv');

    if (is_file){

        Poc_functions.mapping_columns(my_file);

    }


});

document.getElementById('change-header').addEventListener('click', function (e) {

    let my_file = get_file('file_csv');

    Poc_functions.change_csv_headers_and_editing_data(my_file);


});

document.getElementById('validate-jexcel').addEventListener('click', function (e) {

    Poc_functions.init_process();

});

document.getElementById('validate-changes').addEventListener('click', function (e) {

    Poc_functions.revalidate_document();

});


// document.getElementById('submit-file-upload').addEventListener('click', function (e) {
//
//     // Poc_functions.submit_upload_file('file_csv');
//     select_file_alert('file_csv');
//
// });

// document.getElementById('submit-reload-upload').addEventListener('click', function (e) {
//
//     select_file_alert('reload_file_csv');
//
// });

document.getElementById('submit-data').addEventListener('click', function () {

    let myFile;

    if (document.getElementById('reload_file_csv').files[0]) {

        myFile = document.getElementById('reload_file_csv').files[0];

    } else {

        myFile = document.getElementById('file_csv').files[0];

    }

    Poc_functions.SubmitData(myFile);

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

$('.js-example-basic-single').select2();

function add_comments_to_cell(errors_per_cell, table) {
    
    let entries = Object.entries(errors_per_cell);
    
    for (const[key, value] of entries){

        table.setComments(key, value);
    }
    
    
}
