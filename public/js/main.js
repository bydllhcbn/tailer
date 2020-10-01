let ws;
let tailerToken = Math.random().toString(36).substring(7);
let clientIp = null;
let selectedServer = null;
let errorModal = new bootstrap.Modal(find('errorModal'), {})
let serverAddModal = new bootstrap.Modal(find('serverAddModal'), {})
let errorText = find('error-text')
let serverList = find('server-list')
let logList = find('log-list')
let tailSettings = find('tail-settings')
let loadingWrapper = find('loading-wrapper');
let outputCard = find('output-card');
let loadingMessage = find('loading-message');
let autoScrollCheck = find('auto-scroll-check');
let filterQuery = find('filter-query');
let logCountLabel = find('log-count');
let tailSettingNumber = find('tail-setting-number');
let tailSettingFollow = find('tail-setting-follow');
let tailSettingMaxlines = 10000;
let tailSettingPretty = true;
let ipFilterList = find('ip-filter-list');
let keywordFilterList = find('keyword-filter-list');
let disconnectButton = find('disconnectButton');
let logoutButton = find('logoutButton');
let getServerLoadButton = find('getServerLoadButton');

let addServerName = find('server-add-name');
let addServerIp = find('server-add-ip');
let addServerUser = find('server-add-user');
let addServerPassword = find('server-add-password');
let addServerPort = find('server-add-port');
let addServerButton = find('server-add-button');
let addServerErrorText = find('server-add-error-text');
let selectServerWrapper = find('select-server-wrapper');
let fileTabList = find('file-tab-list');
let fileTabContent = find('file-tab-content');
let logArray = []

var accessLogPattern = /(\d*\.\d*\.\d*\.\d*)(?:[^\/]*)\[([^-]*)].*(GET|POST|PUT|DELETE) (.*)" (\d*) (\d*)(.*)/;
var errorLogPattern = /\[(.*\d)] (\[[^\]]*] ).*\[client (.*)] (.*)/;
var ipPattern = /(\d*\.\d*\.\d*\.\d*)/;
var greenPattern = /(success|200 )/;
var orangePattern = /(warning|warn|notice|304 |301 )/;
var redPattern = /(fatal|error|stack trace|undefined|exception|500 |400 |403 |401 |404 |503 |502 )/;
var bluePattern = /(GET|POST|PUT|DELETE|NOTICE)/;
let advancedFilterIps = {}
let advancedFilterKeywords = {}

window.onload = function () {
    loadServerList();
    logList.style.height = (window.innerHeight - 160) + 'px';

}
window.onresize = function () {
    logList.style.height = (window.innerHeight - 160) + 'px';
}

async function loadServerList() {
    serverList.innerHTML = '';
    let servers = await apiGet('/server');
    if (servers.length === 0) {
        serverList.innerHTML = '<p>click <b>+</b> to add a server</p>'
    } else {
        for (let name in servers) {
            serverList.appendChild(templateServerRow(name, servers[name]['host'], '1'))
        }
    }
}

function logout() {
    apiGet('/logout').then(function (res) {
        localStorage.removeItem('token');
        window.location = '/login.html';
    })
}

async function onServerItemClicked(elem) {
    let name = elem.getAttribute('data-name');
    tailSettings.style.display = 'none';
    outputCard.style.display = 'none';
    if (ws) ws.close();
    selectServerWrapper.style.display = 'none';
    showLoading();
    apiGet('/logFiles/' + name).then(function (res) {
        hideLoading()
        if ('error' in res) {
            selectedServer = null;
            showError("Cannot connect to server!");
            selectServerWrapper.style.display = '';
        } else {
            selectedServer = elem;
            getServerLoad();
            fileTabList.innerHTML = '';
            fileTabContent.innerText = '';
            if (res.length > 0) {
                let folders = {};
                for (let file of res) {
                    if ('name' in file && !file.name.toString().endsWith('/')) {
                        let folder = file.name.slice(0, file.name.lastIndexOf('/'))
                        if (folder in folders) {
                            folders[folder].push(file);
                        } else {
                            folders[folder] = [file];
                        }
                    }
                }
                let pathIndex = 0;
                for (let path in folders) {
                    pathIndex++;
                    fileTabList.appendChild(
                        htmlToElement(`
                        <li class="nav-item">
                            <a class="nav-link ${pathIndex === 1 ? 'active' : ''}" id="path-tab-${pathIndex}-label" 
                            data-toggle="tab" href="#path-tab-${pathIndex}" role="tab"
                               aria-controls="path-tab-${pathIndex}" aria-selected="true">${path}</a>
                        </li>
                        `)
                    );
                    fileTabContent.appendChild(
                        htmlToElement(`
                        <div class="tab-pane fade ${pathIndex === 1 ? 'show' : ''} ${pathIndex === 1 ? 'active' : ''}" id="path-tab-${pathIndex}" 
                            role="tabpanel" aria-labelledby="path-tab-${pathIndex}-label">
                       
                        </div>
                        `)
                    );
                    //let fileName = file.name.slice(file.name.lastIndexOf('/'), file.name.length)
                    for (let file of folders[path]) {
                        find('path-tab-' + pathIndex).appendChild(templateFileRow(file))
                    }
                }

                fileTabList.appendChild(
                        htmlToElement(`
                        <li class="nav-item">
                            <a class="btn  btn-outline-primary ml-2" onclick="openAddPathModal()" href="javascript:void(0)">+ add custom file</a>
                        </li>
                        `)
                    );
                getServerLoadButton.style.display = '';
                disconnectButton.style.display = '';
                logoutButton.style.display = 'none';
                tailSettings.style.display = '';
            } else {
                showError('No files found to tail!')
            }

        }


    });
}

