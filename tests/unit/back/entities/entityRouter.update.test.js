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
function update(postData, options) {

  return new Promise(function (resolve, reject) {
    var req = http.request({
      host: 'localhost',
      port: '3000',
      path: options.path,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': 'test_access_token'
      }
    }, function (response) {
      expect(response.statusCode).to.equal(options.status || 200);
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
  var Company = Entity.specify({
    name: 'Company',
    attributes: {
      fantasyName: {type: 'String'},
      employees: {type: 'Number'}
    }
  });

  var Startup = Company.specify({
    name: 'Startup',
    attributes: {
      owner: {type: 'String'},
      investors: {type: 'Investor', multiplicity: '*'}
    }
  });

  var Investor = Entity.specify({
    name: 'Investor',
    attributes: {
      name: {type: 'String'},
      investee: {type: 'Number'}
    }
  });

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
    // mongodb documents
    var companyDoc = {
      Entity: 'Company',
      _id: '00000000-0000-4000-a000-000000000111',
      fantasyName: 'CompanyName',
      employees: 30
    };
    var monasheesDoc = {
      Entity: 'Investor',
      _id: '00000000-0000-4000-a000-000000000333',
      name: 'Monashees',
      investee: 20
    };

    var lemannDoc = {
      Entity: 'Investor',
      _id: '00000000-0000-4000-a000-000000000444',
      name: 'Lemann Foundation',
      investee: 40
    };

    var startupDoc = {
      Entity: 'Startup',
      _id: '00000000-0000-4000-a000-000000000222',
      owner: 'Joao',
      investors: [monasheesDoc._id],
      fantasyName: 'startup',
      employees: 10
    };

    return Promise.all([
      db.collection('Company').insertMany([companyDoc, startupDoc]),
      db.collection('Investor').insertMany([monasheesDoc, lemannDoc])
    ]);

  }

  function startAPI() {
    var entities = {
      Company: Company,
      Startup: Startup,
      Investor: Investor
    };
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

  describe('UPDATE /:entity/:id', function () {

    it('should update Entity', function () {
      var postData = JSON.stringify({
        employees: 40
      });
      var options = {
        path: '/entities/Company/00000000-0000-4000-a000-000000000111'
      };

      var updatedPost = {
        Entity: 'Company',
        id: '00000000-0000-4000-a000-000000000111',
        fantasyName: 'CompanyName',
        employees: 40,
        permissions: null
      };

      return update(postData, options)
        .then(function (res) {
          expect(res).to.be.deep.equals(updatedPost);
        });
    });

    it('should update Entity specialization by itself', function () {
      var postData = JSON.stringify({
        owner: 'Joao Paulo'
      });
      var options = {
        path: '/entities/Startup/00000000-0000-4000-a000-000000000222'
      };

      var updatedPost = {
        Entity: 'Startup',
        id: '00000000-0000-4000-a000-000000000222',
        owner: 'Joao Paulo',
        investors: [{
          'Entity': 'Investor',
          'id': '00000000-0000-4000-a000-000000000333'
        }],
        fantasyName: 'startup',
        employees: 10,
        permissions: null
      };

      return update(postData, options)
        .then(function (res) {
          expect(res).to.be.deep.equals(updatedPost);
        });
    });

    it('should update an Entity\'s instance that has id as an object' +
        ' when it is an association', function () {
      var updatedData = JSON.stringify({
        owner: 'Joao Paulo',
        fantasyName: 'startup',
        employees: 10,
        investors: ['00000000-0000-4000-a000-000000000333',
          '00000000-0000-4000-a000-000000000444']
      });

      var options = {
        path: '/entities/Startup/00000000-0000-4000-a000-000000000222'
      };

      var updatedPost = {
        Entity: 'Startup',
        id: '00000000-0000-4000-a000-000000000222',
        owner: 'Joao Paulo',
        investors: [
          {
            'Entity': 'Investor',
            'id': '00000000-0000-4000-a000-000000000333'
          },
          {
            'Entity': 'Investor',
            'id': '00000000-0000-4000-a000-000000000444'
          }],
        fantasyName: 'startup',
        employees: 10,
        permissions: null
      };

      return update(updatedData, options)
        .then(function (res) {
          expect(res).to.be.deep.equals(updatedPost);
        });
    });

    it('should update Entity specialization by superclass', function () {
      var postData = JSON.stringify({
        owner: 'Joao Paulo Silva'
      });
      var options = {
        path: '/entities/Company/00000000-0000-4000-a000-000000000222'
      };

      var updatedPost = {
        Entity: 'Startup',
        id: '00000000-0000-4000-a000-000000000222',
        owner: 'Joao Paulo Silva',
        investors: [
          {
            'Entity': 'Investor',
            'id': '00000000-0000-4000-a000-000000000333'
          },
          {
            'Entity': 'Investor',
            'id': '00000000-0000-4000-a000-000000000444'
          }],
        fantasyName: 'startup',
        employees: 10,
        permissions: null
      };

      return update(postData, options)
        .then(function (res) {
          expect(res).to.be.deep.equals(updatedPost);
        });
    });

    it('should return 404 code on wrong entity', function () {
      var postData = JSON.stringify({
        owner: 'Joao Paulo Silva'
      });
      var options = {
        path: '/entities/WrongEntity/00000000-0000-4000-a000-000000000222',
        status: 404
      };

      return update(postData, options)
        .then(function (res) {
          expect(res).to.be.deep.equals({
            code: 122,
            error: 'Entity Not Found'
          });
        });
    });

    it('should return 404 code on wrong id', function () {
      var postData = JSON.stringify({
        name: 'Lemann Foundation'
      });
      var options = {
        path: '/entities/Investor/00000000-0000-4000-a000-000000000555',
        status: 404
      };

      return update(postData, options)
        .then(function (res) {
          expect(res).to.be.deep.equals({
            code: 123,
            error: 'Object Not Found'
          });
        });
    });

    it('should not update instance with invalid attributes', function () {
      var postData = JSON.stringify({
        fantasyName: 0, // should be String
        employees: '' // should be Number
      });
      var options = {
        path: '/entities/Company/00000000-0000-4000-a000-000000000111',
        status: 400
      };

      return update(postData, options)
        .then(function (res) {
          expect(res).to.be.deep.equals({
            code: 103,
            error: 'Invalid Entity'
          });
        });
    });
  });
});
