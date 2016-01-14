'use strict';

var http = require('http');

var expect = require('chai').expect;
var mongodb = require('mongodb');
var express = require('express');
var Promise = require('bluebird');
var uuid = require('node-uuid');
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
  var City = Entity.specify({
    name: 'City',
    attributes: {
      name: {type: 'String'},
      streets: {type: 'Number'}
    }
  });

  // testing vars
  var mongoAdapter;
  var db;
  var server;
  var cityDocuments = [];

  // setup
  before(function () {
    return Promise.all([
      openConnections().then(populateDatabase).then(orderCityDocuments),
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
    for (var i=1; i <= 150; i++) {
      var aux = {};
      aux.Entity = 'City';
      aux._id = uuid.v4();
      aux.name = 'City' + i;
      aux.streets = i <= 50 ? 3000 : 10000;
      cityDocuments.push(aux);
    }
    return db.collection('City').insertMany(cityDocuments);
  }

  function orderCityDocuments() {
    cityDocuments.sort(compare);

    function compare(a, b) {
      if (a._id < b._id) {
        return -1;
      } else if (a._id > b._id) {
        return 1;
      } else {
        return 0;
      }
    }
  }

  function startAPI() {
    var router = entityRouter({
      City: City
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
  describe('Pagination requests and responses with big database', function () {

    it('should return only the first 50 cities', function () {
      return fetchJSON('/entities/City?skip=0&limit=50')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json.results).to.have.length(50);
        });
    });

    it('should skip the first 100 cities and return only 50', function () {
      var city101 = cityDocuments[100];
      return fetchJSON('/entities/City?skip=100&limit=50')
          .then(function (res) {
            expect(res.statusCode).to.be.equals(200);
            expect(res.json.results).to.have.length(50);
            expect(res.json.results[0].id).to.be.equals(city101._id);
          });
    });

    it('should return pagination with MAX_LIMIT', function () {
      return fetchJSON('/entities/City?limit=200')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json.results).to.have.length(100);
        });
    });

    it('should use default params pagination with wrong params', function () {
      return fetchJSON('/entities/City?skip=a&limit=b')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json.results).to.have.length(30);
        });
    });

    it('should use default params pagination with wrong params', function () {
      return fetchJSON('/entities/City?skip=-1&limit=-2')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json.results).to.have.length(30);
        });
    });

  });

});
