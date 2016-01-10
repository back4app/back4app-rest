'use strict';

var chai = require('chai');
var expect = chai.expect;
var express = require('express');
var bodyParser = require('body-parser');
var entity = require('@back4app/back4app-entity');
var AssociationAttribute = entity.models.attributes.types.AssociationAttribute;
var ValidationError = entity.models.errors.ValidationError;
var QueryError = require('@back4app/back4app-entity-mongodb').errors.QueryError;

module.exports = entityRouter;

function entityRouter(entities, accessToken) {
  var router = express.Router();

  router.use(bodyParser.json());

  /* Middlewares come first */

  /**
   * Adds an authentication handler to the express router. It checks for
   * the `X-Access-Token` header and compares with the given token.
   * @name module:back4app-rest.entities.entityRouter#auth
   * @function
   */
  router.use(function auth(req, res, next) {
    var token = req.get('X-Access-Token');
    if (token === undefined) {
      res.status(401).json({
        code: 112,
        error: 'Access Token Missing'
      });
    } else if (token !== accessToken) {
      // invalid auth
      res.status(401).json({
        code: 113,
        error: 'Invalid API Credentials'
      });
    } else {
      // auth ok
      next();
    }
  });

  /* Then routes are defined */

  /**
   * Adds a handler to the express router (POST /:entity/). It returns
   * the inserted entity instance.
   * @name module:back4app-rest.entities.entityRouter#post
   * @function
   */
  router.post('/:entity/', function (request, response) {
    var entityName = request.params.entity;

    // check for errors
    if (!entities.hasOwnProperty(entityName)) {
      response.status(404).json({
        code: 122,
        error: 'Entity Not Found'
      });
      return;
    }

    var Entity = entities[entityName];

    expect(Entity).to.be.a('function');

    var entity = new Entity(request.body);

    // Replaces the Association ID with an Association Entity's Instance
    _replaceAssociationInAttributes(Entity, entity);

    // validate entity
    try {
      entity.validate();
    } catch (e) {
      response.status(400).json({
        code: 103,
        error: 'Invalid Entity'
      });
      return;
    }

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
        code: 122,
        error: 'Entity Not Found'
      });
      return;
    }

    var Entity = entities[request.params.entity];

    expect(Entity).to.be.a('function');

    Entity.get({id: id}).then(function (entity) {
        for (var property in request.body) {
          entity[property] = request.body[property];
        }

        // Replaces the Association ID for a Association Entity's Instance
        _replaceAssociationInAttributes(Entity, entity);

        // validate entity
        entity.validate();

        return entity.save().then(function () {
          response.status(200).json(_objectToDocument(entity));
        });
      })
      .catch(function (err) {
        if (err instanceof QueryError) {
          response.status(404).json({
            code: 123,
            error: 'Object Not Found'
          });
        } else if (err instanceof ValidationError) {
          response.status(400).json({
            code: 103,
            error: 'Invalid Entity'
          });
        } else {
          // error not treated
          response.status(500).json({
            code: 1,
            error: 'Internal Server Error'
          });
        }
      });
  });

  /**
   * Adds a handler to the express router (DELETE /:entity/:id/). The handler
   * returns a description of error if it occurred.
   * @name module:back4app-rest.entities.entityRouter#_delete
   * @function
   */
  router.delete('/:entity/:id/', function _delete(request, response) {
    var entityName = request.params.entity;
    var id = request.params.id;

    // check for errors
    if (!entities.hasOwnProperty(entityName)) {
      response.status(404).json({
        code: 122,
        error: 'Entity Not Found'
      });
      return;
    }

    var Entity = entities[entityName];
    var entity = new Entity({id: id});

    entity.delete()
      .then(function () {
        response.status(204).end();
      })
      .catch(function () {
        response.status(500).json({
          code: 1,
          error: 'Internal Server Error'
        });
      });
  });

  /* 404 handler is the last non-error middleware */

  router.use(function (req, res) {
    res.status(404).json({
      code: 121,
      error: 'URL Not Found'
    });
  });

  /* Error handler comes as last middleware */

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
      if (err instanceof SyntaxError) {
        // malformed JSON on body
        res.status(400).json({
          code: 102,
          error: 'Invalid JSON'
        });
      } else {
        res.status(500).json({
          code: 1,
          error: 'Internal Server Error'
        });
      }
    }
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
