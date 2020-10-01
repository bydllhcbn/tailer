let express = require('express');
let router = express.Router();
let ssh = require('../ssh');
let db = require('../db')

router.get('/logout', function (req, res, next) {
   db.deleteToken(req.headers['x-tailer-token'])
    res.send('{}');
})

router.get('/logFiles/:name', function (req, res, next) {
    let command = 'ls -phlt -d --full-time /var/log/{*,.*} /var/log/httpd/{*,.*}';

    let customPaths = db.getPaths(req.params.name)
    for (let path of customPaths) {
        command = command + ' ' + path;
    }
    ssh.runOnce(req.params.name, command).then(result => {
        let files = [];
        result.split('\n').forEach(item => {
            let itemArray = item.split(/\s+/g);
            if (itemArray.length > 6) files.push({
                'size': itemArray[4],
                'date': itemArray[5] + ' ' + itemArray[6] + ' ' + itemArray[7],
                'name': itemArray[8],
            })
        })
        res.send(files);
    }).catch(error => {
        console.log('ssh error result: ' + error.toString())
        res.send({
            'error': error
        });
    })
})


router.get('/serverLoad/:name', function (req, res, next) {
    ssh.runOnce(req.params.name, 'w').then(result => {
        res.send({
            'output': result
        });
    }).catch(error => {
        console.log('ssh error result: ' + error.toString())
        res.send({
            'error': error
        });
    })
})
router.get('/server', function (req, res, next) {
    let servers = db.get('servers');
    if (typeof servers === 'undefined') {
        res.send([]);
    } else {
        let servers2 = servers;
        for (let i in servers2) {
            delete servers2[i]['user'];
            delete servers2[i]['pass'];
            delete servers2[i]['port'];
        }
        res.send(servers2);
    }
})

router.delete('/server', function (req, res) {
    db.deleteServer(req.body.serverName);
    res.send({});
})

router.post('/server', function (req, res, next) {

    if (!(req.body.name && req.body.user && req.body.pass && req.body.host && req.body.port)) {
        res.send({'status': 'missing params'});
        return;
    }
    ssh.checkServer(req.body.user, req.body.host, req.body.pass, req.body.port).then(() => {
        let result = db.addServer(req.body.name, req.body.user, req.body.host, req.body.pass, req.body.port)
        if (result) {
            res.send({
                'status': 'ok'
            });
        } else {
            res.send({
                'status': 'server name already exists'
            });
        }

    }).catch(() => {
        res.send({
            'status': 'cannot connect to server'
        });
    });

});


router.post('/path', function (req, res, next) {

    if (!(req.body.path && req.body.server)) {
        res.send({'status': 'missing params'});
        return;
    }
    if (/[\/][\/a-zA-Z0-9-_]{3,32}/.exec(req.body.path) == null) {
        res.send({'status': 'please enter a valid absolute file path'});
        return;
    }

    ssh.runOnce(req.body.server, 'file ' + req.body.path).then(function (result) {
        if (result && result !== '') {
            // To accept dictionary: result.toString().indexOf(': directory') !== -1
            if (result.toString().indexOf(': ASCII text') !== -1) {
                console.log(req.body.path + " added as custom path");
                db.addPath(req.body.server, req.body.path);
                res.send({
                    'status': 'ok'
                });
            } else {
                res.send({
                    'status': 'File format error: ' + result.toString()
                });
            }
        } else {
            res.send({
                'status': 'the path should point to a text file or a directory'
            });
        }
    }).catch(function (error) {
        console.log('ssh error result: ' + error.toString())
        res.send({
            'status': error
        });
    })
});

module.exports = router;
