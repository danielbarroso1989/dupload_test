const url = "http://c7bb828c.ngrok.io/poc-forklift/validate";

const url2 = "http://localhost:8080/poc-forklift/process/";

document.addEventListener('DOMContentLoaded', init);

function init() {
    document.getElementById('btnSubmit').addEventListener('click', upload);
}

async function upload(ev) {

    ev.preventDefault();

    var prueba = await create_validate_id();

    console.log("prueba " + prueba);

    var process_status = await query_process(prueba);

    do {
        setTimeout(async function () {
            process_status = await query_process(prueba);
            console.log("do", process_status['finished']);
        }, 5);
    } while(process_status['finished'] == 'false');



}

function query_process(process_id) {

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

function create_validate_id() {

    return new Promise(resolve => {

        let h = new Headers();

        h.append('Accept', 'application/json');

        let fd = new FormData();

        let myFile = document.getElementById('file_test').files[0];

        fd.append('file', myFile);

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

