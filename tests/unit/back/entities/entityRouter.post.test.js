'use strict';

var http = require('http');

var expect = require('chai').expect;
var mongodb = require('mongodb');
var express = require('express');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcryptjs'));
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

  var CityHurricane = Entity.specify({
    name: 'CityHurricane',
    attributes: {
      hurricane: { type: 'Hurricane', multiplicity: '1', default: undefined },
      area: { type: 'String', multiplicity: '1', default: undefined },
      deaths: { type: 'Number', multiplicity: '1', default: undefined }
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
    var entities = {
      Hurricane: Hurricane,
      CityHurricane: CityHurricane
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

    it('should return error on invalid JSON body', function () {
      var postData = 'invalid json';
      return post(postData, {status: 400})
        .then(function (res) {
          expect(res).to.be.deep.equals({
            code: 102,
            error: 'Invalid JSON'
          });
        });
    });

    it('should not create an instance with invalid attributes', function () {
      var postData = JSON.stringify({
        'name': 0, // should be String
        'category': '' // should be Number
      });

      return post(postData, {status: 400})
        .then(function (res) {
          expect(res).to.be.deep.equals({
            code: 103,
            error: 'Invalid Entity'
          });
        });
    });

    it('should not create an instance with wrong entity name', function () {
      var postData = JSON.stringify({
        'name': 'Wilma',
        'category': 5
      });

      return post(postData, {
        path: '/entities/wrongEntity',
        status: 404
      })
        .then(function (res) {
          expect(res).to.be.deep.equals({
            code: 122,
            error: 'Entity Not Found'
          });
        });
    });

    it('should create User with hashed password', function () {
      var postData = JSON.stringify({
        username: 'user1',
        password: 'pass1'
      });

      return post(postData, {path: '/entities/User/'})
        .then(function (res) {
          expect(res).to.have.property('id');
          expect(res.username).to.be.equals('user1');

          // password must be stored as hash
          var hash = res.password;
          expect(hash).to.not.be.equals('pass1');

          // promisified with bluebird
          return bcrypt.compareAsync('pass1', hash);
        })
        .then(function (result) {
          // check password matches hash
          expect(result).to.be.equals(true);
        });
    });

    it('should create User with correct permissions', function () {
      var postData = JSON.stringify({
        username: 'user2',
        password: 'pass1'
      });

      return post(postData, {path: '/entities/User/'})
        .then(function (res) {
          // check permissions
          var permissions = {};
          permissions[res.id] = {read: true, write: true};
          expect(res.permissions).to.be.deep.equals(permissions);
        });
    });

    it('should not create duplicated User (username)', function () {
      var postData = JSON.stringify({
        username: 'user_dup',
        password: 'pass'
      });

      return post(postData, {path: '/entities/User/'})
        .then(function () {
          return post(postData, {
            path: '/entities/User/',
            status: 400
          });
        })
        .then(function (res) {
          var error = {
            code: 104,
            error: 'Duplicated Entry'
          };
          expect(res).to.be.deep.equals(error);
        });
    });

    it('should not create duplicated User (email)', function () {
      var postData = JSON.stringify({
        username: 'user_dup1',
        email: 'user_dup@email.com',
        password: 'pass'
      });

      return post(postData, {path: '/entities/User/'})
        .then(function () {
          postData = JSON.stringify({
            username: 'user_dup2',
            email: 'user_dup@email.com',
            password: 'pass'
          });
          return post(postData, {
            path: '/entities/User/',
            status: 400
          });
        })
        .then(function (res) {
          var error = {
            code: 104,
            error: 'Duplicated Entry'
          };
          expect(res).to.be.deep.equals(error);
        });
    });

  });

  it('should create an Entity\'s instance', function () {
    var postData = JSON.stringify({
      'name': 'Katrina',
      'category': 3
    });

    var hurricaneID;

    return post(postData)
      .then(function (res) {
        expect(res).to.have.property('id');
        expect(res.name).to.equal('Katrina');
        expect(res.category).to.equal(3);

        hurricaneID = res.id;

        var postData = JSON.stringify({
          'hurricane': hurricaneID,
          'area': 'Louisiana',
          'deaths': 1836
        });

        return post(postData, {
          path: '/entities/CityHurricane'
        });

      })
      .then(function (res) {
        expect(res).to.have.property('id');
        expect(res.area).to.equal('Louisiana');
        expect(res.deaths).to.equal(1836);
        expect(res).to.have.property('hurricane');
        expect(res.hurricane.Entity).to.equal('Hurricane');
        expect(res.hurricane.id).to.equal(hurricaneID);
      });
  });

  it('should create an Entity\'s instance that has id as an object' +
      'when it is an association', function () {
    var postData = JSON.stringify({
      'name': 'Katrina',
      'category': 3
    });

    var hurricaneID;

    return post(postData)
        .then(function (res) {
          expect(res).to.have.property('id');
          expect(res.name).to.equal('Katrina');
          expect(res.category).to.equal(3);

          hurricaneID = {id: res.id};

          var postData = JSON.stringify({
            'hurricane': hurricaneID,
            'area': 'Louisiana',
            'deaths': 1836
          });

          return post(postData, {
            path: '/entities/CityHurricane'
          });

        })
        .then(function (res) {
          expect(res).to.have.property('id');
          expect(res.area).to.equal('Louisiana');
          expect(res.deaths).to.equal(1836);
          expect(res).to.have.property('hurricane');
          expect(res.hurricane.Entity).to.equal('Hurricane');
          expect(res.hurricane.id).to.equal(hurricaneID.id);
        });
  });

});
