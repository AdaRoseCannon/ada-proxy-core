'use strict';

var path = require('path');

var i = 0;
function middlewareFunc(req, res, next) {
	setTimeout(function () {
		console.log(++i);
		next();
	}, 500);
}

module.exports = [{
	pattern: "/static/(.*)",
	type: "static",
	rewriteURL: "/{{1}}",
	target: path.join(__dirname, 'testResources'),
	comment: "Simple static path"
},{
	pattern: "/redirect/(.*)",
	type: "redirect",
	target: "https://ada.is/{{1}}",
	comment: "Simple redirect"
},{
	type: "proxy",
	pattern: "/proxy/(.*)",
	target: "http://localhost:8081",
	comment: "Proxy to the test server"
},{
	pattern: "/middleware/(.*)",
	type: "middleware",
	middleware: middlewareFunc,
	comment: "Simple middleware"
},{
	pattern: "/middleware/(.*)",
	type: "middleware",
	middleware: middlewareFunc,
	comment: "Simple middleware"
},{
	pattern: "/middleware/(.*)",
	type: "middleware",
	middleware: middlewareFunc,
	comment: "Simple middleware"
},{
	pattern: "/middleware/(.*)",
	type: "static",
	rewriteURL: "/{{1}}",
	target: path.join(__dirname, 'testResources'),
	comment: "Simple Response"
}];
