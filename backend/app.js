var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var session = require('express-session');
var mongoose = require('mongoose');
var passport = require('passport');

const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const guard = require('./routes/guard');
const stockRouter = require('./routes/stock');
const listRouter = require('./routes/list');

require('dotenv').config();

var app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie : {
    secure: false,
    maxAge: 600000
  }
}));

mongoose.connect('mongodb://127.0.0.1:27017/mse')
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('Could not connect to MongoDB', err));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', authRouter);
app.use('/api', guard);
app.use('/api/user', userRouter);
app.use('/api/stock', stockRouter);
app.use('/api/list', listRouter);
app.use('*', (req, res, next) => {
  res.sendfile(__dirname + '/public/index.html');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.send(err.message);
});

module.exports = app;