function startTail() {
    if (ws) ws.close();
    tailSettingMaxlines = parseInt(find('tail-setting-maxlines').value) || 1000;
    tailSettingPretty = find('tail-setting-pretty').checked;
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
    find('button-select-files').style.display = '';
    find('button-stop-tail').style.display = 'none';
    ws.close();
}

function selectFilesAgain() {
    outputCard.style.display = 'none';
    tailSettings.style.display = '';
    ipFilterList.innerHTML = '';
    keywordFilterList.innerHTML = '';
    advancedFilterIps = {};
    advancedFilterKeywords = {};
    find('button-select-files').style.display = 'none';
    find('button-stop-tail').style.display = '';
}



setInterval(function () {
    ipFilterList.innerHTML = '';
    keywordFilterList.innerHTML = '';

    let ipsSorted = Object.keys(advancedFilterIps).sort(function (a, b) {
        return advancedFilterIps[b] - advancedFilterIps[a]
    })
    let keywordsSorted = Object.keys(advancedFilterKeywords).sort(function (a, b) {
        return advancedFilterKeywords[b] - advancedFilterKeywords[a]
    })
    if (clientIp) {
        ipFilterList.appendChild(ipListItem(clientIp + '<b>(your client)</b>', clientIp))
    }
    for (let ip of ipsSorted) {
        ipFilterList.appendChild(ipListItem(ip + '(' + advancedFilterIps[ip] + ')', ip))
    }
    for (let keyword of keywordsSorted) {
        keywordFilterList.appendChild(ipListItem(keyword + '(' + advancedFilterKeywords[keyword] + ')', keyword))
    }

}, 4000)

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

        if (green[0] in advancedFilterKeywords) {
            advancedFilterKeywords[green[0]]++;
        } else {
            advancedFilterKeywords[green[0]] = 1;
        }
    }

    let red = redPattern.exec(log);
    if (red) {
        log = log.replace(red[0], '<b style="color:#bc2323">' + red[0] + '</b>')
        if (red[0] in advancedFilterKeywords) {
            advancedFilterKeywords[red[0]]++;
        } else {
            advancedFilterKeywords[red[0]] = 1;
        }
    }
    let blue = bluePattern.exec(log);
    if (blue) {
        log = log.replace(blue[0], '<b style="color:#1355ba">' + blue[0] + '</b>')
        if (blue[0] in advancedFilterKeywords) {
            advancedFilterKeywords[blue[0]]++;
        } else {
            advancedFilterKeywords[blue[0]] = 1;
        }
    }
    let orange = orangePattern.exec(log);
    if (orange) {
        log = log.replace(orange[0], '<b style="color:#ba6113">' + orange[0] + '</b>')
        if (orange[0] in advancedFilterKeywords) {
            advancedFilterKeywords[orange[0]]++;
        } else {
            advancedFilterKeywords[orange[0]] = 1;
        }
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
    ws = new WebSocket("ws://" + window.location.host);
    ws.onopen = function () {
        logList.innerHTML = '';
        ws.send(JSON.stringify({
            "action": "START_TAIL",
            "params": {
                filePath: filePath,
                serverName: serverName,
                number: tailSettingNumber.value,
                token: localStorage.getItem('token')||'',
                follow: tailSettingFollow.checked
            }
        }));
        setTimeout(function () {
            outputCard.style.display = '';
            logList.scrollTop = logList.scrollHeight;
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
        addServerErrorText.innerText = 'please enter a valid server name';
        return;
    }
    if (/[a-zA-Z][a-zA-Z0-9-_]{2,32}/.exec(addServerName.value) == null) {
        addServerErrorText.innerText = 'server name cannot contain special characters';
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

function disconnectServer() {
    if (ws) ws.close();
    selectFilesAgain();
    advancedFilterIps = {};
    advancedFilterKeywords = {};
    tailSettings.style.display = 'none';
    selectServerWrapper.style.display = '';
    selectedServer = null;
    disconnectButton.style.display = 'none';
    logoutButton.style.display = '';
    getServerLoadButton.style.display = 'none';
}

function getServerLoad() {
    if (selectedServer === null) return;
    let name = selectedServer.getAttribute('data-name');
    getServerLoadButton.innerText = 'loading server info...';
    getServerLoadButton.setAttribute('disabled', true);
    apiGet('/serverLoad/' + name).then(function (res) {
        if ('error' in res) {

        } else {
            let lines = res.output.split('\n');
            console.log(lines);
            getServerLoadButton.innerText = name + ' - ' + lines[0];
            getServerLoadButton.removeAttribute('disabled');
        }
    });
}