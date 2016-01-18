'use strict';

/**
 * Adds an authentication handler to the express router. It checks for
 * the `X-Access-Token` header and compares with the given token.
 * @name module:back4app-rest.middlewares#authentication
 * @function
 */
function authentication(options) {
  /* Parse options */
  var opts = options || {};
  var accessToken = opts.accessToken || null;

  /* Define middleware */
  return function (req, res, next) {
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
  };
}

module.exports = authentication;
