let ws;
let selectedServer = false;
let errorModal = new bootstrap.Modal(document.getElementById('errorModal'), {})
let errorText = find('#error-text')
let fileList = find('#file-list')
let serverList = find('#server-list')
let logList = find('#log-list')
let tailSettings = find('#tail-settings')
let loadingWrapper = find('#loading-wrapper');
let outputCard = find('#output-card');
let loadingMessage = find('#loading-message');
let autoScrollCheck = find('#auto-scroll-check');
let filterQuery = find('#filter-query');
let logCountLabel = find('#log-count');
let logArray = []
window.onload = async function () {
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

async function apiGet(url, callback) {
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
            'Content-Type': 'application/x-www-form-urlencoded',
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

    autoScrollCheck.checked = true;
    let items = findAll('.file-row-input');
    let checkedFiles = [];
    logArray = [];
    for (let item of items) {
        if (item.checked) {
            checkedFiles.push(item.getAttribute('id'))
        }
    }
    showLoading('connecting to socket...')
    console.log(checkedFiles.join(','))
    let name = selectedServer.getAttribute('data-name')
    startWebSocket('/var/log/httpd/' + checkedFiles[0], name)
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
    find('#button-select-files').style.display = 'none';
    find('#button-stop-tail').style.display = '';
}

var accessLogPattern = /(\d*\.\d*\.\d*\.\d*).*\[(.*)].*(GET|POST|OPTIONS|PUT|DELETE) (.*)(HTTP\/\d.\d)" (\d*) (\d*).* "(.*)"/;
var errorLogPattern = /\[(.*)\] \[(.*)\] \[(.*)\] \[client (.*):\d*\] (.*)/;

function addRawLog(rawLog) {
    let rows = rawLog.split('\n');
    for (let row of rows) {
        if (row.length < 3) continue;
        let accessLogMatches = accessLogPattern.exec(row);
        let templateRow = '';
        //row = row.replace(pattern, "<b>$&</b>");
        //row = row.replace(' "', "<br>");
        if (accessLogMatches) {
            templateRow = templateLogRow(`
            <small> ${accessLogMatches[2]} - <b>${accessLogMatches[1]}</b> - ${accessLogMatches[8]}</small><br>
            <b><span style="color: ${parseInt(accessLogMatches[6]) > 300 ? '#7e0400' : '#257e00'}">${accessLogMatches[6]}</span> <span style="color: #005fa5">${accessLogMatches[3]}</span> 
            <span style="color: black">${accessLogMatches[4]}</span> </b>
            
            `)
        } else {
            let errorLogMatches = errorLogPattern.exec(row);
            if (errorLogMatches) {
                templateRow = templateLogRow(`
            <small> ${errorLogMatches[1]} - <b>${errorLogMatches[4]}</b></small> - <span style="color: #005fa5">${errorLogMatches[2]}</span><br>
            <span style="color: black">${errorLogMatches[5].replace(/\\n/g, '<br>')}</span>
           
            `)
            } else {
                templateRow = templateLogRow(row)
            }
        }

        let searchItem = {
            query: row.toLowerCase(),
            element: templateRow,
        };

        if (filterQuery.value !== '') {
            if (searchItem.query.indexOf(filterQuery.value.toLowerCase()) === -1) {
                templateRow.style.display = 'none';
            }
        }
        logList.appendChild(templateRow)
        logArray.push(searchItem)
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
            "params": {filePath: filePath, serverName: serverName}
        }));
        setTimeout(function () {
            outputCard.style.display = '';
            hideLoading();
        }, 2000)

        console.log("Message is sent...");
    };
    ws.onmessage = function (evt) {
        //console.log("Message is received... ");
        //console.log(json);
        addRawLog(evt.data);
    };
    ws.onclose = function () {
        stopTail();
        console.log("Websocket closed... ");
        ws = null;
    }
}

function onFilterChanged(query) {
    //let rows = findAll('.log-item');
    //query = query.toString().toLowerCase();
    logArray.forEach((log) => {
        if (log.query.indexOf(query) !== -1) {
            log.element.style.display = '';
        } else {
            log.element.style.display = 'none';
        }
    })
}
function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}
function downloadLogs() {
    let text = '';
    logArray.forEach(function (log) {
        text += log.query+'\n';
    })
    download('logs.txt',text);
}