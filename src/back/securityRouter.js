'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var entity = require('@back4app/back4app-entity');

var authentication = require('./middlewares/authentication');
var notfound = require('./middlewares/notfound');
var error = require('./middlewares/error');

module.exports = securityRouter;

function securityRouter(options) {
  /* Parse options */
  var opts = options || {};
  var accessToken = opts.accessToken || null;

  /* Build router */
  var router = express.Router();

  /* Install middlewares first */
  router.use(bodyParser.json());
  router.use(authentication({accessToken: accessToken}));

  /* Then, define routes */
  router.post('/login', login());
  router.post('/logout', logout());

  /* 404 handler is the last non-error middleware */
  router.use(notfound());

  /* Error handler comes as last middleware */
  router.use(error());

  return router;
}

/* API handlers */

/**
 * Adds a handler to the express router (POST /login). It checks the user
 * credentials and creates a new session.
 * @name module:back4app-rest.securityRouter#login
 * @function
 */
function login() {

  // TODO: remove!
  var Entity = entity.models.Entity;
  var User = Entity.specify({
    name: 'User',
    attributes: {
      username: {type: 'String'},
      password: {type: 'String'}
    }
  });
  User.prototype.authenticate = function (password) {
    return this.password === password;
  };
  // TODO: end remove!

  return function (req, res) {
    var username = req.body.username;
    var password = req.body.password;

    // check params
    if (username === undefined) {
      res.status(401).json({
        code: 114,
        error: 'Username Missing'
      });
      return;
    }

    if (password === undefined) {
      res.status(401).json({
        code: 115,
        error: 'Password Missing'
      });
      return;
    }

    // validate user credentials
    User.get({username: username})
      .then(function (user) {
        // check password
        if (!user.authenticate(password)) {
          res.status(401).json({
            code: 116,
            error: 'Invalid User Credentials'
          });
          return;
        }

        // TODO: write tests for API errors
        // TODO: create session

        res.json({user: user.username, auth: 'ok'});
      })
      .catch(function () {
        // username not found
        res.status(401).json({
          code: 116,
          error: 'Invalid User Credentials'
        });
      });
  };
}

/**
 * Adds a handler to the express router (POST /logout). It terminates the
 * given session.
 * @name module:back4app-rest.securityRouter#login
 * @function
 */
function logout() {
  return function (req, res) {
    res.json({
      status: 'ok'
    });
  };
}
