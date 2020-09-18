function timeSince(date) {
    let seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) {
        return Math.floor(interval) + " years";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + " months";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + " days";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + " hours";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + " minutes";
    }
    return Math.floor(seconds) + " seconds";
}

function showLoading(text = 'connecting') {
    loadingMessage.innerHTML = text;
    loadingWrapper.style.display = '';
}

function hideLoading() {
    loadingWrapper.style.display = 'none';
}

function showError(text = 'Unknown error') {
    errorText.innerHTML = text;
    errorModal.show();
}

async function apiGet(url) {
    const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'x-tailer-token': localStorage.getItem('token') || ''
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer'
    });
    if (response.status === 401) {
        window.location = '/login.html';
    }
    return response.json();
}

async function apiPost(url = '', data = {}) {
    const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'x-tailer-token': localStorage.getItem('token') || ''
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(data)
    });
    return response.json();
}

function find(query) {
    return document.querySelector(query);
}

function findAll(query) {
    return document.querySelectorAll(query);
}

function onClick(element, callback) {
    element.onclick = () => callback(element);
}

function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    } else {
        pom.click();
    }
}
