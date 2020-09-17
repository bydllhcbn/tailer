let express = require('express');
let router = express.Router();
let simpleSSH = require('simple-ssh');
let ssh = require('../ssh');
const JSONdb = require('simple-json-db');
const {encrypt, decrypt} = require("../crypto");


router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});


router.get('/server/:name', function (req, res, next) {
    const db = new JSONdb('db.json');
    let servers = db.get('servers');
    if (typeof servers === 'undefined') {
        res.send([]);
    } else {
        if (req.params.name in servers) {
            res.send(servers[req.params.name]);
        } else {
            res.send([]);
        }
    }

})
router.get('/logFiles/:name', function (req, res, next) {
    ssh.run(req.params.name, 'ls -phlt -d --full-time /var/log/{*,.*} /var/log/httpd/{*,.*}').then(result => {
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
    ssh.run(req.params.name, 'w').then(result => {
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
    const db = new JSONdb('db.json');
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

router.delete('/server', function (req, res, next) {
    const db = new JSONdb('db.json');
    let servers = db.get('servers');
    if (typeof servers === 'undefined') {
        servers = {};
    }
    delete servers[req.body.host];
    db.set('servers', servers);
    db.sync();
    res.send(servers);
})

router.post('/server', function (req, res, next) {

    if (!(req.body.name && req.body.user && req.body.pass && req.body.host && req.body.port)) {
        res.send({'status': 'missing params'});
        return;
    }
    let ssh = new simpleSSH({
        user: req.body.user,
        host: req.body.host,
        pass: req.body.pass,
        port: req.body.port
    });
    ssh.on('error', function (err) {
        res.send({
            'status': 'cannot connect to server'
        });
        ssh.end();
    });

    ssh.on('ready', function (err) {

        const db = new JSONdb('db.json');
        let server = {
            name: req.body.name,
            user: req.body.user,
            pass: encrypt(req.body.pass),
            host: req.body.host,
            port: req.body.port
        };

        let servers = db.get('servers');
        if (typeof servers === 'undefined') {
            servers = {};
        }

        servers[req.body.name] = server;
        db.set('servers', servers);
        db.sync();
        res.send({
            'status': 'ok'
        });
        ssh.end();
    });
    ssh.start();
});

module.exports = router;
