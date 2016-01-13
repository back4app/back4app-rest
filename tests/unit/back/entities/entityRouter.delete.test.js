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

//util tests
describe('entityRouter', function () {
  // back4app Entities
  var Vehicle = Entity.specify({
    name: 'Vehicle',
    attributes: {
      name: {type: 'String', multiplicity: '1', default: undefined},
      category: {type: 'Number', multiplicity: '1', default: undefined}
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
    var url = 'mongodb://localhost/test';
    return mongodb.MongoClient.connect(url)
      .then(function (database) {
        db = database;
      });
  }

  function startAPI() {
    var entities = {Vehicle: Vehicle};
    var token = 'test_access_token';
    var router = entityRouter({entities: entities, accessToken: token});

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


  describe('DELETE /:entity/:id', function () {

    beforeEach(function (done) {
      //mongodb documents
      var richard = {
        _id: '00000000-0000-4000-a000-000000000000',
        Entity: 'Vehicle',
        name: 'Richard',
        category: 5
      };

      db.collection('Vehicle')
        .insertOne(richard).then(function (r) {
          expect(r.insertedCount).to.equal(1);
          done();
        });
    });

    afterEach(function () {
      return db.dropDatabase();
    });

    it('should DELETE on /:entity/', function (done) {
      var req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/entities/Vehicle/00000000-0000-4000-a000-000000000000/',
        method: 'DELETE',
        headers: {
          'X-Access-Token': 'test_access_token'
        }
      }, function (response) {
        expect(response.statusCode).to.equal(204);
        db.collection('Vehicle')
          .find({_id: '00000000-0000-4000-a000-000000000000'})
          .toArray()
          .then(function (docs) {
            expect(docs.length).to.equal(0);
            done();
          }).catch(function (err) {
            console.log(err);
          });
      });

      req.on('error', function (error) {
        console.log(error);
      });

      req.end();

    });

    it('should not delete on /:entity/ with invalid entityName on path',
      function (done) {
        var req = http.request({
          hostname: 'localhost',
          port: 3000,
          path: '/entities/wrongEntity/00000000-0000-4000-a000-000000000000/',
          method: 'DELETE',
          headers: {
            'X-Access-Token': 'test_access_token'
          }
        }, function (response) {
          expect(response.statusCode).to.equal(404);
          done();
        });

        req.on('error', function (error) {
          console.log(error);
        });

        req.end();
      });

    it('should return status code 204 on /:entity/ with invalid id on path',
      function (done) {
        var req = http.request({
          hostname: 'localhost',
          port: 3000,
          path: '/entities/Vehicle/00000000-0000-4000-a000-000000000111/',
          method: 'DELETE',
          headers: {
            'X-Access-Token': 'test_access_token'
          }
        }, function (response) {
          expect(response.statusCode).to.equal(204);
          done();
        });

        req.on('error', function (error) {
          console.log(error);
        });

        req.end();
      });
  });


});
