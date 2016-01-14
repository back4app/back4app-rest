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
  var Person = Entity.specify({
    name: 'Person',
    attributes: {
      name: {type: 'String'},
      age: {type: 'Number'},
      married: {type: 'Boolean'}
    }
  });

  var Author = Person.specify({
    name: 'Author',
    attributes: {
      readers: {type: 'Number'},
      books: {type: 'Book', multiplicity: '*'}
    }
  });

  var FictionAuthor = Author.specify({
    name: 'FictionAuthor'
  });

  var Book = Entity.specify({
    name: 'Book',
    attributes: {
      title: {type: 'String'},
      publishedAt: {type: 'Date'}
    }
  });

  // entity JSON objects
  // Person
  var john = {
    id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0', Entity: 'Person',
    name: 'John', age: 30, married: true
  };
  var theo = {
    id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7', Entity: 'Person',
    name: 'Theo', age: 20, married: false
  };
  var will = {
    id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f', Entity: 'Person',
    name: 'Will', age: 30, married: false
  };
  // Author
  var greg = {
    id: 'fbab76bb-92c2-4aa8-bdd7-364430d0274b', Entity: 'Author',
    name: 'Greg', age: 21, married: false, readers: 1000, books: null
  };
  // FictionAuthor
  var matt = {
    id: '07fceb36-da60-4eb4-bdad-ee9c855e626b', Entity: 'FictionAuthor',
    name: 'Matt', age: 22, married: false, readers: 2000, books: null
  };
  var phil = {
    id: 'a42ecb21-417e-470a-b8ca-1e54f04f8e01', Entity: 'FictionAuthor',
    name: 'Phil', age: 23, married: true, readers: 3000, books: null
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
    return db.collection('Person').insertMany([
      // Person
      {Entity: 'Person', _id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
        name: 'John', age: 30, married: true},
      {Entity: 'Person', _id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7',
        name: 'Theo', age: 20, married: false},
      {Entity: 'Person', _id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f',
        name: 'Will', age: 30, married: false},
      // Author
      {Entity: 'Author', _id: 'fbab76bb-92c2-4aa8-bdd7-364430d0274b',
        name: 'Greg', age: 21, married: false, readers: 1000},
      // FictionAuthor
      {Entity: 'FictionAuthor', _id: '07fceb36-da60-4eb4-bdad-ee9c855e626b',
        name: 'Matt', age: 22, married: false, readers: 2000},
      {Entity: 'FictionAuthor', _id: 'a42ecb21-417e-470a-b8ca-1e54f04f8e01',
        name: 'Phil', age: 23, married: true, readers: 3000}
    ]);
  }

  function startAPI() {
    var router = entityRouter({
      Person: Person,
      Author: Author,
      FictionAuthor: FictionAuthor,
      Book: Book
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
  describe('GET /:entity/:id/', function () {

    it('should get entity by id', function () {
      return fetchJSON('/entities/Person/0ca3c8c9-41a7-4967-a285-21f8cb4db2c0/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals(john);
        });
    });

    it('should get entity by id, searching on parent class', function () {
      return fetchJSON('/entities/Person/07fceb36-da60-4eb4-bdad-ee9c855e626b/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals(matt);
        });
    });

    it('should return 404 code on wrong entity', function () {
      return fetchJSON('/entities/Wrong/0ca3c8c9-41a7-4967-a285-21f8cb4db2c0/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(404);
          expect(res.json).to.be.deep.equals({
            code: 122,
            error: 'Entity Not Found'
          });
        });
    });

    it('should return 404 code on wrong id', function () {
      return fetchJSON('/entities/Person/00000000-0000-0000-0000-000000000000/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(404);
          expect(res.json).to.be.deep.equals({
            code: 123,
            error: 'Object Not Found'
          });
        });
    });

    it('should return 404 code on invalid id for specific entity', function () {
      return fetchJSON('/entities/Author/0ca3c8c9-41a7-4967-a285-21f8cb4db2c0/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(404);
        });
    });

  });

  describe('GET /:entity/', function () {

    it('should find entities without query and limits params', function () {
      return fetchJSON('/entities/Person/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals({
            results: [matt, john, theo, phil, will, greg]
          });
        });
    });

    it('should find entities filtered by query', function () {
      var query = JSON.stringify({
        name: {
          $in: ['John', 'Will']
        }
      });
      var url = '/entities/Person/?query=' + encodeURIComponent(query);
      return fetchJSON(url)
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals({
            results: [john, will]
          });
        });
    });

    it('should find entities filtered by query and sorted descending by name',
        function () {
      var query = JSON.stringify({
        name: {
          $in: ['John', 'Will']
        }
      });
      var url = '/entities/Person/?query=' + encodeURIComponent(query) +
          '&sort=-name';
      return fetchJSON(url)
          .then(function (res) {
            expect(res.statusCode).to.be.equals(200);
            expect(res.json).to.be.deep.equals({
              results: [will, john]
            });
          });
    });

    it('should find entities using middle class in hierarchy', function () {
      return fetchJSON('/entities/Author/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals({
            results: [matt, phil, greg]
          });
        });
    });

    it('should find entities using middle class in hierarchy and limit ' +
        'it by 2', function () {
      return fetchJSON('/entities/Author?limit=2')
          .then(function (res) {
            expect(res.statusCode).to.be.equals(200);
            expect(res.json).to.be.deep.equals({
              results: [matt, phil]
            });
          });
    });

    it('should find entities by most specific class', function () {
      return fetchJSON('/entities/FictionAuthor/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals({
            results: [matt, phil]
          });
        });
    });

    it('should find entities by most specific class and skip the first ' +
        '2 results', function () {
      return fetchJSON('/entities/FictionAuthor?skip=2')
          .then(function (res) {
            expect(res.statusCode).to.be.equals(200);
            expect(res.json).to.be.deep.equals({
              results: []
            });
          });
    });

    it('should find entities and sort then by descending age and ascending' +
        ' name', function () {
      return fetchJSON('/entities/Person?sort=-age,name')
          .then(function (res) {
            expect(res.statusCode).to.be.equals(200);
            expect(res.json).to.be.deep.equals({
              results: [john, will, phil, matt, greg, theo]
            });
          });
    });

    it('should find entities and sort then by ascending age and descending' +
        ' id', function () {
      return fetchJSON('/entities/Person?sort=age,-id')
          .then(function (res) {
            expect(res.statusCode).to.be.equals(200);
            expect(res.json).to.be.deep.equals({
              results: [theo, greg, matt, phil, will, john]
            });
          });
    });

    it('should find entities by query on more specific class', function () {
      var query = JSON.stringify({
        married: true
      });
      var url = '/entities/Author/?query=' + encodeURIComponent(query);
      return fetchJSON(url)
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals({
            results: [phil]
          });
        });
    });

    it('should return 404 code on wrong entity', function () {
      return fetchJSON('/entities/Wrong/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(404);
          expect(res.json).to.be.deep.equals({
            code: 122,
            error: 'Entity Not Found'
          });
        });
    });

    it('should return error on invalid query', function () {
      var query = encodeURIComponent('invalid query');
      var url = '/entities/Person/?query=' + encodeURIComponent(query);
      return fetchJSON(url)
        .then(function (res) {
          expect(res.statusCode).to.be.equals(400);
          expect(res.json).to.be.deep.equals({
            code: 101,
            error: 'Invalid Query'
          });
        });
    });

  });
});
