'use strict';

var chai = require('chai');
var expect = chai.expect;
var API = require('../../');

describe('back4app-rest', function () {
  var api;

  after(function () {
    api.close();
  });

  it('should create the server', function (done) {
    api = new API();
    api.settings.CONNECTION.port = '3001';
    api.start().then(function (port) {
      expect(port).to.equal(3001);
      done();
    })
  });
});
