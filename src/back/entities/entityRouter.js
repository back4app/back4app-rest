'use strict';

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

  router.get('/:entity/', function (request, response) {
    var entity = entities[request.params.entity];
    response.send({name: entity.Entity.name || ''});
  });

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
