
//url request
//const url = 'https://postman-echo.com/post';
const url = "http://c7bb828c.ngrok.io/poc-forklift/validate"
document.addEventListener('DOMContentLoaded', init);

function init(){
    document.getElementById('btnSubmit').addEventListener('click', validate_id);
}

function upload(ev){
 //stop the form submitting



}

 async function validate_id(ev){
    ev.preventDefault();   
    var prueba = await create_id()
    console.log(prueba)
    console.log("prueba")
    //validate format
    //validate size
    //validate null
}
function create_id(){


       return new Promise(resolve => {

            //create any headers we want
    let h = new Headers();
    h.append('Accept', 'application/json'); //what we expect back
    //bundle the files and data we want to send to the server
   //h.append('pIY_KEY', 'PIROUORIUFIOR'); //what we expect back
    let fd = new FormData();
  
    let myFile = document.getElementById('file_test').files[0];
    

    fd.append('file', myFile);
    let req = new Request(url, {
        method: 'POST',
        headers: h,
        body: fd
    });


    fetch(req)
        .then( (response)=>{
              response.json().then(function(data) {

                  document.getElementById('output').textContent = `response id ${data['processId']}`;
                 console.log(data);
                  resolve(data['processId']);
                });
          
        })
        .catch( (err) =>{
            console.log('ERROR:', err.message);
        });


    });
}


