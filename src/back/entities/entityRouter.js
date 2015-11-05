'use strict';

var express = require('express');
var bodyParser = require('body-parser');

module.exports = entityRouter;

function entityRouter(entities, accessToken) {
  var router = express.Router();

  router.use(function (request, response, next) {
    //access token validation
    var token = request.headers['x-access-token'] || '';
    if(!token)
    {
      response.status(403).send('Token not supplied or empty');
    }
    else if(token == accessToken)
    {
      next();
    }
    else
    {
      response.status(404).send('Invalid token');
    }
  });''

  router.use(bodyParser.json());

  router.get('/:entity/', function (request, response) {
    var entity = entities[request.params.entity];
    response.send({name: entity.Entity.name || ''});
  });

  return router;
}
