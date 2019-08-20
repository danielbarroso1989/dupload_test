const url = "http://localhost:8080/poc-forklift/validate";

const url2 = "http://localhost:8080/poc-forklift/process/";

const url3 = 'http://localhost:8080/poc-forklift/validate/results/';



/*document.getElementById('myForm').addEventListener('submit', function (e) {

    e.preventDefault();

    let api_user = document.getElementById('api_user').value;

    let api_token = document.getElementById('api_token').value;

    let myFile = document.getElementById('file_test').files[0];

    console.log(`Api key ${api_user} and api user ${api_token}`);

    const Poc_functions = new Poc(api_token, api_user, myFile);



});*/

class Poc{

    constructor(){

        this.pruebna = {
            _api_key:undefined,

        }

        this._api_key= undefined
        this._api_user = undefined;
        this._environment = undefined;
        this._csv_file = undefined;
        this.errors_mapping = undefined;
        this.processId  = undefined

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

            let result_validate_credentials = true

            if (result_validate_credentials) {

                this._api_key = api_key;
                this._api_user = api_user;
                this._environment = environment;
                this.continue_section("account-setup", "file-upload")



            } else {

                this.error_messange(document.getElementById("error_account_setup_text"), 'Error en credenciales')

            }


        }else{
               this.error_messange(document.getElementById("error_account_setup_text"), 'Los campos son obligatorios')
        }


    }

    async submit_upload_file(){
                let myFile = document.getElementById('file_csv').files[0];

                if(this.validate_csv(myFile)){

                  await this.ValidateFormatDoc(myFile)

                    console.log(this.errors_mapping)

                    this.add_html_element('count-errors-mapping',this.errors_mapping.length)


                    this.continue_section("file-upload", "column-mapping")


                }else{
                      this.error_messange(document.getElementById("error_file_upload_text"), 'File invalid')
                }




    }

        async submit_upload_file_reload(){
                let myFile = document.getElementById('reload_file_csv').files[0];

                if(this.validate_csv(myFile)){

                  await this.ValidateFormatDoc(myFile)

                    console.log(this.errors_mapping)

                    this.add_html_element('count-errors-mapping',this.errors_mapping.length)


                }else{
                      this.error_messange(document.getElementById("error_column-mapping_tex"), 'File invalid')
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

                        console.log(data['processId'])

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



        }else {
            console.log("INTERRUPTED");

        }
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

    async validate_credentials(api_user,api_key,url_environment){

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
    error_messange(element,text){

         element.innerHTML=text;
         element.classList.add("text-danger")

    }
     add_html_element(element,html){

         document.getElementById(element).innerHTML=html

    }

    continue_section(section, next_section) {

        let section_all = `section-${section}`
        let nex_section = `section-${next_section}`
        let menu_section = `menu-${section}`
        let menu_next_section = `menu-${next_section}`

        this.add_class(section_all,'d-none')
        this.remove_class(menu_section,'active')

        this.remove_class(nex_section,'d-none')
        this.add_class(menu_next_section,'active')



    }
    add_class(element,name_class){

      document.getElementById(element).classList.add(name_class)


    }
      remove_class(element,name_class){

      document.getElementById(element).classList.remove(name_class)


    }

    validate_csv(file) {

        let fileName = file.name

        let fileExtension = fileName.replace(/^.*\./, '');

        if (fileExtension == "csv") {
            return true;
        } else {
            return false
        }


    }


}





 const Poc_functions = new Poc();


//Dom events


document.getElementById('submit-account-setup').addEventListener('click', function (e) {

    Poc_functions.submit_account_setup()


});

document.getElementById('submit-file-upload').addEventListener('click', function (e) {

    Poc_functions.submit_upload_file()


});

document.getElementById('submit-reload-upload').addEventListener('click', function (e) {

    Poc_functions.submit_upload_file_reload()


});




