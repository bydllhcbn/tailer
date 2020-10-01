let inputUser = find('inputUser');
let inputPassword = find('inputPassword');

async function login()  {
    const response = await fetch('/login', {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify({
            'username':inputUser.value,
            'password':inputPassword.value,
        })
    });
    let data = await response.json();
    if(data['status']==='ok'){
        localStorage.setItem('token',data['message']);
        window.location = '/';
    }else{
        alert(data['message']);
    }

}