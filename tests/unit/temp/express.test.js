'use strict';

var chai = require('chai');
var expect = chai.expect;
var http = require('http');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

describe('express', function () {
  it('should start an server at localhost:3000',
    function (done) {
      app.get('/', function (req, res) {
        res.send('Hello World!');
      });

      var server = app.listen(3000, function () {
        var port = server.address().port;

        expect(port).to.equal(3000);

        http.get({
          host: 'localhost',
          port: '3000'
        }, function (response) {
          var body = '';
          response.on('data', function (d) {
            body += d;
          });
          response.on('end', function () {
            expect(body).to.equal('Hello World!');
            server.close();
            done();
          });
        });
      });
    });
});

describe('express REST', function () {
  var router;
  var testModel;
  var testArray;
  var server;
  var id;
  before(function (done) {
    testArray = [];
    id = 0;
    //app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    router = express.Router();
    router.get('/', function (req, res) {
      //res.json({ message: 'api working' });
      res.status(200).send('api working');
    });
    app.use('/api', router);
    app.use(function (error) {
      console.log("Error Handler called");
    });
    server = app.listen(3000, function () {
      var port = server.address().port;
      expect(port).to.equal(3000);
      done();
    });
  });

  after(function () {
    server.close();
  });

  it('should add GET route to /api/entity (CRUD - Read)', function (done) {
    router.route('/test')
      .get(function (req, res) {
        testModel = {};
        testModel.id = id++;
        testModel.name = 'John Watson';
        testModel.job = 'Doctor';
        testModel.serverInfo = 'Arthur Conan Doyle';
        testArray.push(testModel);
        res.json(testArray);
      });

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
        expect(responseObj).to.be.an('array');
        expect(responseObj[0].name).to.equal('John Watson');
        expect(responseObj[0].job).to.equal('Doctor');
        expect(responseObj[0].serverInfo).to.equal('Arthur Conan Doyle');
        done();
      });
    });
    req.end();
  });

  it('should add POST route to /api/test (CRUD - Create)', function (done) {
    router.route('/test')
      .post(function (req, res) {
        testModel = {};
        testModel.id = id++;
        testModel.name = req.body.name;
        testModel.job = req.body.job;
        testModel.serverInfo = 'Arthur Conan Doyle';
        testArray.push(testModel);
        res.json(testModel);
      });

    var postData = JSON.stringify({
      'name': 'Sherlock Holmes',
      'job': 'Consultant'
    });

    var req = http.request({
      host: 'localhost',
      port: '3000',
      path: '/api/test',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    }, function (response) {
      expect(response.statusCode).to.equal(200);
      var body = '';
      response.on('data', function (d) { body += d; });
      response.on('end', function () {
        var responseObj = JSON.parse(body);
        expect(responseObj.id).to.equal(1);
        expect(responseObj.name).to.equal('Sherlock Holmes');
        expect(responseObj.job).to.equal('Consultant');
        expect(responseObj.serverInfo).to.equal('Arthur Conan Doyle');
        done();
      });
    });
    req.write(postData);
    req.end();
  });

  it('should add PUT route to /api/test (CRUD - Update)', function (done) {
    router.route('/test/:id')
      .put(function (req, res) {
        testModel = null;
        var key;
        for (var i in testArray) {
          if ('' + testArray[i].id === req.params.id) {
            testModel = testArray[i];
            key = i;
          }
        }
        expect(testModel).to.be.an('object');
        testModel.name = req.body.name || testModel.name;
        testModel.job = req.body.job || testModel.job;
        testArray[key] = testModel;
        res.json(testModel);
      });

    var postData = JSON.stringify({
      'job': 'Detective'
    });

    var req = http.request({
      host: 'localhost',
      port: '3000',
      path: '/api/test/1',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    }, function (response) {
      expect(response.statusCode).to.equal(200);
      var body = '';
      response.on('data', function (d) { body += d; });
      response.on('end', function () {
        var responseObj = JSON.parse(body);
        expect(responseObj.id).to.equal(1);
        expect(responseObj.name).to.equal('Sherlock Holmes');
        expect(responseObj.job).to.equal('Detective');
        expect(responseObj.serverInfo).to.equal('Arthur Conan Doyle');
        done();
      });
    });
    req.write(postData);
    req.end();
  });

  it('should add DELETE route to /api/test (CRUD - Delete)', function (done) {
    router.route('/test/:id')
      .delete(function (req, res) {
        testModel = null;
        var key;
        for (var i in testArray) {
          if ('' + testArray[i].id === req.params.id) {
            testModel = testArray[i];
            key = i;
          }
        }
        expect(testModel).to.be.an('object');
        //delete testArray[key];
        testArray.splice(key);
        res.json(testArray); //array returned just to test
      });

    var req = http.request({
      host: 'localhost',
      port: '3000',
      path: '/api/test/1',
      method: 'DELETE'
    }, function (response) {
      expect(response.statusCode).to.equal(200);
      var body = '';
      response.on('data', function (d) { body += d; });
      response.on('end', function () {
        var responseObj = JSON.parse(body);
        expect(responseObj).to.be.an('array');
        expect(responseObj.length).to.be.equal(1);
        expect(responseObj[0].id).to.equal(0);
        expect(responseObj[0].name).to.equal('John Watson');
        expect(responseObj[0].job).to.equal('Doctor');
        expect(responseObj[0].serverInfo).to.equal('Arthur Conan Doyle');
        done();
      });
    });
    req.end();
  });



  describe('GET using entity', function () {
    var Entity = require('@back4app/back4app-entity').models.Entity;
    var Character;
    Character = Entity.specify({
      name: 'Character',
      attributes: {
        name: { type: 'String', multiplicity: '1', default: undefined },
        job: {  type: 'String', multiplicity: '1', default: undefined }
      }
    });

    it('should add GET route to /api/character (CRUD - Read)', function (done) {
      var routePath = '/' + Character.specification.name;
      router.route(routePath)
        .get(function (req, res) {
          var moriarty = new Character({
            name: 'James Moriarty',
            job: 'Criminal Mastermind'
          });
          res.json(moriarty);
        });

      var req = http.request({
        host: 'localhost',
        port: '3000',
        path: '/api/Character',
        method: 'GET'
      }, function (response) {
        expect(response.statusCode).to.equal(200);
        var body = '';
        response.on('data', function (d) { body += d; });
        response.on('end', function () {
          var responseObj = JSON.parse(body);
          expect(responseObj).to.be.an('object');
          expect(responseObj.name).to.equal('James Moriarty');
          expect(responseObj.job).to.equal('Criminal Mastermind');
          done();
        });
      });
      req.end();
    });
  });
});
