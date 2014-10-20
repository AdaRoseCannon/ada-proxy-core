'use strict';

/**
 * Dependencies.
 */

var jobs = require('./jobs');
var https = require('https');
var EventEmitter = require('events').EventEmitter;
var reqHandler = require('./req-handler');

module.exports = function (options) {

	var eventEmitter = new EventEmitter();
	var jobsArray = jobs.getJobs();
	var jobsLength = jobs.getLength();

	/**
	 * Handle https proxy
	 */
	https.createServer(options.ssl_options, function(req, res) {

		var testPath = 'https://' + req.headers.host;
		for (var i=0;i<jobsLength;i++) {
			var item = jobsArray[i];
			if(!item.https) {
				continue;
			}

			if (reqHandler(req, res, testPath, item, options)) return;
		}

		// if no matching routes were found return an error
		res.writeHead(500, {
			'Content-Type': 'text/plain'
		});
		res.end('No matching https routes.');

	}).listen(options.https_port);
	return eventEmitter; 
};