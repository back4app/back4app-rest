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

  router.delete('/:entity/:id/', function (request, response) { //localhost:3000/entities/:entity
    try {
      var Entity = entities[request.params.entity];
    }catch(err){
      response.status(400).json({
        message: 'Entity is not defined',
        code: 0
      });
    }
    var id = request.params.id;
    var entity = new Entity({id: id});

    entity.delete()
      .then(function () {
        response.status(204).end();
      })
      .catch(function () {
        response.status(500).json({
          message: 'Internal error',
          code: 0
        });
      });

  });

  return router;
}
