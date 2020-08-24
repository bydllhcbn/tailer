let express = require('express');
let path = require('path');
require('./ws.js');

let indexRouter = require('./routes/index');

let app = express();


app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(function (req, res, next) {
    console.log(req.ip,' - [',new Date(),']', req.method, req.originalUrl)
    next()
});
app.use('/', indexRouter);

module.exports = app;
