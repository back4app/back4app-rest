'use strict';

var http = require('http');

var expect = require('chai').expect;
var express = require('express');
var Promise = require('bluebird');

var entityRouter = require('../../../../').entities.entityRouter;

// setup tests settings
require('../../settings');

// util functions
function fetchJSON(path, opts) {
  return new Promise(function (resolve, reject) {
    var options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: path,
      headers: {
        'X-Access-Token': 'test_access_token'
      }
    };

    for (var key in opts) {
      if (opts.hasOwnProperty(key)) {
        options[key] = opts[key];
      }
    }

    http.get(options, function (res) {
      var body = '';

      res.setEncoding('utf8');

      res.on('data', function (chunk) {
        body += chunk.toString();
      });

      res.on('end', function () {
        res.body = body;
        try {
          res.json = JSON.parse(body);
        } catch (e) {
          // invalid JSON, do nothing
        }
        resolve(res);
      });
    }).on('error', function (err) {
      reject(err);
    });
  });
}

// unit tests
describe('entityRouter', function () {
  // testing vars
  var server;

  // setup
  before(function () {
    startAPI();
  });

  function startAPI() {
    var router = entityRouter({}, 'test_access_token');
    var app = express();
    app.use('/entities', router);
    server = app.listen(3000);
  }

  // tear down
  after(function () {
    stopAPI();
  });

  function stopAPI() {
    server.close();
  }

  // test cases

  it('should get error on missing access token', function () {
    var options = {
      headers: {}
    };

    return fetchJSON('/entities/Person/', options)
      .then(function (res) {
        expect(res.statusCode).to.be.equals(401);
        expect(res.json).to.be.deep.equals({
          code: 112,
          error: 'Access Token Missing'
        });
      });
  });

  it('should get error on invalid access token', function () {
    var options = {
      headers: {
        'X-Access-Token': 'invalid_token'
      }
    };

    return fetchJSON('/entities/Person/', options)
      .then(function (res) {
        expect(res.statusCode).to.be.equals(401);
        expect(res.json).to.be.deep.equals({
          code: 113,
          error: 'Invalid API Credentials'
        });
      });
  });

  it('should get error on URL not found', function () {
    return fetchJSON('/entities/This/URL/Is/Invalid/')
      .then(function (res) {
        expect(res.statusCode).to.be.equals(404);
        expect(res.json).to.be.deep.equals({
          code: 121,
          error: 'URL Not Found'
        });
      });
  });

});
