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

describe.skip('back4app-rest entityRouter', function () {
  var server;

  before(function (done) {
    server = app.listen(3000, function () {
      var port = server.address().port;
      expect(port).to.equal(3000);
      done();
    });
  });

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
  });
});


describe('back4app-rest entityRouter methods', function () {
  var server;

  before(function (done) {
    server = app.listen(3000, function () {
      var port = server.address().port;
      expect(port).to.equal(3000);
      done();
    });
  });

  after(function () {
    server.close();
  });

  it('should create a router using an Entity', function () {
    entityModule.settings.ADAPTERS.default = new MongoAdapter('mongodb://127.0.0.1:27017');
    var Hurricanes = Entity.specify({
      name: 'Hurricanes',
      attributes: {
        name: { type: 'String', multiplicity: '1', default: undefined },
        //date: { type: 'Date', multiplicity: '1', default: undefined },
        category: { type: 'Number', multiplicity: '1', default: undefined }
      }
    });
    var router = entityRouter({
      test: Hurricanes
    }, 'DummyToken');
    app.use('/entities', router);
  });

  it('should create an Entity\'s instance', function (done) {
    var postData = JSON.stringify({
      'name': 'Wilma',
      //'date': new Date('2005'),
      'category': 5
    });

    var req = http.request({
      host: 'localhost',
      port: '3000',
      path: '/entities/test',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    }, function (response) {
      expect(response.statusCode).to.equal(201);
      var body = '';
      response.on('data', function (d) { body += d; });
      response.on('end', function () {
        var responseObj = JSON.parse(body);
        expect(responseObj).to.have.property('id');
        expect(responseObj.name).to.equal('Wilma');
        expect(responseObj.category).to.equal(5);
        done();
      });
    });
    req.write(postData);
    req.end();
  });

  it('should not create an Entity\'s instance with wrong path', function (done) {
    var postData = JSON.stringify({
      'name': 'Wilma',
      //'date': new Date('2005'),
      'category': 5
    });

    var req = http.request({
      host: 'localhost',
      port: '3000',
      path: '/entities/wrongEntity',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, function (response) {
      expect(response.statusCode).to.equal(404);
      var body = '';
      response.on('data', function (d) { body += d; });
      response.on('end', function () {
        var responseObj = JSON.parse(body);
        expect(responseObj).to.have.property('message');
        done();
      });
    });
    req.write(postData);
    req.end();
  });

  it('should not create an Entity\'s instance with wrong path', function (done) {
    var postData = JSON.stringify({
      'name': 'Wilma',
      //'date': new Date('2005'),
      'category': 5
    });

    var req = http.request({
      host: 'localhost',
      port: '3000',
      path: '/entities/test',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, function (response) {
      expect(response.statusCode).to.equal(400);
      var body = '';
      response.on('data', function (d) { body += d; });
      response.on('end', function () {
        var responseObj = JSON.parse(body);
        expect(responseObj).to.have.property('message');
        done();
      });
    });
    req.write('o'+postData);
    req.end();
  });

});

