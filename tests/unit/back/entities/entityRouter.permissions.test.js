'use strict';

var http = require('http');

var expect = require('chai').expect;
var mongodb = require('mongodb');
var express = require('express');
var Promise = require('bluebird');
var entity = require('@back4app/back4app-entity');
var Entity = entity.models.Entity;

var entityRouter = require('../../../../').entities.entityRouter;
var securityRouter = require('../../../../').securityRouter;
var MemoryStore = require('../../../../').middlewares.session.MemoryStore;

// setup tests settings
require('../../settings');

// util functions
function fetchJSON(path, headers) {
  return new Promise(function (resolve, reject) {
    var options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: path,
      headers: {
        'X-Access-Token': 'test_access_token'
      }
    };

    headers = headers || {};
    if (headers.sessionToken !== undefined) {
      options.headers['X-Session-Token'] = headers.sessionToken;
    }

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

function login(username, password) {
  return new Promise(function (resolve, reject) {
    var postData = JSON.stringify({
      username: username,
      password: password
    });

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

describe('entityRouter', function () {
  // back4app Entity
  var Post = Entity.specify({
    name: 'Post',
    attributes: {
      text: {type: 'String'},
      picture: {type: 'Boolean'},
      permissions: {type: 'Object'}
    }
  });

  // entity JSON objects
  // Posts
  var post1 = {
    id: 'e8e5532c-8444-4a02-bc31-2a18b2fae9b7',
    Entity: 'Post', text: 'Hello World!', picture: true,
    permissions: {'7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {read: true}}
  };

  var post2 = {
    id: '924f8e4c-56f1-4eb9-b3b5-f299ded65e9d',
    Entity: 'Post', text: 'Hello NodeJS!', picture: false, permissions: null
  };

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
    return Promise.all([
      db.collection('Post').insertMany([
        {Entity: 'Post', _id: 'e8e5532c-8444-4a02-bc31-2a18b2fae9b7',
          text: 'Hello World!', picture: true,
          permissions: {'7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {read: true}}
        },
        {Entity: 'Post', _id: '4d0e9795-c692-4b0f-b9c1-8ddeece6aa8b',
          text: 'Hello Back{4}app!', picture: true,
          permissions: {'842120bd-54d8-4dc2-8c54-788883ac969e': {}}
        },
        {Entity: 'Post', _id: '924f8e4c-56f1-4eb9-b3b5-f299ded65e9d',
          text: 'Hello NodeJS!', picture: false
        }
      ]),
      db.collection('User').insertOne({
        Entity: 'User', _id: '7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c',
        username: 'user1', password: 'pass1',
        permissions: {
          '7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {
            read: true,
            write: true
          }
        }
      })
    ]);
  }

  function startAPI() {
    var entities = {Post: Post};
    var token = 'test_access_token';
    var store = new MemoryStore();

    var router = entityRouter({
      entities: entities,
      accessToken: token,
      store: store
    });

    var security = securityRouter({
      accessToken: token,
      store: store
    });

    var app = express();
    app.use('/entities', router);
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
  describe('GET /:entity/:id/', function () {
    it('should get entity by id because this user has permission', function () {
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Post/e8e5532c-8444-4a02-bc31-2a18b2fae9b7/';
          return fetchJSON(url, {sessionToken: sessionToken})
            .then(function (res) {
              expect(res.statusCode).to.be.equals(200);
              expect(res.json).to.be.deep.equals(post1);
            });
        });
    });

    it('should return 403 code because the user does not have permission', function () {
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Post/4d0e9795-c692-4b0f-b9c1-8ddeece6aa8b/';
          return fetchJSON(url, {sessionToken: sessionToken})
            .then(function (res) {
              expect(res.statusCode).to.be.equals(403);
              expect(res.json).to.be.deep.equals({
                code: 118,
                error: 'Operation Forbidden'
              });
            });
        });
    });

    it('should return 403 code because entity is not public', function () {
      return fetchJSON('/entities/Post/4d0e9795-c692-4b0f-b9c1-8ddeece6aa8b/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(403);
          expect(res.json).to.be.deep.equals({
            code: 118,
            error: 'Operation Forbidden'
          });
        });
    });

    it('should get entity by id because this instance has public permission', function () {
      return fetchJSON('/entities/Post/924f8e4c-56f1-4eb9-b3b5-f299ded65e9d/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals(post2);
        });
    });
  });

  describe('GET /:entity/', function () {

  });
});