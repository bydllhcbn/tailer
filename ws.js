let nextClientID = 0;
let wsClients = {};
let wsServer = null;
const db = require('./db')
let ssh = require('./ssh');
exports.connect = function (_ws) {
    wsServer = _ws;
    wsServer.on('connection', function connection(wsClient) {
        nextClientID++;
        console.log(nextClientID + ' WS connected !');
        wsClient.id = nextClientID;
        wsClients[wsClient.id] = wsClient;
        wsClient.ssh = false;
        wsClient.isAlive = true;
        wsClient.on('pong', function he() {
            wsClient.isAlive = true;
        });
        wsClient.result = function (action, params) {
            this.send(JSON.stringify(
                {"action": action, "params": params}
            ));
        }
        wsClient.addEventListener('message', incoming)
        wsClient.on('error', function incoming(message) {
            console.log('Websocket error: %s', message);
        });
        wsClient.on('close', function incoming(code, reason) {
            onWsDisconnected(wsClient);
        });
    });
    wsServer.on('close', function close() {
        clearInterval(wsInterval);
    });
    const wsInterval = setInterval(function ping() {
        wsServer.clients.forEach(function each(wsClient) {
            if (wsClient.isAlive === false) return wsClient.terminate();
            wsClient.isAlive = false;
            wsClient.ping(wsNoop);
        });
    }, 30000);
}

function incoming(message) {
    let json = JSON.parse(message.data);
    if (!('action' in json && 'params' in json)) {
        this.result("error", "MISSING PARAMS!");
        this.terminate();
        return;
    }
    // Authenticate websocket client
    let token = json['params']['token'];
    if (!(token && token !== '' && db.getToken(token))) {
        this.result("error", "MISSING OR WRONG AUTH TOKEN!");
        this.terminate();
        return;
    }
    if (json['action'] === 'START_TAIL') {
        console.log('Tail started: ' + JSON.stringify(json['params']))
        startTail(
            this,
            json['params']['filePath'],
            json['params']['serverName'],
            json['params']['number'],
            json['params']['follow']
        )
    } else if (json['action'] === 'START_SHELL') {
        this.removeEventListener('message', incoming)
        console.log('Shell started: ' + JSON.stringify(json['params']))
        startShell(
            this,
            json['params']['serverName']
        )
    }
    console.log('Websocket message: %d %s', this.id, message);
}


function startTail(client, filePath, serverName, number, follow) {

    let numberLines = parseInt(number.toString());
    if (!numberLines || numberLines < 100) numberLines = 100;
    let followParam = '';
    if (follow) {
        followParam = '-f';
    }
    client.ssh = ssh.run(
        serverName,
        'tail ' + followParam + ' --lines ' + numberLines + ' ' + filePath,
        (data) => {
            client.send(data);
        },
        () => {
            client.close();
        }
    )
}

function startShell(client, serverName) {
    ssh.shell(serverName, (sshConnection) => {
        if (!sshConnection) {
            client.send('Cannot find server: ' + serverName + '\r\n');
            client.close();
            return;
        }
        client.ssh = sshConnection;
        client.send('\r\nConnected.\r\n');
        sshConnection.shell(function (err, stream) {
            if (err)
                return client.send('\r\n*** SSH SHELL ERROR: ' + err.message + ' ***\r\n');
            client.on('message', function incoming(data) {
                stream.write(data);
            });
            stream.on('data', function (d) {
                client.send(d.toString('binary'));
            }).on('close', function () {
                sshConnection.end();
                client.close();
            });
        });
    })
}



function wsNoop() {
}


function onWsDisconnected(socket) {
    if (socket.ssh) {
        socket.ssh.end();
    }
    console.log(socket.id + ' ws disconnected !');
    delete wsClients[socket.id];
}