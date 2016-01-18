'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var entity = require('@back4app/back4app-entity');
var User = entity.models.User;

var authentication = require('./middlewares/authentication');
var session = require('./middlewares/session');
var notfound = require('./middlewares/notfound');
var error = require('./middlewares/error');

module.exports = securityRouter;

function securityRouter(options) {
  /* Parse options */
  var opts = options || {};
  var accessToken = opts.accessToken || null;
  var store = opts.store || new session.MemoryStore();

  /* Build router */
  var router = express.Router();

  /* Install middlewares first */
  router.use(bodyParser.json());
  router.use(authentication({accessToken: accessToken}));
  router.use(session({store: store}));

  /* Then, define routes */
  router.post('/login', login(store));
  router.post('/logout', logout(store));

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
function login(store) {

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
        user.authenticate(password)
          .then(function (isValid) {
            if (!isValid) {
              res.status(401).json({
                code: 116,
                error: 'Invalid User Credentials'
              });
              return;
            }

            // create new session
            store.create(req, user.id)
              .then(function (session) {
                // return session token to user
                res.json({sessionToken: session.token});
              })
              .catch(function () {
                // unknown error
                res.status(500).json({
                  code: 1,
                  error: 'Internal Server Error'
                });
              });
          });
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
function logout(store) {
  return function (req, res) {
    // check for request session
    if (req.session === undefined) {
      res.status(403).json({
        code: 118,
        error: 'Operation Forbidden'
      });
      return;
    }

    // destroy current session
    var sid = req.session.token;
    store.destroy(sid)
      .then(function () {
        // all ok
        res.json({});
      })
      .catch(function () {
        // unknown error
        res.status(500).json({
          code: 1,
          error: 'Internal Server Error'
        });
      });
  };
}
