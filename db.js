'use strict';
const JSONdb = require('simple-json-db');


exports.generateRandomString = (length) => {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let i;
    for (i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

exports.insert = (key, value) => {
    const db = new JSONdb('db.json');
    db.set(key, value);
    db.sync();
};

exports.get = (key) => {
    const db = new JSONdb('db.json');
    let item = db.get(key);
    if (typeof item === 'undefined') {
        return null;
    }
    return item;
};


exports.addToken = (token) => {
    const db = new JSONdb('db_auth.json');

    let tokenList = db.get('token');
    let tokenDateList = db.get('token_created_at');
    if (typeof tokenList === 'undefined') {
        tokenList = [];
    }
    if (typeof tokenDateList === 'undefined') {
        tokenDateList = [];
    }

    tokenList.push(token);
    tokenDateList.push(new Date());

    db.set('token', tokenList);
    db.set('token_created_at', tokenDateList);
    db.sync();
};


exports.getToken = (token) => {
    const db = new JSONdb('db_auth.json');
    let tokenList = db.get('token');
    let tokenDateList = db.get('token_created_at');
    if (typeof tokenList === 'undefined') {
        return null;
    }
    let index = tokenList.indexOf(token);
    if (index === -1) {
        return null;
    }

    return {
        token: tokenList[index],
        created_at: tokenDateList[index],
    }
};

exports.deleteToken = (token) => {
    const db = new JSONdb('db_auth.json');
    let tokenList = db.get('token');
    let tokenDateList = db.get('token_created_at');
    if (typeof tokenList === 'undefined') {
        return null;
    }
    let index = tokenList.indexOf(token);
    if (index === -1) {
        return null;
    }
    tokenList.splice(index, 1);
    tokenDateList.splice(index, 1);
    db.set('token', tokenList);
    db.set('token_created_at', tokenDateList);
    db.sync();

    return true;
};
