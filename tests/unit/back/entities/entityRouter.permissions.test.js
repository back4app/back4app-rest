'use strict';

var http = require('http');

var expect = require('chai').expect;
var mongodb = require('mongodb');
var express = require('express');
var Promise = require('bluebird');
var entity = require('@back4app/back4app-entity');
var Entity = entity.models.Entity;

var entityRouter = require('../../../../').entities.entityRouter;
var securityRouter = require('../../../../').securityRouter;
var MemoryStore = require('../../../../').middlewares.session.MemoryStore;

// setup tests settings
require('../../settings');

// util functions
function fetchJSON(path, headers) {
  return new Promise(function (resolve, reject) {
    var options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: path,
      headers: {
        'X-Access-Token': 'test_access_token'
      }
    };

    headers = headers || {};
    if (headers.sessionToken !== undefined) {
      options.headers['X-Session-Token'] = headers.sessionToken;
    }

    http.get(options, function (res) {
      var body = '';

      res.setEncoding('utf8');

      res.on('data', function (chunk) {
        body += chunk.toString();
      });

      res.on('end', function () {
        res.body = body;
        try {
          res.json = JSON.parse(body);
        } catch (e) {
          // invalid JSON, do nothing
        }
        resolve(res);
      });
    }).on('error', function (err) {
      reject(err);
    });
  });
}

function _delete(path, headers) {
  return new Promise(function (resolve, reject) {
    var options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: path,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': 'test_access_token'
      }
    };

    headers = headers || {};
    if (headers.sessionToken !== undefined) {
      options.headers['X-Session-Token'] = headers.sessionToken;
    }

    var req = http.request(options, function (res) {
      var body = '';

      res.setEncoding('utf8');

      res.on('data', function (d) { body += d; });

      res.on('end', function () {
        res.body = body;
        try {
          res.json = JSON.parse(body);
        } catch (e) {
          // invalid JSON, do nothing
        }
        resolve(res);
      });
    });
    req.on('error', function (err) {
      reject(err);
    });
    req.end();
  });
}

function update(postData, path, headers) {
  return new Promise(function (resolve, reject) {
    var options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: path,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': 'test_access_token'
      }
    };

    headers = headers || {};
    if (headers.sessionToken !== undefined) {
      options.headers['X-Session-Token'] = headers.sessionToken;
    }

    var req = http.request(options, function (response) {
      var body = '';
      response.on('error', function (err) {
        reject(err);
      });
      response.on('data', function (d) { body += d; });
      response.on('end', function () {
        response.body = body;
        try {
          response.json = JSON.parse(body);
        } catch (e) {
          // invalid JSON, do nothing
        }
        resolve(response);
      });
    });
    req.write(postData);
    req.end();
  });
}

function login(username, password) {
  return new Promise(function (resolve, reject) {
    var postData = JSON.stringify({
      username: username,
      password: password
    });

    var options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'X-Access-Token': 'test_access_token'
      }
    };

    var req = http.request(options, function (res) {
      var body = '';

      res.setEncoding('utf8');

      res.on('data', function (chunk) {
        body += chunk.toString();
      });

      res.on('end', function () {
        res.body = body;
        try {
          res.json = JSON.parse(body);
        } catch (e) {
          // invalid JSON, do nothing
        }
        resolve(res);
      });
    });

    req.on('error', function (err) {
      reject(err);
    });

    // write data to request body
    req.write(postData);
    req.end();
  });
}

