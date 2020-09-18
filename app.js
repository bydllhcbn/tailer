let express = require('express');
let path = require('path');
require('./ws.js');

let indexRouter = require('./routes/index');
let loginRouter = require('./routes/login');
const {authorize} = require("./auth");

let app = express();


app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(function (req, res, next) {
    console.log(req.ip,' - [',new Date(),']', req.method, req.originalUrl)
    next()
});

app.use('/login', loginRouter);
app.use('/', authorize,indexRouter);
module.exports = app;
