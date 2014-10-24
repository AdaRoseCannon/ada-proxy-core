'use strict';

/**
 * Dependencies.
 */

var https = require('https');
var eventEmitter = require('./events');
var reqHandler = require('./req-handler');
var options = require('./options').get();

module.exports = function () {

	https.createServer(options.ssl_options, function(req, res) {

		reqHandler(req, res, true, options)
		.then(function (item) {
			eventEmitter.emit('jobcomplete', req, res, item);
		}).catch(function (err) {

			// if no matching routes were found return an error
			console.log(err);
			res.writeHead(500, {
				'Content-Type': 'text/plain'
			});
			res.end('No matching https routes.');
		});

	}).listen(options.https_port);
	return eventEmitter; 
};