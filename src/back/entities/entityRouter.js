'use strict';

var chai = require('chai');
var expect = chai.expect;
var express = require('express');
var bodyParser = require('body-parser');

module.exports = entityRouter;

function entityRouter(entities, accessToken) {
  var router = express.Router();

  router.use(function (request, response, next) {
    //access token validation
    if (accessToken) {
      next();
    }
  });
  router.use(bodyParser.json());

  /*router.use(function (req, res, next) {
    var body = '';
    req.on('data', function (a) {
      body += a;
    }).on('error', function (e) {
      next(e);
    });
    req.on('end', function () {
      try{
        req.body = JSON.parse(body);
        next();
      } catch (e) {
        next(e);
      }
    }).on('error', function (e) {
      next(e);
    });
  });*/

  router.use(errorHandler);

  function errorHandler (err, req, res, next) {
    if (!err) {
      next();
    } else {
      res.status(err.status || 500)
        .json({
          code: 0,
          message: err.message
        });
    }
  }

  router.get('/:entity/', function (request, response) {
    var entity = entities[request.params.entity];
    response.send({name: entity.Entity.name || ''});
  });

  router.post('/:entity/', function (request, response) {
    var Entity = entities[request.params.entity];
    if (Entity) {
      expect(Entity).to.be.a('function');
      var entity = new Entity(request.body);
      entity.save();
      response.status(201).json(entity);
    } else {
      response.status(404).json({
        message: 'Entity not found',
        code: 0,
        body: request.params.entity
      });
    }
  });

  return router;
}
