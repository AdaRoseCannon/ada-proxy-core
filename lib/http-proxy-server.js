'use strict';

/**
 * Dependencies.
 */

var http = require('http');
var eventEmitter = require('./events');
var reqHandler = require('./req-handler');
var options = require('./options').get();

module.exports = function () {

	http.createServer(function httpServer(req, res) {

		reqHandler(req, res, false, options).then(function (item) {
			eventEmitter.emit('jobcomplete', req, res, item);
		}).catch(function (e) {

			// if no matching routes were found return an error
			console.log(e);
			res.writeHead(500, {
				'Content-Type': 'text/plain'
			});
			res.end('No matching http routes.');
		});

	}).listen(options.port);
	return eventEmitter; 
};