'use strict';

var chai = require('chai');
var expect = chai.expect;
var http = require('http');
var express = require('express');
var app = express();

describe('express', function () {
  it('should start an server at localhost:3000',
    function (done) {
      app.get('/', function (req, res) {
        res.send('Hello World!');
      });

      var server = app.listen(3000, function () {
        var port = server.address().port;

        expect(port).to.equal(3000);

        http.get({
          host: 'localhost',
          port: '3000'
        }, function (response) {
          // Continuously update stream with data
          var body = '';
          response.on('data', function (d) {
            body += d;
          });
          response.on('end', function () {
            expect(body).to.equal('Hello World!');
            server.close();
            done();
          });
        });
      });
    });
});
