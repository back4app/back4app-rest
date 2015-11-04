'use strict';

var chai = require('chai');
var expect = chai.expect;
var express = require('express');
var app = express();
var http = require('http');
var entityRouter = require('../../').entities.entityRouter;

describe('back4app-rest entityRouter', function () {
  var server;

  after(function () {
    server.close();
  });

  it('should create a router', function (done) {
    var router = entityRouter({
      test: {
        Entity: {name: 'test'}
      }
    }, 'DummyToken');

    app.use('/api', router);

    server = app.listen(3000, function () {
      var port = server.address().port;
      expect(port).to.equal(3000);
      yo();
    });

    function yo() {
      var req = http.request({
        host: 'localhost',
        port: '3000',
        path: '/api/test',
        method: 'GET'
      }, function (response) {
        expect(response.statusCode).to.equal(200);
        var body = '';
        response.on('data', function (d) { body += d; });
        response.on('end', function () {
          var responseObj = JSON.parse(body);
          expect(responseObj.name).to.equal('test');
          done();
        });
      });
      req.end();
    }

  });
});
