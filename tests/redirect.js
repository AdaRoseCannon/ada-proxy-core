"use strict";

var testReq = require('./setup');

module.exports = new Promise (function (resolve) {
	testReq
		.get('/redirect/index.html')
		.expect(302)
		.end(function(err){
			if (err) throw err;
			resolve();
		});
});