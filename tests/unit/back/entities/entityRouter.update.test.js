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
// function update(path) {
//   return new Promise(function (resolve, reject) {
//     var options = {
//       hostname: '127.0.0.1',
//       port: 3000,
//       path: path,
//       headers: {
//         'X-Access-Token': 'test_access_token'
//       }
//     };
//     http.get(options, function (res) {
//       var body = '';

//       res.setEncoding('utf8');

//       res.on('data', function (chunk) {
//         body += chunk.toString();
//       });

//       res.on('end', function () {
//         res.body = body;
//         try {
//           res.json = JSON.parse(body);
//         } catch (e) {
//           // invalid JSON, do nothing
//         }
//         resolve(res);
//       });
//     }).on('error', function (err) {
//       reject(err);
//     });
//   });
// }

// unit tests
describe('entityRouter', function () {
  // back4app Entities
  var Company = Entity.specify({
    name: 'Company',
    attributes: {
      fantasyName: {type: 'String'},
      employees: {type: 'Number'},
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

  // entity JSON objects
  var gtac = {Entity: 'Company', id: '00000000-0000-4000-a000-000000000111',
    name: 'Gtac', employees: 30};
  var back4app = {Entity: 'Startup', id: '00000000-0000-4000-a000-000000000222',
    owner: 'Davi', investors: 10, fantasyName: 'back4app', employees: 4};
  var monashees = {Entity: 'Investor', id: '00000000-0000-4000-a000-000000000333',
    name: 'Monashees', investee: 20};

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
  	//mongodb documents
  	var gtac_doc = {
  		Entity: 'Company',
  		_id: '00000000-0000-4000-a000-000000000111',
    	name: 'Gtac',
    	employees: 30
    };
    var back4app_doc = {
    	Entity: 'Startup',
    	_id: '00000000-0000-4000-a000-000000000222',
    	owner: 'Davi',
    	investors: 10,
    	fantasyName: 'back4app',
    	employees: 4
    };
    var monashees_doc = {
    	Entity: 'Investor',
    	_id: '00000000-0000-4000-a000-000000000333',
    	name: 'Monashees',
    	investee: 20
    };

    var defer = Promise.defer();

    db.collection('Company').insertOne(gtac_doc).then(function(){
    	return db.collection('Startup').insertOne(back4app_doc);
    }).then(function(){
    	db.collection('Investor').insertOne(monashees_doc);
    	defer.resolve();
    });

    return defer.promise;
  }

  function startAPI() {
    var router = entityRouter({
      Company: Company,
      Startup: Startup,
      Investor: Investor
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

  describe('UPDATE /:entity/:id', function () {
    it('should update', function () {
    });
  });

});