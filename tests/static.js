"use strict";

var testReq = require('./setup');

var p1 = new Promise(function (resolve) {
	testReq
		.get('/static/index2.html')
		.expect(404)
		.end(function(err){
			if (err) throw err;
			resolve();
		});
});

var p2 = new Promise(function (resolve) {
	testReq
		.get('/static/index.html')
		.expect(200)
		.end(function(err){
			if (err) throw err;
			resolve();
		});
});

var p3 = new Promise(function (resolve) {

	setTimeout(function () {

		// Test that static works once a server has been instantiated
		testReq
			.get('/static/index.html')
			.expect(200)
			.end(function(err){
				if (err) throw err;
				resolve();
			});
	}, 100);

});

module.exports = Promise.all([p1, p2, p3]);