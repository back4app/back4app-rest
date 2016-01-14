'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var entity = require('@back4app/back4app-entity');
var AssociationAttribute = entity.models.attributes.types.AssociationAttribute;
var ValidationError = entity.models.errors.ValidationError;
var QueryError = require('@back4app/back4app-entity-mongodb').errors.QueryError;

var authentication = require('../middlewares/authentication');
var session = require('../middlewares/session');
var notfound = require('../middlewares/notfound');
var error = require('../middlewares/error');

module.exports = entityRouter;

function entityRouter(options) {
  /* Parse options */
  var opts = options || {};
  var entities = opts.entities || {};
  var accessToken = opts.accessToken || null;
  var store = opts.store || new session.MemoryStore();

  /* Build router */
  var router = express.Router();

  /* Install middlewares first */
  router.use(bodyParser.json());
  router.use(authentication({accessToken: accessToken}));
  router.use(session({store: store}));

  /* Then, define routes */
  router.post('/:entity/', postEntity(entities));
  router.get('/:entity/:id/', getEntity(entities));
  router.get('/:entity/', findEntities(entities));
  router.put('/:entity/:id/', updateEntity(entities));
  router.delete('/:entity/:id/', deleteEntity(entities));

  /* 404 handler is the last non-error middleware */
  router.use(notfound());

  /* Error handler comes as last middleware */
  router.use(error());

  return router;
}

/* API handlers */

/**
 * Adds a handler to the express router (POST /:entity/). It returns
 * the inserted entity instance.
 * @name module:back4app-rest.entities.entityRouter#post
 * @function
 */
function postEntity(entities) {
  return function (req, res) {
    var entityName = req.params.entity;

    // check for errors
    if (!entities.hasOwnProperty(entityName)) {
      res.status(404).json({
        code: 122,
        error: 'Entity Not Found'
      });
      return;
    }

    var Entity = entities[entityName];

    var entity = new Entity(req.body);

    // Replaces the Association ID with an Association Entity's Instance
    _replaceAssociationInAttributes(Entity, entity);

    // validate entity
    try {
      entity.validate();
    } catch (e) {
      res.status(400).json({
        code: 103,
        error: 'Invalid Entity'
      });
      return;
    }

    entity.save().then(function () {
        res.status(201).json(_objectToDocument(entity));
      })
      .catch(function () {
        res.status(400).json({
          code: 0,
          message: 'Internal Error'
        });
      });
  };
}

/**
 * Adds a handler to the express router (GET /:entity/:id/). The handler
 * return an entity searching by id.
 * @name module:back4app-rest.entities.entityRouter#get
 * @function
 */
function getEntity(entities) {
  return function (req, res) {
    var entityName = req.params.entity;
    var id = req.params.id;

    // check for errors
    if (!entities.hasOwnProperty(entityName)) {
      res.status(404).json({
        code: 122,
        error: 'Entity Not Found'
      });
      return;
    }

    var Entity = entities[entityName];

    // create query to filter by id and match only current entity and
    // it's specifications
    var query = {
      id: id,
      Entity: {$in: _listEntityAndSpecifications(Entity)}
    };

    Entity.get(query)
      .then(function (entity) {
        res.json(_objectToDocument(entity));
      })
      .catch(function () {
        res.status(404).json({
          code: 123,
          error: 'Object Not Found'
        });
      });
  };
}

/**
 * Adds a handler to the express router (GET /:entity/). The handler
 * return a list of entities filtered by an optional query.
 * @name module:back4app-rest.entities.entityRouter#find
 * @function
 */
function findEntities(entities) {
  return function (req, res) {
    var entityName = req.params.entity;

    // check for errors
    if (!entities.hasOwnProperty(entityName)) {
      res.status(404).json({
        code: 122,
        error: 'Entity Not Found'
      });
      return;
    }

    var Entity = entities[entityName];

    var query = {};
    if (req.query.hasOwnProperty('query')) {
      // decode query's "query" param
      var queryStr = req.query.query;
      try {
        query = JSON.parse(decodeURIComponent(queryStr));
      } catch (e) {
        res.status(400).json({
          code: 101,
          error: 'Invalid Query'
        });
        return;
      }
    }

    // update query to match only current entity and it's specifications
    query.Entity = {$in: _listEntityAndSpecifications(Entity)};

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
  };
}

/**
 * Adds a handler to the express router (UPDATE /:entity/). It returns
 * the updated entity instance.
 * @name module:back4app-rest.entities.entityRouter#update
 * @function
 */
function updateEntity(entities) {
  return function (req, res) {
    var entityName = req.params.entity;
    var id = req.params.id;

    // check for errors
    if (!entities.hasOwnProperty(entityName)) {
      res.status(404).json({
        code: 122,
        error: 'Entity Not Found'
      });
      return;
    }

    var Entity = entities[entityName];

    Entity.get({id: id}).then(function (entity) {
        for (var property in req.body) {
          if (req.body.hasOwnProperty(property)) {
            entity[property] = req.body[property];
          }
        }

        // Replaces the Association ID for a Association Entity's Instance
        _replaceAssociationInAttributes(Entity, entity);

        // validate entity
        entity.validate();

        return entity.save().then(function () {
          res.status(200).json(_objectToDocument(entity));
        });
      })
      .catch(function (err) {
        if (err instanceof QueryError) {
          res.status(404).json({
            code: 123,
            error: 'Object Not Found'
          });
        } else if (err instanceof ValidationError) {
          res.status(400).json({
            code: 103,
            error: 'Invalid Entity'
          });
        } else {
          // error not treated
          res.status(500).json({
            code: 1,
            error: 'Internal Server Error'
          });
        }
      });
  };
}

/**
 * Adds a handler to the express router (DELETE /:entity/:id/). The handler
 * returns a description of error if it occurred.
 * @name module:back4app-rest.entities.entityRouter#_delete
 * @function
 */
function deleteEntity(entities) {
  return function (req, res) {
    var entityName = req.params.entity;
    var id = req.params.id;

    // check for errors
    if (!entities.hasOwnProperty(entityName)) {
      res.status(404).json({
        code: 122,
        error: 'Entity Not Found'
      });
      return;
    }

    var Entity = entities[entityName];
    var entity = new Entity({id: id});

    entity.delete()
      .then(function () {
        res.status(204).end();
      })
      .catch(function () {
        res.status(500).json({
          code: 1,
          error: 'Internal Server Error'
        });
      });
  };
}

/* Helper functions */

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

function _listEntityAndSpecifications(entityClass) {
  var classes = [entityClass.specification.name];
  for (var className in entityClass.specializations) {
    classes.push(className);
  }
  return classes;
}

function _replaceAssociationInAttributes(Entity, entity) {
  for (var attrName in Entity.attributes) {
    var attribute = Entity.attributes[attrName];
    if (attribute instanceof AssociationAttribute) {
      if (entity[attrName] instanceof Array) {
        for (var i = 0; i < entity[attrName].length; i++) {
          entity[attrName][i] = _createCleanInstance(
            attribute.Entity, entity[attrName][i]);
        }
      } else {
        entity[attrName] = _createCleanInstance(
          attribute.Entity, entity[attrName]);
      }
    } else if (attrName !== 'id') {
      entity[attrName] = attribute.parseDataValue(entity[attrName]);
    }
  }
}

function _createCleanInstance(Entity, id) {
  var stringID;
  if (typeof id === 'string') {
    stringID = id;
  } else {
    stringID = id.id;
  }
  return new Entity({
    id: stringID
  }, {
    clean: true
  });
}
