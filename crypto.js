const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
let key;
let iv;
fs = require('fs');

if (fs.existsSync('../.crypto_key') && fs.existsSync('../.crypto_iv')) {
    fs.readFile('../.crypto_key', null, function (err, data) {
        if (err) {
            return console.log(err);
        }
        key = data;
    });
    fs.readFile('../.crypto_iv', null, function (err, data) {
        if (err) {
            return console.log(err);
        }
        iv = data;
    });

} else {
    key = crypto.randomBytes(32);
    iv = crypto.randomBytes(16);
    fs.writeFile('../.crypto_key', key, function (err) {
        if (err) return console.log(err);
    });
    fs.writeFile('../.crypto_iv', iv, function (err) {
        if (err) return console.log(err);
    });
}

exports.encrypt = function (text) {
    let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return {iv: iv.toString('hex'), encryptedData: encrypted.toString('hex')};
}

exports.decrypt = function (text) {
    let iv = Buffer.from(text.iv, 'hex');
    let encryptedText = Buffer.from(text.encryptedData, 'hex');
    let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

