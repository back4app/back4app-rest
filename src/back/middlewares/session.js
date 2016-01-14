'use strict';

var Promise = require('bluebird');
var uid = require('uid-safe');

module.exports = session;
module.exports.MemoryStore = MemoryStore;

/**
 * Adds a session handler to the express router. It checks for
 * the `X-Session-Token` header and inject the corresponding session on the
 * request.
 * @name module:back4app-rest.middlewares#session
 * @function
 */
function session(options) {
  /* Parse options */
  var opts = options || {};
  var store = opts.store || new MemoryStore();

  /* Define middleware */
  return function (req, res, next) {
    var sid = req.get('X-Session-Token');

    // no session
    if (sid === undefined) {
      next();
      return;
    }

    store.get(sid)
      .then(function (session) {
        // check if session is valid
        if (session === undefined) {
          res.status(401).json({
            code: 117,
            error: 'Invalid Session Token'
          });
          return;
        }

        // place session on request, since it is ok
        req.session = session;
        next();
      })
      .catch(function () {
        res.status(401).json({
          code: 117,
          error: 'Invalid Session Token'
        });
      });
  };
}

/* MemoryStore */

function MemoryStore() {
  this.sessions = {};
}

MemoryStore.prototype.create = function (req, userId) {
  var self = this;
  return uid(24)
    .then(function (sid) {
      var session = req.session = {token: sid, userId: userId};
      self.sessions[sid] = session;
      return session;
    });
};

MemoryStore.prototype.destroy = function (sid) {
  var session = this.sessions[sid];
  delete this.sessions[sid];
  return Promise.resolve(session);
};

MemoryStore.prototype.get = function (sid) {
  var session = this.sessions[sid];
  return Promise.resolve(session);
};
