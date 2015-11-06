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

  router.get('/:entity/', function (request, response) {
    var entity = entities[request.params.entity];
    response.send({name: entity.Entity.name || ''});
  });

  /**
   * Adds a handler to the express router (GET /:entity/). It returns
   * the inserted entity instance.
   * @name module:back4app-rest.entities.entityRouter#post
   * @function
   */
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

  /*
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
