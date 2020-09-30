nextClientID = 0;
wsClients = {};
const WebSocket = require('ws');
const wsServer = new WebSocket.Server({port: 8282});
const db = require('./db')
let ssh = require('./ssh');

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
    ssh.shell(serverName, (conn) => {
        client.send('\r\nConnected.\r\n');
        conn.shell(function (err, stream) {
            if (err)
                return client.send('\r\n*** SSH SHELL ERROR: ' + err.message + ' ***\r\n');

            client.on('message', function (data) {
                stream.write(data);
            });

            stream.on('data', function (d) {
                client.send(d.toString('binary'));
            }).on('close', function () {
                conn.end();
            });
        });
    })
}


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

    wsClient.on('message', function incoming(message) {
        let json = JSON.parse(message);
        if (!('action' in json && 'params' in json)) {
            wsClient.result("error", "MISSING PARAMS!");
            wsClient.terminate();
            return;
        }
        // Authenticate websocket client
        let token = json['params']['token'];
        if(!(token && token !=='' && db.getToken(token))){
            wsClient.result("error", "MISSING OR WRONG AUTH TOKEN!");
            wsClient.terminate();
            return;
        }

        if (json['action'] === 'GET_TCP_CLIENTS') {
            let clients = [];
            wsClient.result("TCP_CLIENTS", clients);
        }
        if (json['action'] === 'START_TAIL') {
            startTail(
                wsClient,
                json['params']['filePath'],
                json['params']['serverName'],
                json['params']['number'],
                json['params']['follow']
            )
        }

        console.log('Websocket message: %d %s', this.id, message);
    });

    wsClient.on('error', function incoming(message) {
        console.log('Websocket error: %s', message);
    });
    wsClient.on('close', function incoming(code, reason) {
        onWsDisconnected(wsClient);
    });
});


function sendAllWsClients(user, message) {
    wsServer.clients.forEach(function each(wsClient) {
        wsClient.result("MESSAGE", {
            user: user,
            message: message
        });
    });
}

function wsNoop() {
}

const wsInterval = setInterval(function ping() {
    wsServer.clients.forEach(function each(wsClient) {
        if (wsClient.isAlive === false) return wsClient.terminate();
        wsClient.isAlive = false;
        wsClient.ping(wsNoop);
    });
}, 30000);

wsServer.on('close', function close() {
    clearInterval(wsInterval);
});

function onWsDisconnected(socket) {
    if (socket.ssh) {
        socket.ssh.end();
    }
    console.log(socket.id + ' ws disconnected !');
    delete wsClients[socket.id];
}