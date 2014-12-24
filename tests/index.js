'use strict';

require('es6-promise').polyfill();

var request = require('supertest');

var options = {
	port: 8080
};

var proxy = require('../') (options, require('./jobs.js'));

request(proxy.httpMiddleware)
	.get('/static/index.html')
	.expect(200)
	.end(function(err, res){
		if (err) throw err;
	});

request(proxy.httpMiddleware)
	.get('/static/index2.html')
	.expect(404)
	.end(function(err, res){
		if (err) throw err;
	});

setTimeout(function () {
	request(proxy.httpMiddleware)
		.get('/static/index.html')
		.expect(200)
		.end(function(err, res){
			if (err) throw err;
		});
}, 100);