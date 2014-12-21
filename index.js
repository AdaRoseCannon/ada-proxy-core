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
var http = require('http');

module.exports = function(optionsIn, jobsArray) {
	var self = new EventEmitter();
	options = options.init(optionsIn);
	var handler = require('./lib/req-handler');

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

	require('./lib/events')
		.on('update', function (item) {
			deploy(item, function () {
				self.emit('updated', item);
			});
		})
		.on('return', function (req, res, item) {
			self.emit('return', req, res, item);
		});


	self.httpMiddleware = function (req, res, next) {
		handler(req, res, next, false);
	}

	self.httpsMiddleware = function (req, res, next) {
		handler(req, res, next, true);
	}

	self.updateJobs = jobs.setArray;

	if (options.ssl_options && options.https_port) {
		var server = options.spdy ? require('spdy') : require('https');
		server.createServer(options.ssl_options, self.httpsMiddleware).listen(options.https_port);
		console.log("listening for https on", options.https_port);
	}

	if (options.port) {
		console.log("listening for http on", options.port);
		http.createServer(self.httpMiddleware).listen(options.port);
	}

	return self;
};
