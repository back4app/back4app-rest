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
    permissions: {'7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {read: true, write: false}}
  };
  var post2 = {};

  var post3 = {
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
    //obs: this permission id is the same req.session.userId in entityRouter

    return db.collection('Post').insertMany([
      {Entity: 'Post', _id: 'e8e5532c-8444-4a02-bc31-2a18b2fae9b7',
        text: 'Hello World!', picture: true,
        permissions: {'7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {read: true, write: false}}
      },
      {Entity: 'Post', _id: '4d0e9795-c692-4b0f-b9c1-8ddeece6aa8b',
        text: 'Hello Back{4}app!', picture: true,
        permissions: {'7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {read: false, write: false}}
      },
      {Entity: 'Post', _id: '924f8e4c-56f1-4eb9-b3b5-f299ded65e9d',
        text: 'Hello NodeJS!', picture: false
      }
    ]);
  }

  function startAPI() {
    var entities = {Post: Post};
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
  describe('GET /:entity/:id/', function () {
    it('should get entity by id because this user has permission', function () {
      return fetchJSON('/entities/Post/e8e5532c-8444-4a02-bc31-2a18b2fae9b7/')
          .then(function (res) {
            expect(res.statusCode).to.be.equals(200);
            expect(res.json).to.be.deep.equals(post1);
          });
    });

    it('should return 403 code because the user does not have permission', function () {
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
            expect(res.json).to.be.deep.equals(post3);
          });
    });
  });

  describe('GET /:entity/', function () {

  });
});