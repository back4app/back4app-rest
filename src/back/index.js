/**
 * Contains implementation of REST API for back{4}app.
 * @module back4app-rest
 */
var entities = require('./entities');
var middlewares = require('./middlewares');
var securityRouter = require('./securityRouter');

module.exports = {};
module.exports.entities = entities;
module.exports.middlewares = middlewares;
module.exports.securityRouter = securityRouter;
