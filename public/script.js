let ws;
let tailerToken = Math.random().toString(36).substring(7);
let clientIp = null;
let selectedServer = null;
let errorModal = new bootstrap.Modal(document.getElementById('errorModal'), {})
let serverAddModal = new bootstrap.Modal(document.getElementById('serverAddModal'), {})
let errorText = find('#error-text')
let fileList = find('#file-list')
let serverList = find('#server-list')
let logList = find('#log-list')
let tailSettings = find('#tail-settings')
let loadingWrapper = find('#loading-wrapper');
let outputCard = find('#output-card');
let filterCard = find('#filter-card');
let loadingMessage = find('#loading-message');
let autoScrollCheck = find('#auto-scroll-check');
let filterQuery = find('#filter-query');
let logCountLabel = find('#log-count');
let tailSettingNumber = find('#tail-setting-number');
let tailSettingFollow = find('#tail-setting-follow');
let tailSettingMaxlines = 10000;
let tailSettingPretty = true;
let ipFilterList = find('#ip-filter-list');

let addServerName = find('#server-add-name');
let addServerIp = find('#server-add-ip');
let addServerUser = find('#server-add-user');
let addServerPassword = find('#server-add-password');
let addServerPort = find('#server-add-port');
let addServerButton = find('#server-add-button');
let addServerErrorText = find('#server-add-error-text');

let logArray = []

var accessLogPattern = /(\d*\.\d*\.\d*\.\d*)(?:[^\/]*)\[([^-]*)].*(GET|POST|PUT|DELETE) (.*)" (\d*) (\d*)(.*)/;
var errorLogPattern = /\[(.*\d)] (\[[^\]]*] ).*\[client (.*)] (.*)/;
var ipPattern = /(\d*\.\d*\.\d*\.\d*)/;
var greenPattern = /(success|200 )/;
var orangePattern = /(warning|notice|304 |301 )/;
var redPattern = /(fatal|error|stack trace|undefined|exception|500 |400 |403 |401 |404 |503 |502 )/;
var bluePattern = /(GET|POST|PUT|DELETE|NOTICE)/;
let advancedFilterIps = {}

window.onload = function () {
    loadServerList();
    logList.style.height = (window.innerHeight-250)+'px';

}
window.onresize =function(){
    logList.style.height = (window.innerHeight-250)+'px';
}
async function loadServerList() {
    serverList.innerHTML = '';
    let servers = await apiGet('/server');
    for (let name in servers) {
        serverList.appendChild(templateServerRow(name, servers[name]['host'], '1'))
    }
    hideLoading();
}

function onServerItemClicked(elem) {
    if (elem === selectedServer) return;
    let name = elem.getAttribute('data-name');
    tailSettings.style.display = 'none';
    outputCard.style.display = 'none';
    if (ws) ws.close();
    if (selectedServer) selectedServer.classList.remove('active')
    showLoading();
    apiGet('/logFiles/' + name).then(function (res) {
        hideLoading()
        if ('error' in res) {
            selectedServer = null;
            showError("Cannot connect to server!");
        } else {
            selectedServer = elem;
            fileList.innerHTML = '';
            elem.classList.add('active')
            if (res.length > 0) {
                for (let file of res) {
                    fileList.appendChild(templateFileRow(file))
                }
                tailSettings.style.display = '';
            } else {
                showError('No files found to tail!')
            }

        }


    });
}

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
    const response = await fetch(url);
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

function startTail() {
    if (ws) ws.close();
    tailSettingMaxlines = parseInt(find('#tail-setting-maxlines').value) || 1000;
    tailSettingPretty = find('#tail-setting-pretty').checked;
    advancedFilterIps = {};
    autoScrollCheck.checked = true;
    let items = findAll('.file-row-input');
    let checkedFiles = [];
    logArray = [];
    for (let item of items) {
        if (item.checked) {
            checkedFiles.push(item.getAttribute('id'))
        }
    }
    if (checkedFiles.length === 0) {
        showError('please select at least one file')
        return;
    }
    showLoading('connecting to socket...')
    console.log(checkedFiles.join(' '))
    let name = selectedServer.getAttribute('data-name')
    startWebSocket(checkedFiles.join(' '), name)
    tailSettings.style.display = 'none';
}

