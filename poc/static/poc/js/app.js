const url = "http://localhost:8080/poc-forklift/validate";

const url2 = "http://localhost:8080/poc-forklift/process/";

class Poc{

    constructor(){

        this.processId

        //btn events

        document.getElementById('btnSubmit').addEventListener('click', (e)=>{

            this.ValidateFormatDoc(e)
            
        });


        document.getElementById('seul').addEventListener('click', (e)=>{

            this.prueba_test()
            
        });

       
    }

    init_process(){
        
        console.log("init proceso")
 

    }

     upload_document(ev){

        ev.preventDefault();
        console.log("pruebaaaaaa")
        prueba();
      
    }

    create_validate_id(){

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


    async ValidateFormatDoc(e){

        e.preventDefault();

        this.processId = await this.create_validate_id()
        
        console.log(this.processId)
    }

    prueba_test(){
     
        console.log("huevos",this.processId)
    }
 
}



const Poc_functions = new Poc()

Poc_functions.init_process()




