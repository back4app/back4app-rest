//
// Created by davimacedo on 04/11/15.
//

var express = require('express');

module.exports = entityRouter;

function entityRouter(entities, accessToken) {
  var router = express.Router();

  router.use(function (request, response, next) {
  });

  router.get('/:entity/', function (request, response) {
    response.send(entities[':entity'].find(request));
  });

  return router;
}
