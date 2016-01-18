'use strict';

/**
 * Adds an error handler to the express router. It returns
 * the message and error code.
 * @name module:back4app-rest.middlewares#error
 * @function
 */
function error() {
  /* Define middleware */
  return function (err, req, res, next) {
    if (!err) {
      next();
    } else {
      if (err instanceof SyntaxError) {
        // malformed JSON on body
        res.status(400).json({
          code: 102,
          error: 'Invalid JSON'
        });
      } else {
        res.status(500).json({
          code: 1,
          error: 'Internal Server Error'
        });
      }
    }
  };
}

module.exports = error;
