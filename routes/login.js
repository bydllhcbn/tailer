let express = require('express');
let router = express.Router();
let db = require('../db');

router.post('/', function (req, res, next) {
    if (req.body.username === process.env.LOGIN_USER && req.body.password === process.env.LOGIN_PASSWORD) {
        let token = db.generateRandomString(64);
        db.addToken(token);
        res.send({
            'status': 'ok',
            'message': token
        });
    } else {
        res.send({
            'status': 'error',
            'message': 'wrong credentials'
        });
    }
});


module.exports = router;
