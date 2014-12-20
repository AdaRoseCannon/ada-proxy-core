'use strict';

/**
 * Dependencies.
 */

require('es6-promise').polyfill();

var httpProxy = require('http-proxy');
var exec = require('child_process').exec;
var git = require('gift');
var jobs = require('./lib/jobs');
var EventEmitter = require('events').EventEmitter;
var options = require('./lib/options');
var deploy = require('./lib/deployFolder');

module.exports = function(optionsIn, jobsArray) {
	var eventEmitter = new EventEmitter();
	options = options.init(optionsIn);

	jobs.setArray(jobsArray);
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

	/**
	 * Local Variables
	 */

	options.ssl_options = options.ssl_options || false;

	options.proxy = httpProxy.createProxyServer({
		ssl: options.ssl_options,

		// SPDY-specific options
		windowSize: 1024,
		secure: false,
		hostnameOnly: true

	}).on('error', function (err, req, res) {
		if (res) {
			res.writeHead(500, {
				'Content-Type': 'text/plain'
			});
			res.write(err.message);
			res.end();
		}
		console.log(err);
	});

	if (options.ssl_options && options.https_port) {
		require('./lib/https-proxy-server')(options);
		console.log("listening for https on options.port ", options.https_port);
	}

	if (options.port) {
		require('./lib/http-proxy-server')(options);
		console.log("listening for http on options.port ", options.port);
	}

	require('./lib/events')
		.on('update', function (item) {
			deploy(item, function () {
				eventEmitter.emit('updated', item);
			});
		})
		.on('return', function (req, res, item) {
			eventEmitter.emit('return', req, res, item);
		});

	eventEmitter.updateJobs = jobs.setArray;
	return eventEmitter;
};
