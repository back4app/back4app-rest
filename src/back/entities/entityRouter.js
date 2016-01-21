'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var Promise = require('bluebird');
var bcrypt = require('bcryptjs');
var entity = require('@back4app/back4app-entity');
var User = entity.models.User;
var AssociationAttribute = entity.models.attributes.types.AssociationAttribute;
var ValidationError = entity.models.errors.ValidationError;
var QueryError = require('@back4app/back4app-entity-mongodb').errors.QueryError;

var authentication = require('../middlewares/authentication');
var session = require('../middlewares/session');
var notfound = require('../middlewares/notfound');
var error = require('../middlewares/error');

module.exports = entityRouter;

/**
 * Constant that defines the maximum value of pagination limit parameter.
 * @constant {number}
 * @memberof module:back4app-rest
 */
var MAX_LIMIT = 100;
/**
 * Constant that defines the default value of pagination limit parameter.
 * @constant {number}
 * @memberof module:back4app-rest
 */
var DEFAULT_LIMIT = 30;
/**
 * Constant that defines the default value of pagination skip parameter.
 * @constant {number}
 * @memberof module:back4app-rest
 */
var DEFAULT_SKIP = 0;
/**
 * Constant that defines the default value of pagination sort parameter.
 * @constant {number}
 * @memberof module:back4app-rest
 */
var DEFAULT_SORT = {_id: 1};

