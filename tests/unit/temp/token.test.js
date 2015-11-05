'use strict';

var chai = require('chai');
var expect = chai.expect;
var express = require('express');
var http = require('http');
var entityRouter = require('../../../').entities.entityRouter;

describe('Token not supplied', function () {

  var server;
  var app = express();

  after(function () {
    server.close();
  });

  it('should give 403 - Token not supplied using GET', function (done) {

    var router = entityRouter({
      test: {
        Entity: {name: 'test'}
      }
    }, 'DummyToken');

    app.use('/api', router);

    server = app.listen(3000, function () {
      testEmpty();
    });

    function testEmpty() {
      var req = http.request({
        host: 'localhost',
        port: '3000',
        path: '/api/test',
        method: 'GET'
      }, function (response) {
        //console.log(response.headers);
        expect(response.statusCode).to.equal(403);
        done();
      });
      req.end();
    }

  });

});

describe('Invalid token tests', function () {

  var server;
  var app = express();

  after(function () {
    server.close();
  });

  it('should give 404 - Invalid Token using GET', function (done) {

    var router = entityRouter({
      test: {
        Entity: {name: 'test'}
      }
    }, 'DummyToken');

    app.use('/api', router);

    server = app.listen(3000, function () {
      testInvalid();
    });

    function testInvalid() {
      var req = http.request({
        host: 'localhost',
        port: '3000',
        path: '/api/test',
        method: 'GET',
        headers: { 'X-Access-Token' : 'DummyToken999' }
      }, function (response) {
        //console.log(response.headers);
        expect(response.statusCode).to.equal(404);
        done();
      });
      req.end();
    }

  });

});

describe('Valid token test', function () {

  var app = express();
  var server;

  after(function () {
    server.close();
  });

  it('should give 200 - Valid token using GET', function (done) {

    var router = entityRouter({
      test: {
        Entity: {name: 'test'}
      }
    }, 'TOKEN123');

    app.use('/api', router);

    server = app.listen(3000, function () {
      testValid();
    });

    function testValid() {
      var req = http.request({
        host: 'localhost',
        port: '3000',
        path: '/api/test',
        method: 'GET',
        headers: { 'X-Access-Token' : 'TOKEN123' }
      }, function (response) {
        expect(response.statusCode).to.equal(200);
        done();
      });
      req.end();
    }

  });

});
