'use strict';

require('es6-promise').polyfill();

Promise.all([
	require('./middleware'),
	require('./proxy'),
	require('./redirect'),
	require('./static')
]).then(function () {
	console.log('Tests passed');
	process.exit();
}).catch(function (err) {
	throw err;
});