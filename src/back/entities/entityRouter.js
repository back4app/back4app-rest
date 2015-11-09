'use strict';

var chai = require('chai');
var expect = chai.expect;
var express = require('express');
var bodyParser = require('body-parser');

module.exports = entityRouter;

function entityRouter(entities, accessToken) {
  var router = express.Router();

  router.use(bodyParser.json());

  /**
   * Adds an authentication handler to the express router. It checks for
   * the `X-Access-Token` header and compares with the given token.
   * @name module:back4app-rest.entities.entityRouter#auth
   * @function
   */
  router.use(function auth(req, res, next) {
    var token = req.headers['x-access-token'];
    if (token === accessToken) {
      // auth ok
      next();
    } else {
      // invalid auth
      res.status(401).json({
        code: 0,
        message: 'Invalid Auth Token'
      });
    }
  });

  /**
   * Adds an error handler to the express router. It returns
   * the message and error code.
   * @name module:back4app-rest.entities.entityRouter#get
   * @function
   */
  router.use(function (err, req, res, next) {
    if (!err) {
      next();
    } else {
      res.status(err.status || 500)
        .json({
          code: 0,
          message: err.message
        });
    }
  });

  /**
   * Adds a handler to the express router (POST /:entity/). It returns
   * the inserted entity instance.
   * @name module:back4app-rest.entities.entityRouter#post
   * @function
   */
  router.post('/:entity/', function (request, response) {
    var entityName = request.params.entity;

    if (!entities.hasOwnProperty(entityName)) {
      response.status(404).json({
        code: 0,
        message: 'Entity not defined'
      });
      return;
    }

    var Entity = entities[entityName];

    expect(Entity).to.be.a('function');

    var entity = new Entity(request.body);
    entity.save().then(function () {
      response.status(201).json(_objectToDocument(entity));
    })
      .catch(function () {
        response.status(400).json({
          code: 0,
          message: 'Internal Error'
        });
      });
  });

  /**
   * Adds a handler to the express router (GET /:entity/:id/). The handler
   * return an entity searching by id.
   * @name module:back4app-rest.entities.entityRouter#get
   * @function
   */
  router.get('/:entity/:id/', function get(req, res) {
    var entityName = req.params.entity;
    var id = req.params.id;

    // check for errors
    if (!entities.hasOwnProperty(entityName)) {
      res.status(404).json({
        code: 0,
        message: 'Entity not defined'
      });
      return;
    }

    var Entity = entities[entityName];

    Entity.get({id: id})
      .then(function (entity) {
        res.json(_objectToDocument(entity));
      })
      .catch(function () {
        res.status(404).json({
          code: 0,
          message: 'Entity not found'
        });
      });
  });

  /**
   * Adds a handler to the express router (GET /:entity/). The handler
   * return a list of entities filtered by an optional query.
   * @name module:back4app-rest.entities.entityRouter#find
   * @function
   */
  router.get('/:entity/', function find(req, res) {
    var entityName = req.params.entity;

    // check for errors
    if (!entities.hasOwnProperty(entityName)) {
      res.status(404).json({
        code: 0,
        message: 'Entity not defined'
      });
      return;
    }

    var Entity = entities[entityName];

    var query = {};
    if (req.query.hasOwnProperty('query')) {
      // decode query's "query" param
      var queryStr = req.query.query;
      query = JSON.parse(decodeURIComponent(queryStr));
    }

    Entity.find(query)
      .then(function (entities) {
        var results = [];
        for (var i = 0; i < entities.length; i++) {
          results.push(_objectToDocument(entities[i]));
        }
        res.json({results: results});
      })
      .catch(function () {
        res.status(500).json({
          code: 0,
          message: 'Internal error'
        });
      });
  });

  /**
   * Adds a handler to the express router (UPDATE /:entity/). It returns
   * the updated entity instance.
   * @name module:back4app-rest.entities.entityRouter#update
   * @function
   */
  router.put('/:entity/:id/', function update(request, response) {
    var entityName = request.params.entity;
    var id = request.params.id;

    // check for errors
    if (!entities.hasOwnProperty(entityName)) {
      response.status(404).json({
        code: 0,
        message: 'Entity not defined'
      });
      return;
    }

    var Entity = entities[request.params.entity];

    expect(Entity).to.be.a('function');

    Entity.get({id: id}).then(function (entity) {
        for (var property in request.body) {
          entity[property] = request.body[property];
        }

        entity.save().then(function () {
          response.status(200).json(_objectToDocument(entity));
        });
      })
      .catch(function () {
        response.status(404).json({
          code: 0,
          message: 'Entity not found'
        });
      });
  });

  /*
   * Adds a handler to the express router (DELETE /:entity/:id/). The handler
   * returns a description of error if it occurred.
   * @name module:back4app-rest.entities.entityRouter#_delete
   * @function
   */
  router.delete('/:entity/:id/', function _delete(request, response) {
    //check for errors
    if (!entities.hasOwnProperty(request.params.entity)) {
      response.status(400).json({
        message: 'Entity is not defined',
        code: 0
      });
      return;
    }

    var Entity = entities[request.params.entity];
    var id = request.params.id;
    var entity = new Entity({id: id});

    entity.delete()
      .then(function () {
        response.status(204).end();
      })
      .catch(function () {
        response.status(404).json({
          message: 'Internal error',
          code: 0
        });
      });
  });

  return router;
}

function _objectToDocument(entityObject) {
  var document = {};

  var adapterName = entityObject.adapterName;
  var attributes = entityObject.Entity.attributes;

  for (var attrName in attributes) {
    if (attributes.hasOwnProperty(attrName)) {
      var attr = attributes[attrName];
      var attrDataName = attr.getDataName(adapterName);
      document[attrDataName] = attr.getDataValue(entityObject[attrName]);
    }
  }

  document.Entity = entityObject.Entity.specification.name;

  return document;
}
