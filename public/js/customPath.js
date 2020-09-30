let addPathModal = new bootstrap.Modal(find('pathAddModal'), {})
let addPathInput = find('path-add-name')
let addPathButton = find('path-add-button')
let addPathErrorText = find('path-add-error-text')

function openAddPathModal() {
    addPathErrorText.innerText = '';
    addPathInput.value = '';
    addPathModal.show();
}


function addPath() {
    addPathErrorText.innerText = '';
    if (addPathInput.value.length < 3) {
        addPathErrorText.innerText = 'please enter a file path';
        return;
    }
    addPathButton.setAttribute('disabled', 'true');
    addPathButton.innerHTML = 'adding...';
    let serverName = selectedServer.getAttribute('data-name')
    apiPost('/path', {
        path: addPathInput.value,
        server: serverName,
    }).then(function (res) {
        addPathButton.removeAttribute('disabled');
        addPathButton.innerHTML = 'add';
        if (res.status === 'ok') {
            addPathModal.hide();
            onServerItemClicked(selectedServer);

        } else {
            addPathErrorText.innerText = res.status;
        }
    }).catch(function (err) {
        addPathErrorText.innerText = 'unknown error occured';
    });
}