function onFileCheckChange(checkbox) {
    if (checkbox.checked) {
        logList.scrollTop = logList.scrollHeight;
        checkbox.parentNode.classList.add('active')
    } else {
        checkbox.parentNode.classList.remove('active')
    }
}

function onAutoScrollCheckChange(checkbox) {
    if (checkbox.checked) {
        logList.scrollTop = logList.scrollHeight;
    }
}

function stopTail() {
    find('#button-select-files').style.display = '';
    find('#button-stop-tail').style.display = 'none';
    ws.close();
}

function selectFilesAgain() {
    outputCard.style.display = 'none';
    tailSettings.style.display = '';
    filterCard.style.display = 'none'
    ipFilterList.innerHTML = '';
    advancedFilterIps = []
    find('#button-select-files').style.display = 'none';
    find('#button-stop-tail').style.display = '';
}


function onIpListItemClicked(item) {
    filterQuery.value = item.getAttribute('data-item')
    onFilterChanged(filterQuery.value)
}

setInterval(function () {
    ipFilterList.innerHTML = '';
    let keysSorted = Object.keys(advancedFilterIps).sort(function (a, b) {
        return advancedFilterIps[b] - advancedFilterIps[a]
    })
    if (clientIp) {
        ipFilterList.appendChild(ipListItem(clientIp + '<b>(your client)</b>', clientIp))
    }
    for (let ip of keysSorted) {
        ipFilterList.appendChild(ipListItem(ip + '(' + advancedFilterIps[ip] + ')', ip))
    }
}, 2000)

function highlightKeywords(log) {
    let ipMatches = ipPattern.exec(log);
    if (ipMatches) {
        log = log.replace(ipMatches[0], '<b style="color:grey">' + ipMatches[0] + '</b>')
        if (ipMatches[0] in advancedFilterIps) {
            advancedFilterIps[ipMatches[0]]++;
        } else {
            advancedFilterIps[ipMatches[0]] = 1;
        }
    }
    let green = greenPattern.exec(log);
    if (green) {
        log = log.replace(green[0], '<b style="color:green">' + green[0] + '</b>')
    }

    let red = redPattern.exec(log);
    if (red) {
        log = log.replace(red[0], '<b style="color:#bc2323">' + red[0] + '</b>')
    }
    let blue = bluePattern.exec(log);
    if (blue) {
        log = log.replace(blue[0], '<b style="color:#1355ba">' + blue[0] + '</b>')
    }
    let orange = orangePattern.exec(log);
    if (orange) {
        log = log.replace(orange[0], '<b style="color:#ba6113">' + orange[0] + '</b>')
    }
    return log;
}

