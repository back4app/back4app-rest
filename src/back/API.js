'use strict';

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var settings = require('./settings');
var Promise = require('bluebird');

module.exports = API;

function API() {
  this.settings = settings;
  this.server = null;

  this.start = start;
  this.close = close;

  var server;
  var router;

  function start() {
    return new Promise(function (resolve) {
      router = express.Router();
      router.get('/', function (req, res) {
        res.status(200).send('api working');
      });

      registerMiddlewares();

      server = app.listen(settings.CONNECTION.port, function () {
        var port = server.address().port;
        resolve(port);
      });
    });
  }

  function close() {
    server.close();
  }

  function registerMiddlewares() {
    app.use(bodyParser.json());

    app.use('/entities', router);

    app.use(errorHandler);
  }

  function errorHandler(error) {
    console.log('Error Handler called', error);
  }

}
