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
var testReq = request(proxy.httpMiddleware);

testReq
	.get('/static/index.html')
	.expect(200)
	.end(function(err, res){
		if (err) throw err;
	});

testReq
	.get('/static/index2.html')
	.expect(404)
	.end(function(err, res){
		if (err) throw err;
	});

testReq
	.get('/redirect/index.html')
	.expect(302)
	.end(function(err, res){
		if (err) throw err;
	});

testReq
	.get('/proxy/')
	.expect(200)
	.expect(function (res) {
		return res.headers["A-Proxied-Request"];
	})
	.end(function(err, res){
		if (err) throw err;
	});

testReq
	.get('/middleware/')
	.expect(200)
	.expect(function (res) {
		return;
	})
	.end(function(err, res){
		if (err) throw err;
	});

setTimeout(function () {

	// Test that static works once a server has been instantiated
	testReq
		.get('/static/index.html')
		.expect(200)
		.end(function(err, res){
			if (err) throw err;
		});
}, 100);