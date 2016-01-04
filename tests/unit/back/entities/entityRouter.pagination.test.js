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
  var City = Entity.specify({
    name: 'City',
    attributes: {
      name: {type: 'String'},
      streets: {type: 'Number'}
    }
  });

  var District = City.specify({
    name: 'District',
    attributes: {
      type: {type: 'Number'},
      houses: {type: 'House', multiplicity: '*'}
    }
  });

  var House = Entity.specify({
    name: 'House',
    attributes: {
      valor: {type: 'Number'},
      garden: {type: 'Boolean'}
    }
  });

  // entity JSON objects
  // City
  var sjc = {
    id: '6450bde9-dd9c-4526-9bb3-220151107666', Entity: 'City',
    name: 'Sjc', streets: 3000
  };
  var sp = {
    id: '1ce70737-340b-4144-9600-999146819377', Entity: 'City',
    name: 'Sp', streets: 10000
  };
  var rj = {
    id: 'd7ea825b-a64e-45f5-ac35-1b69fe5dde9b', Entity: 'City',
    name: 'Rj', streets: 8000
  };
  // District
  var centro = {
    id: 'fbab76bb-92c2-4aa8-bdd7-364430d0274b', Entity: 'District',
    name: 'Centro', streets:800, type: 1000, houses: null
  };
  var aquarius = {
    id: '7ef2d5e1-c87c-4441-bd93-66a650037b0a', Entity: 'District',
    name: 'Aquarius', streets:500, type: 1000, houses: null
  };
  var satelite = {
    id: '938ce1b2-fcab-4122-acd8-22eb039eb61d', Entity: 'District',
    name: 'Satelite', streets: 400, type: 1000, houses: null
  };
  // House


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
    return db.collection('City').insertMany([
      // City
      {Entity: 'City', _id: '6450bde9-dd9c-4526-9bb3-220151107666',
        name: 'Sjc', streets: 3000},
      {Entity: 'City', _id: '1ce70737-340b-4144-9600-999146819377',
        name: 'Sp', streets: 10000},
      {Entity: 'City', _id: 'd7ea825b-a64e-45f5-ac35-1b69fe5dde9b',
        name: 'Rj', streets: 8000},
      // District
      {Entity: 'District', _id: 'fbab76bb-92c2-4aa8-bdd7-364430d0274b',
        name: 'Centro', streets:800, type: 1000, houses: null},
      {Entity: 'District', _id: '07fceb36-da60-4eb4-bdad-ee9c855e626b',
        name: 'Aquarius', streets:500, type: 1000, houses: null},
      {Entity: 'District', _id: '938ce1b2-fcab-4122-acd8-22eb039eb61d',
        name: 'Satelite', streets: 400, type: 1000, houses: null}
    ]);
  }

  function startAPI() {
    var router = entityRouter({
      City: City,
      District: District,
      House: House
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
  describe('Pagination request with page and per_page', function () {

    it.only('should return only the first two cities', function () {
      return fetchJSON('/entities/City?page=0&per_page=2')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals({
            results: [sjc, sp]
          });
        });
    });
  });

});