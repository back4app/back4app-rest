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
function post(postData, options) {
  options = options || {};
  return new Promise(function (resolve, reject) {
    var req = http.request({
      host: 'localhost',
      port: '3000',
      path: options.path || '/entities/Hurricane',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': 'test_access_token'
      }
    }, function (response) {
      expect(response.statusCode).to.equal(options.status || 201);
      var body = '';
      response.on('error', function (err) {
        reject(err);
      });
      response.on('data', function (d) { body += d; });
      response.on('end', function () {
        var responseObj = JSON.parse(body);
        resolve(responseObj);
      });
    });
    if (options.invalidJSON) {
      postData = 'o' + postData;
    }
    req.write(postData);
    req.end();
  });
}

// unit tests
describe('entityRouter', function () {
  // back4app Entities
  var Hurricane = Entity.specify({
    name: 'Hurricane',
    attributes: {
      name: { type: 'String', multiplicity: '1', default: undefined },
      //date: { type: 'Date', multiplicity: '1', default: undefined },
      category: { type: 'Number', multiplicity: '1', default: undefined }
    }
  });

  // testing vars
  var mongoAdapter;
  var db;
  var server;

  // setup
  before(function () {
    return Promise.all([
      openConnections(),
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

  function startAPI() {
    var router = entityRouter({
      Hurricane: Hurricane
    }, 'test_access_token');

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
  describe('POST /:entity/', function () {

    it('should create an Entity\'s instance', function () {
      var postData = JSON.stringify({
        'name': 'Wilma',
        //'date': new Date('2005'),
        'category': 5
      });

      return post(postData)
        .then(function (res) {
          expect(res).to.have.property('id');
          expect(res.name).to.equal('Wilma');
          expect(res.category).to.equal(5);
        });
    });
  });

  it('should not create an Entity\'s' +
    ' instance with wrong path', function () {
    var postData = JSON.stringify({
      'name': 'Wilma',
      //'date': new Date('2005'),
      'category': 5
    });

    return post(postData, {
      path: '/entities/wrongEntity',
      status: 404
    })
      .then(function (res) {
        expect(res).to.have.property('message');
      });
  });

  it('should not create an Entity\'s' +
    ' instance with invalid body', function () {
    var postData = JSON.stringify({
      'name': 'Wilma',
      //'date': new Date('2005'),
      'category': 5
    });

    return post(postData, {
      status: 400,
      invalidJSON: true
    })
      .then(function (res) {
        expect(res).to.have.property('message');
      });
  });

  it('should not create an Entity\'s' +
    ' instance with invalid Entity attributes', function () {
    var postData = JSON.stringify({
      'name': 0,
      //'date': new Date('2005'),
      'category': ''
    });

    return post(postData, {
      status: 400
    })
      .then(function (res) {
        expect(res).to.have.property('message');
      });
  });
});
