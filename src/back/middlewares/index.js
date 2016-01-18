/**
 * Contains implementation of REST API middlewares for back{4}app.
 * @module back4app-rest/middlewares
 */
var authentication = require('./authentication');
var error = require('./error');
var notfound = require('./notfound');
var session = require('./session');

module.exports = {};
module.exports.authentication = authentication;
module.exports.error = error;
module.exports.notfound = notfound;
module.exports.session = session;
