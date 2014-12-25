'use strict';

require('es6-promise').polyfill();

var request = require('supertest');
var express = require('express');
var app = express();

app.get('*', function(req, res){
	res.setHeader("A-Proxied-Request", "Is Proxied");
	res.end('hello world');
});

app.listen(8081);

var options = {
	port: 8080
};

var proxy = require('../') (options, require('./jobs.js'));
module.exports = request(proxy.httpMiddleware);