
//url request
//const url = 'https://postman-echo.com/post';
const url = "http://localhost:8000/endpoint/"
document.addEventListener('DOMContentLoaded', init);

function init(){
    document.getElementById('btnSubmit').addEventListener('click', upload);
}

function upload(ev){
    ev.preventDefault();    //stop the form submitting

    //create any headers we want
    let h = new Headers();
    h.append('Accept', 'application/json'); //what we expect back
    //bundle the files and data we want to send to the server
    let fd = new FormData();
    fd.append('user-id', document.getElementById('user_id').value);
 
    let myFile = document.getElementById('file_test').files[0];
    

    fd.append('csv_file', myFile, "poc.csv");
    let req = new Request(url, {
        method: 'POST',
        headers: h,
        mode: 'no-cors',
        body: fd
    });


    fetch(req)
        .then( (response)=>{
            document.getElementById('output').textContent = "Response received from server";
        })
        .catch( (err) =>{
            console.log('ERROR:', err.message);
        });
}

function validate_file(file){
    //validate format
    //validate size
    //validate null
}