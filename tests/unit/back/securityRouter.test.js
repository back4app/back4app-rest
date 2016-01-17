'use strict';

var http = require('http');

var expect = require('chai').expect;
var mongodb = require('mongodb');
var express = require('express');
var Promise = require('bluebird');
var entity = require('@back4app/back4app-entity');

var securityRouter = require('../../../').securityRouter;

// setup tests settings
require('../settings');

// util functions
function login(username, password) {
  return new Promise(function (resolve, reject) {
    var body = {};
    if (username !== undefined) {
      body.username = username;
    }
    if (password !== undefined) {
      body.password = password;
    }
    var postData = JSON.stringify(body);

    var options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'X-Access-Token': 'test_access_token'
      }
    };

    var req = http.request(options, function (res) {
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
    });

    req.on('error', function (err) {
      reject(err);
    });

    // write data to request body
    req.write(postData);
    req.end();
  });
}

function logout(sessionToken) {
  return new Promise(function (resolve, reject) {
    var options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/logout',
      method: 'POST',
      headers: {
        'X-Access-Token': 'test_access_token'
      }
    };

    if (sessionToken !== undefined) {
      options.headers['X-Session-Token'] = sessionToken;
    }

    var req = http.request(options, function (res) {
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
    });

    req.on('error', function (err) {
      reject(err);
    });

    req.end();
  });
}

describe('securityRouter', function () {
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
    return db.collection('User').insertOne({
      Entity: 'User', _id: '10013DBA-A678-42F5-94E7-BE4EA23A19AC',
      username: 'user1',
      // hash for password 'pass1'
      password:
        '$2a$10$/XqpCd8IxSufU/O3nsyWT.YsEgHiHL7eX89ywTe8oP6YNbjDqhIeW',
      permissions: {
        '10013DBA-A678-42F5-94E7-BE4EA23A19AC': {read: true, write: true}
      }
    });
  }

  function startAPI() {
    var security = securityRouter({accessToken: 'test_access_token'});

    var app = express();
    app.use('/', security);
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
  describe('POST /login', function () {
    it('should return session token for right credentials', function () {
      return login('user1', 'pass1')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.have.property('sessionToken');
        });
    });

    it('should return error for wrong credentials', function () {
      return login('user1', 'wrong_password')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(401);
          expect(res.json).to.be.deep.equals({
            code: 116,
            error: 'Invalid User Credentials'
          });
        });
    });

    it('should return error for missing username', function () {
      return login(undefined, 'pass1')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(401);
          expect(res.json).to.be.deep.equals({
            code: 114,
            error: 'Username Missing'
          });
        });
    });

    it('should return error for missing password', function () {
      return login('user1', undefined)
        .then(function (res) {
          expect(res.statusCode).to.be.equals(401);
          expect(res.json).to.be.deep.equals({
            code: 115,
            error: 'Password Missing'
          });
        });
    });
  });

  describe('POST /logout', function () {
    it('should destroy valid session', function () {
      var sessionToken;

      // login first
      return login('user1', 'pass1')
        .then(function (res) {
          sessionToken = res.json.sessionToken;
        })
        .then(function () {
          // then, logout on valid session
          return logout(sessionToken);
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals({});
        })
        .then(function () {
          // then, try to logout again and expect error
          return logout(sessionToken);
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(401);
          expect(res.json).to.be.deep.equals({
            code: 117,
            error: 'Invalid Session Token'
          });
        });
    });

    it('should return error on invalid session', function () {
      return logout('invalid_session_token')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(401);
          expect(res.json).to.be.deep.equals({
            code: 117,
            error: 'Invalid Session Token'
          });
        });
    });

    it('should return error on missing session', function () {
      return logout(undefined)
        .then(function (res) {
          expect(res.statusCode).to.be.equals(403);
          expect(res.json).to.be.deep.equals({
            code: 118,
            error: 'Operation Forbidden'
          });
        });
    });
  });
});
