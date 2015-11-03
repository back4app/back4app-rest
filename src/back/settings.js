/**
 * Contains all settings needed by the {@link module:back4app-rest} module.
 * @module back4app-rest/settings
 */
module.exports = {};

/**
 * Constant with the path to the User's Access Token. It will be
 * used to authenticate the access for App's API.
 * @type {!String}
 * @example
 * settings.ACCESS_TOKEN = 'ab49bc93f0e00847dab49bc93f0e00847d;
 */
module.exports.ACCESS_TOKEN = '';
/**
 * Constant with the path to the User's APP ID. It will be
 * used to access the App's API.
 * @type {!String}
 * @example
 * settings.APP_ID = 'ab49bc93f0e00847dab49bc93f0e00847d;
 */
module.exports.APP_ID = '';
/**
 * Constant with the path to the User's APP ID. It will be
 * used to access the App's API.
 * @type {!String}
 * @example
 * settings.APP_ID = {
 *   host: 'localhost',
 *   port: '3000'
 * };
 */
module.exports.CONNECTION = {
  host: '',
  port: ''
};
