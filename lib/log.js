'use strict';

var n=0;
module.exports = function logRequest(req) {
	var args = [];
	for (var i = 1; i < arguments.length; i++) {
		args.push(arguments[i]);
	}
	var message = args.join(" ");
	console.log(++n + ': ', req.headers.host, ':', message);
};