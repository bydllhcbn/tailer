'use strict';

const db = require("./db");

exports.authorize = (req, res, next) => {
    let token = req.headers['x-tailer-token'];
    if (token && token !== '') {
        if (db.getToken(token)) {
            next();
            return;
        }
    }
    res.statusCode = 401;
    res.send({
        status: 401,
        message: 'Missing or wrong auth token'
    });
};
