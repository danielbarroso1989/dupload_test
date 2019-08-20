const url = "http://localhost:8080/poc-forklift/validate";

const url2 = "http://localhost:8080/poc-forklift/process/";

const url3 = 'http://localhost:8080/poc-forklift/validate/results/';

document.getElementById('myForm').addEventListener('submit', function (e) {

    e.preventDefault();

    let api_user = document.getElementById('api_user').value;

    let api_token = document.getElementById('api_token').value;

    let myFile = document.getElementById('file_test').files[0];

    console.log(`Api key ${api_user} and api user ${api_token}`);

    const Poc_functions = new Poc(api_token, api_user, myFile);

    Poc_functions.ValidateFormatDoc();

});

class Poc{

    constructor(api_key, api_user, csv_file){

        this._api_key = api_key;
        this._api_user = api_user;
        this._csv_file = csv_file;

        this.sleep = (milliseconds) => {
          return new Promise(resolve => setTimeout(resolve, milliseconds))
        };

    }

    create_validate_id(){

        return new Promise(resolve => {

            let h = new Headers();

            h.append('Accept', 'application/json');

            let fd = new FormData();

            fd.append('file', this._csv_file);

            let req = new Request(url, {
                method: 'POST',
                headers: h,
                body: fd
            });

            fetch(req)
                .then((response) => {
                    response.json().then(function (data) {

                        document.getElementById('output').textContent = `response id ${data['processId']}`;

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

    async ValidateFormatDoc(){

        this.processId = await this.create_validate_id();

        let process_status = await this.query_process(this.processId);

        while(process_status['finished'] === false){
            await this.sleep(500);
            process_status = await this.query_process(this.processId);
        }
        if(process_status['interrupted'] === false){

            let results = await this.get_validate_results(this.processId);

            if(results.length > 0){

                await this.create_csv_with_errors(results);

            } else {

                 console.log("without errors", results);

            }

        }else {
            console.log("INTERRUPTED");

        }
    }

    async create_csv_with_errors(results){

        const items = typeof results !== 'object' ? JSON.parse(results) : results;

        const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here

        const header = Object.keys(items[0]);

        let csv = items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));

        csv.unshift(header.join(','));

        csv = csv.join('\r\n');

        let link = document.createElement('a');

        link.id = 'download-csv';

        link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(csv));

        link.setAttribute('download', 'yourfiletextgoeshere.csv');

        document.body.appendChild(link);

        document.querySelector('#download-csv').click();

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

    async validate_credentials(){

        let Url = `https://edna.identitymind.com/im/admin/jax/merchant/${this._api_user}`;

        let auth_string = `${this._api_user}:${this._api_key}`;

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

}








