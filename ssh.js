
const JSONdb = require('simple-json-db');
let SSHClient = require('ssh2').Client;
const {encrypt, decrypt} = require("./crypto");
let db = require('./db');

/**
 *
 * @param serverName
 * @param command
 * @returns {Promise<string>}
 */
exports.runOnce = function (serverName, command) {
    return new Promise(function (resolve, reject) {
        let servers = db.get('servers');
        if (typeof servers === 'undefined') {
            reject('not found');
        } else {
            if (serverName in servers) {
                let server = servers[serverName];
                let ssh = new SSHClient();
                ssh.on('ready', function () {
                    ssh.exec(command, function (err, stream) {
                        if (err) {
                            reject('ssh error: ' + err.toString());
                            ssh.end();
                        }
                        stream.on('close', function (code, signal) {

                        }).on('data', function (data) {
                            resolve(data.toString());
                            ssh.end();
                        }).stderr.on('data', function (data) {
                            resolve(data.toString());
                            ssh.end();
                        });
                    });

                }).on('close', function () {
                    console.log(serverName + ' ssh exited!');
                }).on('error', function (err) {
                    reject('ssh error: ' + err.toString());
                    ssh.end();
                }).connect({
                    host: server.host,
                    username: server.user,
                    password: decrypt(server.pass),
                    port: server.port
                });
            } else {
                reject('name not found');
            }
        }
    });
}

exports.checkServer = function (user, host, pass, port) {
    return new Promise(function (resolve, reject) {

        let ssh = new SSHClient();
        ssh.on('ready', function () {
            resolve('ok');
            ssh.end();
        }).on('error', function (err) {
            reject('ssh error: ' + err.toString());
            ssh.end();
        }).connect({
            host: host,
            username: user,
            password: pass,
            port: port
        });
    });
}


/**
 *
 * @param serverName
 * @param command
 * @param onData
 * @param onExit
 * @returns {Promise<string>}
 */
exports.run = function (serverName, command, onData, onExit) {
    let ssh = new SSHClient();
    let servers = db.get('servers');
    if (typeof servers === 'undefined') {
        onExit();
    } else {
        if (serverName in servers) {
            let server = servers[serverName];
            ssh.on('ready', function () {
                ssh.exec(command, function (err, stream) {
                    stream.on('close', function (code, signal) {
                        ssh.end();
                    }).on('data', function (data) {
                        onData(data.toString());
                    }).stderr.on('data', function (data) {
                        onData(data.toString());
                    });
                });

            }).on('close', function () {
                onExit();
            }).connect({
                host: server.host,
                username: server.user,
                password: decrypt(server.pass),
                port: server.port
            });
        } else {
            onExit();
        }
    }

    return ssh;
}