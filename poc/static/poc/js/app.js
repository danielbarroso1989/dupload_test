
const url = "http://localhost:8080/poc-forklift/validate"
document.addEventListener('DOMContentLoaded', init);

function init(){
    document.getElementById('btnSubmit').addEventListener('click', upload);
}

function upload(ev){
    ev.preventDefault();    //stop the form submitting

    let validate = validate_csv();

    console.log("process " + validate)

}

async function validate_csv(){

    //create any headers we want
    let h = new Headers();

    h.append('Accept', 'application/json'); //what we expect back

    let fd = new FormData();

    let myFile = document.getElementById('file_test').files[0];
    fd.append('file', myFile);
    let req = new Request(url, {
        method: 'POST',
        headers: h,
        body: fd
    });

    let response = await fetch(req);

    let data = await response.json();

    return  data['processId'];

}
