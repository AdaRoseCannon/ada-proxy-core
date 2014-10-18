'use strict';

/**
 * Dependencies.
 */

var jobs = require('./jobs');
var https = require('https');
var EventEmitter = require('events').EventEmitter;
var logRequest = require('./log');

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

			if (testPath.match(new RegExp(item.pattern))) {

				if (item.type === 'proxy') {
					logRequest(req, 'routing to:', item.target);
					options.proxy.web(req, res, {
						target: item.target
					});
				}
				return;
			}
		}

		res.writeHead(500, {
			'Content-Type': 'text/plain'
		});
		res.end('No matching https routes.');

	}).listen(options.https_port);
	return eventEmitter; 
};