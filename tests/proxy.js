"use strict";

var testReq = require('./setup');
var express = require('express');
var app = express();

app.get('/proxy/', function(req, res){
	res.setHeader("A-Proxied-Request", "Is Proxied");
	res.end('hello world');
});

app.listen(8081);

module.exports = new Promise(function (resolve) {
	testReq
		.get('/proxy/')
		.expect(200)
		.expect(function (res) {
			return res.headers["A-Proxied-Request"];
		})
		.end(function(err){
			if (err) throw err;
			resolve();
		});
});
