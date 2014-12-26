'use strict';

require('es6-promise').polyfill();

var request = require('supertest');

var options = {
	port: 8080
};

var proxy = require('../') (options, require('./jobs.js'));
module.exports = request(proxy.httpMiddleware);