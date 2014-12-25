"use strict";

var testReq = require('./setup');



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
