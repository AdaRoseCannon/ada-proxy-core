'use strict';

/**
 * Dependencies.
 */

var httpProxy = require('http-proxy');
var exec = require('child_process').exec;
var git = require('gift');
var jobs = require('./lib/jobs');
var EventEmitter = require('events').EventEmitter;
var options = require('./lib/options');
require('es6-promise').polyfill();

module.exports = function(optionsIn, jobsArray) {
	var eventEmitter = new EventEmitter();
	options = options.init(optionsIn);

	jobs.setArray(jobsArray);
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

	/**
	 * Local Variables
	 */

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

	/**
	 * Handling https proxy
	 */

	require('./lib/https-proxy-server')(options);
	require('./lib/http-proxy-server')(options);

	require('./lib/events')
		.on('update', function (item) {
			deploy(item, function () {
				eventEmitter.emit('updated', item);
			});
		})
		.on('return', function (req, res, item) {
			eventEmitter.emit('return', req, res, item);
		});

	console.log("listening for https on options.port ", options.https_port);
	console.log("listening for http on options.port ", options.port);

	/**
	 * Sync a folder using git & run install commands
	 * @return void
	 */
	function deploy(item, callback) {
		var repo = git(item.deploy.folder);
		repo.sync(function (err) {
			if (err) {
				console.log (err);
				return;
			}
			if (item.deploy.run) {
				var run = exec(item.deploy.run, {
					cwd: item.deploy.folder
				});
				run.on('close', function (code) {
					if (!code) {
						console.log('Updated', item.deploy.folder, 'successfully');
						if (callback) callback();
					} else {
						console.log('Deploy step failed.');
					}
				});
			}
		});
	}

	eventEmitter.updateJobs = jobs.setArray;
	return eventEmitter;
};
