
const JSONdb = require('simple-json-db');
let SSH = require('simple-ssh');
const {encrypt, decrypt} = require("./crypto");

/**
 *
 * @param serverName
 * @param command
 * @returns {Promise<string>}
 */
exports.run = function (serverName, command) {
    return new Promise(function (resolve, reject) {
        const db = new JSONdb('db.json');
        let servers = db.get('servers');
        if (typeof servers === 'undefined') {
            reject('not found');
        } else {
            if (serverName in servers) {
                let server = servers[serverName];
                let ssh = new SSH({
                    user: server.user,
                    host: server.host,
                    pass: decrypt(server.pass),
                    port: server.port
                });
                ssh.on('error', function (error) {
                    reject('ssh error: ' + error.toString());
                    ssh.end();
                });

                ssh.exec(command, {
                    out: function (stdout) {
                        resolve(stdout);
                        ssh.end();
                    },
                    err: function (error) {
                        reject('ssh error: ' + error.toString());
                        console.log('error: ' + error);
                    },
                    exit: function () {
                        console.log(serverName + ' ssh exited!');
                        console.log('ssh closed');
                    },

                }).start();

            } else {
                reject('name not found');
            }
        }
    });
}