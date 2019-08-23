const url = "http://localhost:8080/poc-forklift/validate";

const url2 = "http://localhost:8080/poc-forklift/process/";

const url3 = 'http://localhost:8080/poc-forklift/validate/results/';

// let url_environment = `https://edna.identitymind.com/im/admin/jax/merchant/${this._api_user}`;


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

        let api_key = document.getElementById("api_user").value;

        let api_user = document.getElementById("api_key").value;

        let environment = document.getElementById("api_key").value;

        if (api_key && api_user) {

            //let result_validate_credentials = await this.validate_credentials(api_user,api_key,environment);

            let result_validate_credentials = true;

            if (result_validate_credentials) {

                console.log("crdentials: ", result_validate_credentials);

                this._api_key = api_key;

                this._api_user = api_user;

                this._environment = environment;

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

    async submit_upload_file_reload(){

        let myFile = document.getElementById('reload_file_csv').files[0];

        if(this.validate_csv(myFile)){

            await this.ValidateFormatDoc(myFile);

            this.add_html_element('count-errors-mapping',this.errors_mapping.length)


        }else{
            this.alert_message(document.getElementById("error_column-mapping_tex"),
                'File invalid', 'danger')
        }

    }

    create_validate_id(upload_file){

        return new Promise(resolve => {

            let h = new Headers();

            h.append('Accept', 'application/json');

            let fd = new FormData();

            fd.append('file', upload_file);

            let req = new Request(url, {
                method: 'POST',
                headers: h,
                body: fd
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

    async ValidateFormatDoc(file_upload){

        this.processId = await this.create_validate_id(file_upload);

        let process_status = await this.query_process(this.processId);

        while(process_status['finished'] === false){

            await this.sleep(500);

            process_status = await this.query_process(this.processId);

        }
        if(process_status['interrupted'] === false){

            this.errors_mapping = await this.get_validate_results(this.processId);

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

            }

        }else {

            console.log("INTERRUPTED");

        }
    }

    async create_csv_with_errors(results, file, process_id){

        let request_haders = new Headers();

        request_haders.append('Accept', 'application/json');

        let endpoint = 'http://localhost:8000/endpoint/';

        let form_data = new FormData();

        form_data.append('csv_file', file);

        form_data.append('errors', JSON.stringify(results));

        form_data.append('process_id', process_id);

        let req = new Request(endpoint, {
            method: 'POST',
            headers: request_haders,
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

    async validate_credentials(api_user, api_key, url_environment){

        let Url = `${url_environment}/${api_user}`;

        let auth_string = `${api_user}:${api_key}`;

        let request_headers = new Headers();

        request_headers.set('Authorization', 'Basic' + btoa(auth_string));

        request_headers.append('Accept', 'application/json');

        let req = new Request(Url, {
            method: 'GET',
            headers: request_headers,
        });

        fetch(req)
            .then((response)=>{
                if(response.ok){
                    return response.json();
                }else{
                    throw new Error('BAD REQUEST');
                }
            }).then((jsonData)=>{
                console.log(jsonData)
        })
        .catch((err) => {
            console.log('ERROR:', err.message);
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

            document.getElementById("section-column-mapping").appendChild(link);

        }

}
