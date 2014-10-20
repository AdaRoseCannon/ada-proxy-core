'use strict';

/**
 * Dependencies.
 */

var https = require('https');
var EventEmitter = require('events').EventEmitter;
var reqHandler = require('./req-handler');

module.exports = function (options) {

	var eventEmitter = new EventEmitter();

	/**
	 * Handle https proxy
	 */
	https.createServer(options.ssl_options, function(req, res) {

		reqHandler(req, res, true, options).then(function (item) {
			eventEmitter.emit(item);
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