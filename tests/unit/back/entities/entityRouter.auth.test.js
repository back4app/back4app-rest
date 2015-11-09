'use strict';

var http = require('http');

var expect = require('chai').expect;
var mongodb = require('mongodb');
var express = require('express');
var Promise = require('bluebird');
var entity = require('@back4app/back4app-entity');
var Entity = entity.models.Entity;

var entityRouter = require('../../../../').entities.entityRouter;

// setup tests settings
require('../../settings');

// util functions
function fetchJSON(path, token) {
  return new Promise(function (resolve, reject) {
    var options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: path
    };
    if (typeof token !== 'undefined' && token !== null) {
      options.headers = {
        'X-Access-Token': token
      };
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
  // back4app Entities
  var User = Entity.specify({
    name: 'User',
    attributes: {
      login: {type: 'String'},
      password: {type: 'String'}
    }
  });

  // entity JSON objects
  var user1 = {Entity: 'User', id: 'c188514c-4305-4fd2-a9a0-e13a4a60a997',
    login: 'user1', password: 'pass1'};

  // testing vars
  var mongoAdapter;
  var db;
  var server;

  // setup
  before(function () {
    return Promise.all([
      openConnections().then(populateDatabase),
      startAPI()
    ]);
  });

  function openConnections() {
    // get entity mongo adapter instance
    mongoAdapter = entity.settings.ADAPTERS.default;

    // create connection to MongoDB
    var url = 'mongodb://127.0.0.1:27017/test';
    return mongodb.MongoClient.connect(url)
      .then(function (database) {
        db = database;
      });
  }

  function populateDatabase() {
    return db.collection('User').insertOne(
      {Entity: 'User', _id: 'c188514c-4305-4fd2-a9a0-e13a4a60a997',
        login: 'user1', password: 'pass1'}
    );
  }

  function startAPI() {
    var router = entityRouter({User: User}, 'test_access_token');

    var app = express();
    app.use('/entities', router);
    server = app.listen(3000);
  }

  // tear down
  after(function () {
    return Promise.all([
      stopAPI(),
      clearDatabase().then(closeConnections)
    ]);
  });

  function stopAPI() {
    server.close();
  }

  function clearDatabase() {
    return db.dropDatabase();
  }

  function closeConnections() {
    return Promise.all([
      mongoAdapter.closeConnection(),
      db.close()
    ]);
  }

  // test cases
  describe('Authentication', function () {

    it('should get entity with correct token', function () {
      var url = '/entities/User/c188514c-4305-4fd2-a9a0-e13a4a60a997/';
      var token = 'test_access_token';
      return fetchJSON(url, token)
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals(user1);
        });
    });

    it('should be Unauthorized with invalid token', function () {
      var url = '/entities/User/c188514c-4305-4fd2-a9a0-e13a4a60a997/';
      var token = 'invalid_token';
      return fetchJSON(url, token)
        .then(function (res) {
          expect(res.statusCode).to.be.equals(401);
        });
    });

    it('should be Unauthorized without token', function () {
      var url = '/entities/User/c188514c-4305-4fd2-a9a0-e13a4a60a997/';
      return fetchJSON(url)
        .then(function (res) {
          expect(res.statusCode).to.be.equals(401);
        });
    });

  });
});
