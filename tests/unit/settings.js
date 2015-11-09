var settings = require('@back4app/back4app-entity').settings;
var MongoAdapter = require('@back4app/back4app-entity-mongodb').MongoAdapter;

settings.ADAPTERS = {
  default: new MongoAdapter('mongodb://127.0.0.1:27017/test')
};
