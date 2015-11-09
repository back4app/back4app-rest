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
function fetchJSON(path) {
  return new Promise(function (resolve, reject) {
    var options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: path,
      headers: {
        'X-Access-Token': 'test_access_token'
      }
    };
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
  var Person = Entity.specify({
    name: 'Person',
    attributes: {
      name: {type: 'String'},
      age: {type: 'Number'},
      married: {type: 'Boolean'}
    }
  });

  var Author = Person.specify({
    name: 'Author',
    attributes: {
      readers: {type: 'Number'},
      books: {type: 'Book', multiplicity: '*'}
    }
  });

  var Book = Entity.specify({
    name: 'Book',
    attributes: {
      title: {type: 'String'},
      publishedAt: {type: 'Date'}
    }
  });

  // entity JSON objects
  var john = {Entity: 'Person', id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
    name: 'John', age: 30, married: true};
  var theo = {Entity: 'Person', id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7',
    name: 'Theo', age: 20, married: false};
  var will = {Entity: 'Person', id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f',
    name: 'Will', age: 30, married: false};


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
    return db.collection('Person').insertMany([
      {Entity: 'Person', _id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
        name: 'John', age: 30, married: true},
      {Entity: 'Person', _id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7',
        name: 'Theo', age: 20, married: false},
      {Entity: 'Person', _id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f',
        name: 'Will', age: 30, married: false}
    ]);
  }

  function startAPI() {
    var router = entityRouter({
      Person: Person,
      Author: Author,
      Book: Book
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
  describe('GET /:entity/:id/', function () {

    it('should get entity by id', function () {
      return fetchJSON('/entities/Person/0ca3c8c9-41a7-4967-a285-21f8cb4db2c0/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals(john);
        });
    });

    it('should return 404 code on wrong entity', function () {
      return fetchJSON('/entities/Wrong/0ca3c8c9-41a7-4967-a285-21f8cb4db2c0/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(404);
        });
    });

    it('should return 404 code on wrong id', function () {
      return fetchJSON('/entities/Person/00000000-0000-0000-0000-000000000000/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(404);
        });
    });

  });

  describe('GET /:entity/', function () {

    it('should find entities without query', function () {
      return fetchJSON('/entities/Person/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals({
            results: [john, theo, will]
          });
        });
    });

    it('should find entities filtered by query', function () {
      var query = JSON.stringify({
        name: {
          $in: ['John', 'Will']
        }
      });
      var url = '/entities/Person/?query=' + encodeURIComponent(query);
      return fetchJSON(url)
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals({
            results: [john, will]
          });
        });
    });

    it('should return 404 code on wrong entity', function () {
      return fetchJSON('/entities/Wrong/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(404);
        });
    });

  });
});