describe('entityRouter', function () {
  // back4app Entity
  var Post = Entity.specify({
    name: 'Post',
    attributes: {
      text: {type: 'String'},
      picture: {type: 'Boolean'}
    }
  });

  var Account = Entity.specify({
    name: 'Account',
    attributes: {
      name: {type: 'String'}
    }
  });

  // entity JSON objects
  // Posts
  var post1 = {
    id: 'e8e5532c-8444-4a02-bc31-2a18b2fae9b7',
    Entity: 'Post', text: 'Hello World!', picture: true,
    permissions: {
      '7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {read: true, write: true}
    }
  };

  var post2 = {
    id: '924f8e4c-56f1-4eb9-b3b5-f299ded65e9d', Entity: 'Post',
    text: 'Hello NodeJS!', picture: false, permissions: null
  };

  var post3 = {
    id: '15358f84-cc88-4147-8f85-9c09cdad9cf7', Entity: 'Post',
    text: 'Hello AngularJS!', picture: false,
    permissions: {'*': {read: true}}
  };

  //Accounts
  var account1 = {
    id: '45018660-d0cc-43d4-8152-bd8bb1f38e37',
    Entity: 'Account', name: 'Account1',
    permissions: {'7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {read: true}}
  };

  var account2 = {
    id: 'c94d55cc-013c-4359-bc48-6b6839220f00',
    Entity: 'Account', name: 'Account2',
    permissions: {
      '7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {read: true},
      '*': {write: true}
    }
  };

  var updatedPost1 = {
    id: 'fb23fd0c-3553-4e3b-b8ea-fa0d6b04de9d',
    Entity: 'Post', text: 'Written by user1!', picture: false,
    permissions: {
      '7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {
        read: true,
        write: true
      }
    }
  };

  var updatedPost2 = {
    id: '924f8e4c-56f1-4eb9-b3b5-f299ded65e9d',
    Entity: 'Post', picture: false, text: 'Written by anyone!',
    permissions: null
  };

  var updatedPost3 = {
    id: 'e5d30ee6-156a-4710-b6e9-891fd19d02c0',
    Entity: 'Post', picture: true, text: 'Anyone can modify, except user1',
    permissions: {
      '7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {},
      '*': {
        read: true,
        write: true
      }
    }
  };

  // testing vars
  var mongoAdapter;
  var db;
  var server;

  // setup
  before(function () {
    return Promise.all([
      openConnections(),
      startAPI()
    ]);
  });

  function openConnections() {
    // get entity mongo adapter instance
    mongoAdapter = entity.settings.ADAPTERS.default;

    // create connection to MongoDB
    var url = 'mongodb://127.0.0.1:27017/test';
    return mongodb.MongoClient.connect(url)
        .then(function (database) {
          db = database;
        });
  }

  function populateDatabase() {
    return Promise.all([
      db.collection('Post').insertMany([
        {Entity: 'Post', _id: 'e8e5532c-8444-4a02-bc31-2a18b2fae9b7',
          text: 'Hello World!', picture: true,
          permissions: {
            '7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {read: true, write: true}
          }
        },
        {Entity: 'Post', _id: '4d0e9795-c692-4b0f-b9c1-8ddeece6aa8b',
          text: 'Hello Back{4}app!', picture: true,
          permissions: {'842120bd-54d8-4dc2-8c54-788883ac969e': {}}
        },
        {Entity: 'Post', _id: '924f8e4c-56f1-4eb9-b3b5-f299ded65e9d',
          text: 'Hello NodeJS!', picture: false
        },
        {Entity: 'Post', _id: '15358f84-cc88-4147-8f85-9c09cdad9cf7',
          text: 'Hello AngularJS!', picture: false,
          permissions: {'*': {read: true}}
        }
      ]),
      db.collection('Account').insertMany([
        {Entity: 'Account', _id: '45018660-d0cc-43d4-8152-bd8bb1f38e37',
          name: 'Account1',
          permissions: {'7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {read: true}}
        },
        {Entity: 'Account', _id: 'c94d55cc-013c-4359-bc48-6b6839220f00',
          name: 'Account2',
          permissions: {
            '7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {read: true},
            '*': {write: true}
          }
        },
        {Entity: 'Account', _id: '827b625a-80ed-4f35-b843-12958fdafa81',
          name: 'Account3', permissions: {'*': {}}
        }
      ]),
      db.collection('User').insertMany([
        {Entity: 'User', _id: '7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c',
          username: 'user1',
          // hash for password 'pass1'
          password:
            '$2a$10$/XqpCd8IxSufU/O3nsyWT.YsEgHiHL7eX89ywTe8oP6YNbjDqhIeW',
          permissions: {
            '7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {
              read: true,
              write: true
            }
          }
        },
        {Entity: 'User', _id: '2a91cb40-4344-43b0-899f-ec429e3ad384',
          username: 'user2',
          // hash for password 'pass2'
          password:
              '$2a$10$y.adCtFIYklkSkyDv8CMB.QgoB975rHP8v0wCiXP34CndKnsPIime',
          permissions: {
            '2a91cb40-4344-43b0-899f-ec429e3ad384': {
              read: true,
              write: true
            }
          }
        }
      ])
    ]);
  }

  function startAPI() {
    var entities = {Post: Post, Account: Account};
    var token = 'test_access_token';
    var store = new MemoryStore();

    var router = entityRouter({
      entities: entities,
      accessToken: token,
      store: store
    });

    var security = securityRouter({
      accessToken: token,
      store: store
    });

    var app = express();
    app.use('/entities', router);
    app.use('/', security);
    server = app.listen(3000);
  }

  // tear down
  after(function () {
    return Promise.all([
      stopAPI(),
      clearDatabase().then(closeConnections)
    ]);
  });

  function stopAPI() {
    server.close();
  }

  function clearDatabase() {
    return db.dropDatabase();
  }

  function closeConnections() {
    return Promise.all([
      mongoAdapter.closeConnection(),
      db.close()
    ]);
  }

  beforeEach(function () {
    return populateDatabase();
  });

  afterEach(function () {
    return clearDatabase();
  });

  // test cases
  describe.skip('GET /:entity/:id/', function () {
    it('should get entity by id because this user has permission', function () {
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Post/e8e5532c-8444-4a02-bc31-2a18b2fae9b7/';
          return fetchJSON(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals(post1);
        });
    });

    it('should return 403 code because the user does not have permission',
        function () {
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Post/4d0e9795-c692-4b0f-b9c1-8ddeece6aa8b/';
          return fetchJSON(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(403);
          expect(res.json).to.be.deep.equals({
            code: 118,
            error: 'Operation Forbidden'
          });
        });
    });

    it('should return 403 code because entity is not public', function () {
      return fetchJSON('/entities/Post/4d0e9795-c692-4b0f-b9c1-8ddeece6aa8b/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(403);
          expect(res.json).to.be.deep.equals({
            code: 118,
            error: 'Operation Forbidden'
          });
        });
    });

    it('should get entity by id because this instance has public permission',
        function () {
      return fetchJSON('/entities/Post/924f8e4c-56f1-4eb9-b3b5-f299ded65e9d/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals(post2);
        });
    });

    it('should return 403 because no one have read permission', function () {
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Account/827b625a-80ed-4f35-b843-12958fdafa81/';
          return fetchJSON(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(403);
        });
    });

    it('should return 403 because no one have read permission', function () {
      return login('user2', 'pass')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Account/827b625a-80ed-4f35-b843-12958fdafa81/';
          return fetchJSON(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(403);
        });
    });

  });

  describe.skip('GET /:entity/', function () {
    it('should return only posts user1 has permission', function () {
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Post/';
          return fetchJSON(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          // the result was sorted by {id: 1}
          expect(res.json).to.be.deep.equals({results: [post3, post2, post1]});
        });
    });

    it('should return only posts user2 has permission', function () {
      return login('user2', 'pass2')
          .then(function (res) {
            return res.json.sessionToken;
          })
          .then(function (sessionToken) {
            var url = '/entities/Post/';
            return fetchJSON(url, {sessionToken: sessionToken});
          })
          .then(function (res) {
            expect(res.statusCode).to.be.equals(200);
            // the result was sorted by {id: 1}
            expect(res.json).to.be.deep.equals({results: [post3, post2]});
          });
    });

    it('should return only accounts user1 has permission', function () {
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Account/';
          return fetchJSON(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals({results: [account1, account2]});
        });
    });

    it('should return empty list because user2 has permission to anyone',
        function () {
      return login('user2', 'pass2')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Account/';
          return fetchJSON(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals({results: []});
        });
    });

  });

  describe('UPDATE /:entity/:id', function () {

    var TableLeg = Entity.specify({
      name: 'TableLeg',
      attributes: {
        legs: {type: 'Number'}
      }
    });

    var Table = Entity.specify({
      name: 'Table',
      attributes: {
        tableLegs: {type: 'TableLegs', multiplicity:'*', default: undefined }
      }
    });


    beforeEach(function () {
      return db.collection('Post').insertMany([
          {Entity: 'Post', _id: 'fb23fd0c-3553-4e3b-b8ea-fa0d6b04de9d',
            text: 'Written by user1', picture: true,
            permissions: {'7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {
              read: true,
              write: true
            }}
          },
          {Entity: 'Post', _id: 'e5d30ee6-156a-4710-b6e9-891fd19d02c0',
            text: 'Hello South America!', picture: false,
            permissions: {
              '7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {},
              '*': {
                read: true,
                write: true
              }
            }
          }
        ]);
    });

    it.only('should update Entity because this user has permission', function () {
      var updatedData = JSON.stringify({
        text: 'Written by user1!',
        picture: false
      });
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Post/fb23fd0c-3553-4e3b-b8ea-fa0d6b04de9d/';
          return update(updatedData, url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals(updatedPost1);
        });
    });

    it('should return 403 code because the user does not have permission',
      function () {
        var updatedData = JSON.stringify({
          text: 'Written by user1!',
          picture: false
        });
        return login('user1', 'pass1')
          .then(function (res) {
            return res.json.sessionToken;
          })
          .then(function (sessionToken) {
            var url = '/entities/Post/4d0e9795-c692-4b0f-b9c1-8ddeece6aa8b/';
            return update(updatedData, url, {sessionToken: sessionToken});
          })
          .then(function (res) {
            expect(res.statusCode).to.be.equals(403);
            expect(res.json).to.be.deep.equals({
              code: 118,
              error: 'Operation Forbidden'
            });
          });
      });

    it('should return 403 code because entity is not public', function () {
      var updatedData = JSON.stringify({
        text: 'Written by anyone!',
        picture: false
      });
      return update(updatedData,
        '/entities/Post/4d0e9795-c692-4b0f-b9c1-8ddeece6aa8b/')
        .then(function (res) {
          expect(res.statusCode).to.be.equals(403);
          expect(res.json).to.be.deep.equals({
            code: 118,
            error: 'Operation Forbidden'
          });
        });
    });

    it('should get entity by id because this instance has public permission',
      function () {
        var updatedData = JSON.stringify({
          text: 'Written by anyone!',
          picture: false
        });
        return update(updatedData,
          '/entities/Post/924f8e4c-56f1-4eb9-b3b5-f299ded65e9d/')
          .then(function (res) {
            expect(res.statusCode).to.be.equals(200);
            expect(res.json).to.be.deep.equals(updatedPost2);
          });
      }
    );

    it('"*": should get entity by id because this instance has public' +
      ' permission',
      function () {
        var updatedData = JSON.stringify({
          text: 'Anyone can modify, except user1',
          picture: true
        });
        return update(updatedData,
          '/entities/Post/e5d30ee6-156a-4710-b6e9-891fd19d02c0/')
          .then(function (res) {
            //expect(res.statusCode).to.be.equals(200);
            expect(res.json).to.be.deep.equals(updatedPost3);
          });
      }
    );

    it('"*": should return 403 code because the user does not have permission',
      function () {
        var updatedData = JSON.stringify({
          text: 'I CANT WRITE!',
          picture: false
        });
        return login('user1', 'pass1')
          .then(function (res) {
            return res.json.sessionToken;
          })
          .then(function (sessionToken) {
            var url = '/entities/Post/e5d30ee6-156a-4710-b6e9-891fd19d02c0/';
            return update(updatedData, url, {sessionToken: sessionToken});
          })
          .then(function (res) {
            expect(res.statusCode).to.be.equals(403);
            expect(res.json).to.be.deep.equals({
              code: 118,
              error: 'Operation Forbidden'
            });
          });
      });

    it('should update User\'s password', function () {
      var updatedData = JSON.stringify({
        password: 'changedPassword'
      });
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/User/7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c';
          return update(updatedData, url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);

          expect(res.json.id).to.be.equals('7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c');
          expect(res.json.username).to.be.equals('user1');

          // password must be stored as hash
          var hashedPass = res.password;
          expect(hashedPass).to.not.be.equals('changedPassword');
          expect(hashedPass).to.not.be.equals('pass1');
        });
    });

    it('should update Entity\'s instance permission', function () {
      var updatedData = JSON.stringify({
        text: 'Written by user1', picture: true,
        permissions: {
          '7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {
            read: true,
            write: true
          },
          '*': {read: true}
        }
      });

      var updatedPost =
      {Entity: 'Post', id: 'fb23fd0c-3553-4e3b-b8ea-fa0d6b04de9d',
          text: 'Written by user1', picture: true,
          permissions: {'7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {
            read: true,
            write: true
          },
            '*': {read: true}
          }
      };
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Post/fb23fd0c-3553-4e3b-b8ea-fa0d6b04de9d';
          return update(updatedData, url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json).to.be.deep.equals(updatedPost);
      });
    });

    it('should update an Entity\'s instance that has id as an object' +
        'when it is an association', function () {
      var updatedData = JSON.stringify({
        text: 'Hello South America!',
        picture: false,
        account: account1,
        permissions: {
          '7184c4b9-d8e6-41f6-bc89-ae2ebd1d280c': {},
          '*': {
            read: true,
            write: true
          }
        }
      });

      var url = '/entities/Post/e5d30ee6-156a-4710-b6e9-891fd19d02c0';
      return update(updatedData, url)
        .then(function (res) {
          expect(res.statusCode).to.be.equals(200);
          expect(res.json.account.id).to.equal('45018660-d0cc-43d4-8152-bd8bb1f38e37');
          expect(res.json.account.Entity).to.equal('Account');
        });
    });
  });

  describe.skip('DELETE /entity/:id', function () {
    it('should return status 204 because user has write permission',
        function () {
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Post/e8e5532c-8444-4a02-bc31-2a18b2fae9b7';
          return _delete(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(204);
          expect(res.body).to.be.deep.equals('');
        });
    });

    it('should return status 403 because user has no permission', function () {
      return login('user2', 'pass2')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Post/4d0e9795-c692-4b0f-b9c1-8ddeece6aa8b';
          return _delete(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(403);
          expect(res.json).to.be.deep.equals({
            code: 118,
            error: 'Operation Forbidden'
          });
        });
    });

    it('should return status 204 because entity has public permission',
        function () {
      return login('user2', 'pass2')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Post/924f8e4c-56f1-4eb9-b3b5-f299ded65e9d';
          return _delete(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(204);
          expect(res.body).to.be.deep.equals('');
        });
    });

    it('should return status 403 because entity has only public read ' +
        'permission', function () {
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Post/15358f84-cc88-4147-8f85-9c09cdad9cf7';
          return _delete(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(403);
          expect(res.json).to.be.deep.equals({
            code: 118,
            error: 'Operation Forbidden'
          });
        });
    });

    it('should return status 404 due to inexistent id', function () {
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Account/e8e5532c-8444-4a02-bc31-2a18b2fa1y2g';
          return _delete(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(404);
          expect(res.json).to.be.deep.equals({
            code: 123,
            error: 'Object Not Found'
          });
        });
    });

    it('should return status 403 because this user has no write permission' +
        ' preceding the public permission', function () {
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Account/c94d55cc-013c-4359-bc48-6b6839220f00';
          return _delete(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(403);
          expect(res.json).to.be.deep.equals({
            code: 118,
            error: 'Operation Forbidden'
          });
        });
    });

    it('should return status 204 because this user has write permission to' +
        ' this entity', function () {
      return login('user2', 'pass2')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Account/c94d55cc-013c-4359-bc48-6b6839220f00';
          return _delete(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(204);
          expect(res.body).to.be.deep.equals('');
        });
    });

    it('should return status 403 because no one has write permission to ' +
        'this entity', function () {
      return login('user1', 'pass1')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Account/827b625a-80ed-4f35-b843-12958fdafa81';
          return _delete(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(403);
          expect(res.json).to.be.deep.equals({
            code: 118,
            error: 'Operation Forbidden'
          });
        });
    });

    it('should return status 403 because no one has write permission to ' +
        'this entity', function () {
      return login('user2', 'pass2')
        .then(function (res) {
          return res.json.sessionToken;
        })
        .then(function (sessionToken) {
          var url = '/entities/Account/827b625a-80ed-4f35-b843-12958fdafa81';
          return _delete(url, {sessionToken: sessionToken});
        })
        .then(function (res) {
          expect(res.statusCode).to.be.equals(403);
          expect(res.json).to.be.deep.equals({
            code: 118,
            error: 'Operation Forbidden'
          });
        });
    });

  });
});
