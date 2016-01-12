'use strict';

/**
 * Adds a 404 Not Found handler to the express router. It returns
 * the message and error code.
 * @name module:back4app-rest.middlewares#notfound
 * @function
 */
function notfound() {
  return function (req, res) {
    res.status(404).json({
      code: 121,
      error: 'URL Not Found'
    });
  };
}

module.exports = notfound;
