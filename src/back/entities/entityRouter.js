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
