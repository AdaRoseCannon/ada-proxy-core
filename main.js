'use strict';

var forever = require('forever');

forever.start('./proxy.js', {});

setTimeout(function () {
	forever.list(true, function () {
		console.log(arguments);
	});
}, 2000);


setTimeout(function () {
	console.log('finishing');
	forever.stopAll();
}, 5000);