function prettyErrorLog(error) {
    return error
        .replace(/([^\\n]*)(\/[^/]*\.php)(?: on line |\()(\d*)/g, `$1<b style="color:#9C27B0">$2</b> <b style="color:#f44336">$3</b>`)
        .replace(/\\n/g, '<br>')
}

function addRawLog(rawLog) {
    let rows = rawLog.split('\n');
    for (let row of rows) {
        if (row.length < 3) continue;
        let templateRow = '';

        if (tailSettingPretty) {
            //TODO FIX PARSE
            let accessLogMatches = accessLogPattern.exec(row);
            if (accessLogMatches) {
                templateRow = `
            <small> ${(new Date(accessLogMatches[2].replace(':', ' '))).toLocaleString()} - ${accessLogMatches[1]} ${accessLogMatches[7]}</small><br>
            ${accessLogMatches[3]} ${accessLogMatches[5]} <b>${accessLogMatches[4]}</b>`
            } else {
                let errorLogMatches = errorLogPattern.exec(row);
                if (errorLogMatches) {
                    templateRow = `
            <small> ${(new Date(errorLogMatches[1])).toLocaleString()} - <b>${errorLogMatches[2]}</b></small> - ${errorLogMatches[3]}<br>
            <span style="color: black">${prettyErrorLog(errorLogMatches[4])}</span>`
                } else {
                    templateRow = row
                }
            }
            templateRow = highlightKeywords(templateRow);
        } else {
            templateRow = row
        }
        templateRow = templateLogRow(templateRow)
        let searchItem = {
            query: row.toLowerCase(),
            element: templateRow,
        };

        if (filterQuery.value !== '') {
            if (searchItem.query.indexOf(filterQuery.value.toLowerCase()) === -1) {
                templateRow.style.display = 'none';
            }
        }

        logList.insertAdjacentElement('beforeend', templateRow)


        logArray.push(searchItem)

        if (logArray.length > tailSettingMaxlines) {
            logArray.shift();
            logList.removeChild(logList.firstChild)
        }

        logCountLabel.innerHTML = logArray.length;
    }
    if (autoScrollCheck.checked) logList.scrollTop = logList.scrollHeight;
}

function stopAutoScroll() {
    autoScrollCheck.checked = false;
}

function startWebSocket(filePath, serverName) {
    ws = new WebSocket("ws://localhost:8282");
    ws.onopen = function () {
        logList.innerHTML = '';
        ws.send(JSON.stringify({
            "action": "START_TAIL",
            "params": {
                filePath: filePath,
                serverName: serverName,
                number: tailSettingNumber.value,
                follow: tailSettingFollow.checked
            }
        }));
        setTimeout(function () {
            outputCard.style.display = '';
            filterCard.style.display = ''
            hideLoading();
            apiGet('http://' + selectedServer.getAttribute('data-host') + '/?tailer_token=t_' + tailerToken + '_t')
        }, 2000)

        console.log("Message is sent...");
    };
    ws.onmessage = onMessageBegin;
    ws.onclose = function () {
        stopTail();
        console.log("Websocket closed... ");
        ws = null;
    }
}

function onMessageBegin(evt) {
    //console.log(evt.data);
    //console.log(typeof evt.data);
    let tokenMatch = /tailer_token=t_(.*)_t/.exec(evt.data);
    if (tokenMatch) {
        let ipMatches = ipPattern.exec(evt.data);
        if (tokenMatch && tokenMatch[1] === tailerToken) {
            clientIp = ipMatches[0];
            ws.onmessage = onMessageNormal;
        }
    }
    onMessageNormal(evt);
}

function onMessageNormal(evt) {
    addRawLog(evt.data);
}

let filterInputTimeout = '';

function onFilterChanged(query) {
    clearTimeout(filterInputTimeout);
    filterInputTimeout = setTimeout(function () {
        let queryL = query.toLowerCase();
        for (let i = 0; i < logArray.length; i++) {
            if (logArray[i].query.indexOf(queryL) !== -1) {
                logArray[i].element.style.display = '';
            } else {
                logArray[i].element.style.display = 'none';
            }
        }
    }, 250);
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

function downloadLogs() {
    let text = '';
    logArray.forEach(function (log) {
        text += log.query + '\n';
    })
    download('logs.txt', text);
}

function clearLogs() {
    logArray = [];
    logList.innerHTML = '';
}


function openServerAddModal() {
    serverAddModal.show();
}

function addServer() {
    addServerErrorText.innerText = '';
    if (/[a-zA-Z][a-zA-Z0-9-_]{3,32}/.exec(addServerUser.value) == null) {
        addServerErrorText.innerText = 'please enter a valid username';
        return;
    }
    if (/[a-zA-Z][a-zA-Z0-9-_]{3,32}/.exec(addServerName.value) == null) {
        addServerErrorText.innerText = 'please enter a valid server name';
        return;
    }
    if (/^\d+$/.exec(addServerPort.value) == null) {
        addServerErrorText.innerText = 'please enter a valid server port';
        return;
    }
    if (/^\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))$/.exec(addServerIp.value) == null) {
        addServerErrorText.innerText = 'please enter a valid ip address';
        return;
    }
    if (addServerPassword.value.length < 3) {
        addServerErrorText.innerHtml = 'please enter a password';
        return;
    }
    addServerButton.setAttribute('disabled', true);
    addServerButton.innerHTML = 'connecting...';
    apiPost('/server', {
        user: addServerUser.value,
        pass: addServerPassword.value,
        host: addServerIp.value,
        port: addServerPort.value,
        name: addServerName.value,
    }).then(function (res) {
        addServerButton.removeAttribute('disabled');
        addServerButton.innerHTML = 'add';
        if (res.status == 'ok') {
            serverAddModal.hide();
            loadServerList();

        } else {
            addServerErrorText.innerText = res.status;
        }
    });
}