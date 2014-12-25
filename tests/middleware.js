"use strict";

var testReq = require('./setup');


module.exports = new Promise (function (resolve) {
	testReq
		.get('/middleware/')
		.expect(200)
		.expect(function (res) {
			if (Number(res.headers["a-number"]) === 3) {
				return;
			} else {
				throw Error("Expected header to equal 3 it was " + res.headers["a-number"]);
			}
		})
		.end(function(err){
			if (err) throw err;
			resolve();
		});
});