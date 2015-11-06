'use strict';

var chai = require('chai');
var expect = chai.expect;
var express = require('express');
var app = express();
var http = require('http');
var entityRouter = require('../../').entities.entityRouter;
var entityModule = require('@back4app/back4app-entity');
var Entity = entityModule.models.Entity;
var MongoAdapter = require('@back4app/back4app-entity-mongodb').MongoAdapter;
var mongodb = require('mongodb');
var Promise = require('bluebird');

describe('back4app-rest entityRouter', function () {
  var server;
  var db;
  var Hurricanes;

  before(function () {
    entityModule.settings.ADAPTERS.default = new
      MongoAdapter('mongodb://127.0.0.1:27017/test');
    server = app.listen(3000);
    return mongodb.MongoClient.connect('mongodb://localhost/test')
      .then(function (database) {
        db = database;
      });
  });

  after(function () {
    return Promise.all([
      db.close(),
      entityModule.settings.ADAPTERS.default.closeConnection(),
      server.close()
    ]);
  });

  beforeEach(function (done) {
    //mongodb documents
    var richardD = {
      _id: '00000000-0000-4000-a000-000000000000',
      Entity: 'Hurricanes',
      name: 'Richard',
      category: 5
    };

    db.collection('Hurricanes')
      .insertOne(richardD).then(function (r) {
        expect(r.insertedCount).to.equal(1);
        done();
      });
  });

  afterEach(function () {
    return db.dropDatabase();
  });

  it('should create a router using an Entity', function () {
    Hurricanes = Entity.specify({
      name: 'Hurricanes',
      attributes: {
        name: { type: 'String', multiplicity: '1', default: undefined },
        //date: { type: 'Date', multiplicity: '1', default: undefined },
        category: { type: 'Number', multiplicity: '1', default: undefined }
      }
    });

    var router = entityRouter({
      Hurricanes: Hurricanes
    }, 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

    app.use('/entities', router);
  });

  it('should DELETE on /:entity/', function (done) {
    var req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/entities/Hurricanes/00000000-0000-4000-a000-000000000000/',
      method: 'DELETE',
      headers: {
        'X-Access-Token': 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
      }
    }, function (response) {
      expect(response.statusCode).to.equal(204);
      db.collection('Hurricanes')
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
      console.log('Erro aqui' + error);
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
          'X-Access-Token': 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
        }
      }, function (response) {
        expect(response.statusCode).to.equal(400);
        done();
      });

      req.on('error', function (error) {
        console.log(error);
      });

      req.end();
    });

  it('should not return status code error on /:entity/ with invalid id on path',
    function (done) {
    var req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/entities/Hurricanes/00000000-0000-4000-a000-000000000111/',
      method: 'DELETE',
      headers: {
        'X-Access-Token': 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
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