function entityRouter(options) {
  /* Parse options */
  var opts = options || {};
  var entities = opts.entities || {};
  var accessToken = opts.accessToken || null;
  var store = opts.store || new session.MemoryStore();

  // add User to list of entities
  entities.User = User;

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

    // replace password with entity is a User
    _replacePasswordInUser(entity, entityName)
      .then(function (entity) {
        entity.save()
          .then(function () {
            // handle special User's permissions
            _replacePermissionsInUser(entity, entityName)
              .then(function (entity) {
                // return created entity
                res.status(201).json(_objectToDocument(entity));
              })
              .catch(function () {
                res.status(500).json({
                  code: 1,
                  error: 'Internal Server Error'
                });
              });
          })
          .catch(function () {
            res.status(400).json({
              code: 103,
              error: 'Invalid Entity'
            });
          });
      })
      .catch(function () {
        res.status(500).json({
          code: 1,
          error: 'Internal Server Error'
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

    // check if exists a session and takes the userId
    var userId = req.session === undefined ? undefined : req.session.userId;

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
        if (_hasReadPermission(entity, userId)) {
          res.json(_objectToDocument(entity));
        } else {
          res.status(403).json({
            code: 118,
            error: 'Operation Forbidden'
          });
        }
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

    // check if exists a session and takes the userId
    var userId = req.session === undefined ? undefined : req.session.userId;

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

    // cleaning pagination limit params
    var limit = req.query.limit === undefined || isNaN(req.query.limit) ?
      DEFAULT_LIMIT : req.query.limit > MAX_LIMIT ?
        MAX_LIMIT : req.query.limit < 0 ?
        DEFAULT_LIMIT : parseInt(req.query.limit);

    var skip =
        req.query.skip === undefined || isNaN(req.query.skip) ||
        req.query.skip < 0 ? DEFAULT_SKIP : parseInt(req.query.skip);

    var sort = {};
    if (!req.query.hasOwnProperty('sort')) {
      sort = DEFAULT_SORT;
    } else {
      var string = req.query.sort;
      var components = string.split(/\s*,\s*/);
      for (var i = 0; i < components.length; i++) {
        if (/^-[0-9A-Za-z]+$/.test(components[i]) === true) {
          sort[components[i].substring(1)] = -1;
        } else {
          sort[components[i]] = 1;
        }
      }
    }

    var params = {};
    params.limit = parseInt(limit);
    params.skip = parseInt(skip);
    params.sort = sort;

    // update query to match only current entity and it's specifications
    query.Entity = {$in: _listEntityAndSpecifications(Entity)};

    //Filters by permission
    // condition 1: if user has permission
    var condition = {};
    condition['permissions.' + userId + '.read'] = true;
    // condition 2: if is public and user is not "blocked"
    var condition2 = {};
    condition2['permissions.*.read'] = true;
    //  either the user does not exist (which means it is not "blocked")...
    var or1 = {};
    or1['permissions.' + userId] = {$exists: false};
    //  ... or it is allowed.
    var or2 = {};
    or2['permissions.' + userId + '.read'] = true;
    condition2.$or = [or1, or2];
    query.$or = [
      {'permissions': null},
      condition,
      condition2
    ];

    Entity.find(query, params)
      .then(function (entities) {
        var results = [];
        for (var i = 0; i < entities.length; i++) {
          results.push(_objectToDocument(entities[i]));
        }
        res.json({results: results});
      })
      .catch(function () {
        res.status(500).json({
          code: 1,
          error: 'Internal Server Error'
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

    // check if exists a session and takes the userId
    var userId = req.session === undefined ? undefined : req.session.userId;

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
      if (_hasWritePermission(entity, userId)) {
        for (var property in req.body) {
          if (req.body.hasOwnProperty(property)) {
            entity[property] = req.body[property];
          }
        }

        // Replaces the Association ID for a Association Entity's Instance
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

        //hash password if changed
        _replacePasswordInUser(Entity, entity)
          .then(function () {
            entity.save().then(function (entity) {
              _replacePermissionsInUser(entity, entityName)
                .then(function (entity) {
                  res.status(200).json(_objectToDocument(entity));
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
            });
          })
      } else {
        res.status(403).json({
          code: 118,
          error: 'Operation Forbidden'
        });
      }
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

    // check if exists a session and takes the userId
    var userId = req.session === undefined ? undefined : req.session.userId;

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
        if (_hasWritePermission(entity, userId)) {
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
        } else {
          res.status(403).json({
            code: 118,
            error: 'Operation Forbidden'
          });
        }
      })
      .catch(function () {
        res.status(404).json({
          code: 123,
          error: 'Object Not Found'
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
      console.log(entity[attrName]);
    }
  }
}

function _replacePasswordInUser(entity, entityName) {
  return new Promise(function (resolve, reject) {
    // only change users
    if (entityName !== 'User') {
      resolve(entity);
      return;
    }

    // hash password
    bcrypt.genSalt(10, function (err, salt) {
      if (err) {
        reject(err);
      } else {
        bcrypt.hash(entity.password, salt, function (err, hash) {
          if (err) {
            reject(err);
          } else {
            entity.password = hash;
            resolve(entity);
          }
        });
      }
    });
  });
}

function _replacePermissionsInUser(entity, entityName) {
  return new Promise(function (resolve, reject) {
    // only change users
    if (entityName !== 'User') {
      resolve(entity);
      return;
    }

    // update permissions
    var userId = entity.id;
    entity.permissions = {};
    entity.permissions[userId] = {read: true, write: true};

    entity.save()
      .then(function () {
        resolve(entity);
      })
      .catch(function (err) {
        reject(err);
      });
  });
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

// check entity permission
function _hasReadPermission(entity, userId) {
  // entity is public
  if (entity.permissions === undefined || entity.permissions === null) {
    return true;
  }
  // check if user has permission
  var userPermission = entity.permissions[userId] || entity.permissions['*'];

  //user has no permission
  if (userPermission === undefined) {
    return false;
  }
  // return user read permission of entity
  return Boolean(userPermission.read);
}

// check write permission
function _hasWritePermission(entity, userId) {
  // entity is public
  if (entity.permissions === undefined || entity.permissions === null) {
    return true;
  }

  // check if user has permission
  var userPermission = entity.permissions[userId] || entity.permissions['*'];
  if (userPermission === undefined) {
    return false;
  }
  // return user write permission of entity
  return Boolean(userPermission.write);
}
