'use strict';

var path = require('path');

var i = 0;
function middlewareFunc(req, res, next) {
	setTimeout(function () {
		console.log("Setting header to", ++i);
		res.setHeader('A-Number', i);
		if (i === 3) {
			res.end("Counted to " + i);
		}
		next();
	}, 500);
}

module.exports = [{
	invalid: "entry",
	this: "should",
	be: "ignored"
},{
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
	comment: "Simple middleware this ends the request"
},{
	pattern: "/middleware/(.*)",
	type: "middleware",
	middleware: function () {
		console.log('doing what musn\'t be done');
		throw Error("This should not be run");
	},
	comment: "Simple middleware this ends the request"
}];
