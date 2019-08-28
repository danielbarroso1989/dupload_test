const url = "http://localhost:8080/poc-forklift/validate/";

const url2 = "http://localhost:8080/poc-forklift/process/";

const url3 = "http://localhost:8080/poc-forklift/validate/results/";

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

        this.sleep = (milliseconds) => {
          return new Promise(resolve => setTimeout(resolve, milliseconds))
        };



    }

    async submit_account_setup() {

        let api_key = document.getElementById("api_key").value;

        let api_user = document.getElementById("api_user").value;

        let environment = document.getElementById("environment_select").value;

        if (api_key && api_user) {

            let result_validate_credentials = await this.validate_credentials(api_user, api_key, environment);

            if (result_validate_credentials['code'] === 200) {

                this._api_key = api_key;

                this._api_user = api_user;

                this.continue_section("account-setup", "file-upload");

            } else {

                this.alert_message(document.getElementById("error_account_setup_text"),
                    'Error en credenciales', 'danger')

            }

        } else {

               this.alert_message(document.getElementById("error_account_setup_text"),
                   'Los campos son obligatorios', 'danger')

        }

    }

    async submit_upload_file(id){

        let myFile = document.getElementById(id).files[0];

        if (this.validate_csv(myFile)){

            await this.ValidateFormatDoc(myFile);

            if (this.errors_mapping.length > 0){

                let errors = 'errors';

                if (this.errors_mapping.length === 1)
                    errors = 'error';

                this.alert_message(document.getElementById("count-errors-mapping"),
                    `${this.errors_mapping.length} ${errors} found. Download the csv file to check the errors!`,
                    'danger');

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

            process_status = await this.query_process(this.processId);

        }
        if(process_status['interrupted'] === false){

            this.errors_mapping = await this.get_validate_results(this.processId);

            if (this.errors_mapping.length > 0){

                console.log("errores al mandar info a edna")

            } else {

                console.log("sin errores");

                this.alert_message(document.getElementById("submit-data-errors"),
                'Your data was submitted to EDNA!', 'success')

            }

        }else {

            console.log("INTERRUPTED");

        }

    }

    async ValidateFormatDoc(file_upload){

        this.processId = await this.create_validate_id(file_upload);

        let process_status = await this.query_process(this.processId);

        while(process_status['finished'] === false){

            await this.sleep(500);

            progress_bar(process_status['processed'], process_status['total'], 'the_progress_bar');

            process_status = await this.query_process(this.processId);

        }

        if(process_status['interrupted'] === false){
            
            try {

                this.errors_mapping = await this.get_validate_results(this.processId);

                console.log("thus: ", this.errors_mapping);
                
                if (this.errors_mapping.length > 0){

                    this.continue_section("file-upload", "column-mapping");
    
                    await this.create_csv_with_errors(this.errors_mapping, file_upload, this.processId);
    
                } else {
    
                    let active = $("#breadcrumb li.active").attr('id');
    
                    if (active === 'menu-file-upload') {
    
                        active = 'file-upload';
    
                    } else {
    
                        active = 'column-mapping';
                    }
    
                    this.continue_section(active, "submit-correct-data");
    
                    this.alert_message(document.getElementById("submit-data-errors"),
                    'File Without Errors!', 'success')
    
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

document.getElementById('submit-file-upload').addEventListener('click', function (e) {

    // Poc_functions.submit_upload_file('file_csv');
    select_file_alert('file_csv')


});

document.getElementById('submit-reload-upload').addEventListener('click', function (e) {

    select_file_alert('reload_file_csv');

});

document.getElementById('submit-data').addEventListener('click', function () {

    console.log("do it")

    let myFile = document.getElementById('file_csv').files[0];

    Poc_functions.SubmitData(myFile);

});

function select_file_alert(input_id){

    let alert_element_id = 'count-errors-mapping';

    if (input_id === 'file_csv'){

        alert_element_id = 'error_file_upload_text';

    }

    let myFile = document.getElementById(input_id).files[0];

    if (myFile !== undefined){

        Poc_functions.submit_upload_file(input_id);

    } else {

        Poc_functions.alert_message(document.getElementById(alert_element_id),
            'Select a file!',
            'danger');

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

    console.log("percentage: ", percentage);

    $('.progress').css('display', 'block');

    $('#the_progress_bar').attr('aria-valuenow', progress).css('width', percentage +'%');

    let div = document.getElementById(id);

    div.innerHTML = Math.round(percentage) + `% data verified`;

}
