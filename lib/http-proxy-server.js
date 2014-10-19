'use strict';

/**
 * Dependencies.
 */

var invokeHandler = require('github-webhook-handler');
var jobs = require('./jobs');
var http = require('http');
var exec = require('child_process').exec;
var EventEmitter = require('events').EventEmitter;
var logRequest = require('./log');

module.exports = function (options) {

	var eventEmitter = new EventEmitter();
	var jobsArray = jobs.getJobs();
	var jobsLength = jobs.getLength();
	var handler = invokeHandler({ path: '/', secret: options.gitSecret });

	handler.on('push', function(event) {
		console.log('Received a push event for %s to %s', event.payload.repository.name, event.payload.ref);
		if (event.payload.repository.url === options.repoURL) {
			if (event.payload.ref === (options.repoRef || "refs/heads/master")) {
				eventEmitter.emit('updateself');
			}
		} else {

			// It needs to update one of the programs being run by forever
			var jobsLength = jobsArray.length;
			for (var i = 0; i < jobsLength; i++) {
				var item = jobsArray[i];
				if (item.deploy && event.payload.repository.url === item.deploy.watch) {
					eventEmitter.emit('update', item);
				}
			}
		}
	});

	/**
	 * Handle http redirects and proxy
	 */
	http.createServer(function httpServer(req, res) {

		var testPath = 'http://' + req.headers.host;
		if (testPath.match(new RegExp(options.githookURL, "gi"))) {
			handler(req, res, function (err) {
				res.statusCode = 404;
				res.end('no such location');
				res.end(err);
			});
			return;
		}

		for (var i=0;i<jobsLength;i++) {
			var item = jobsArray[i];
			if(item.https) {
				continue;
			}

			if (testPath.match(new RegExp(item.pattern, "gi"))) {
				switch(item.type) {

					case 'run':
						var run = exec(item.command, {
							cwd: item.workingDir
						});
						run.on('close', function (code) {
							if (!code) {
								console.log('Ran', item.name, 'successfully');
							} else {
								console.log('Failed to run', item.name);
							}
						});
						break;

					case 'redirect':
						logRequest(req, 'redirecting to:', item.target);
						res.statusCode = 302;
						res.setHeader('Location', item.target);
						res.end();
						return;

					case 'proxy':
						logRequest(req, 'routing to:', item.target);
						options.proxy.web(req, res,{
							target: item.target
						});
						return;

					case 'static':
						logRequest(req, 'Serving static folder:', item.target);
						item.server.serve(req, res);
						return;
				}

				return;
			}
		}

		res.writeHead(500, {
			'Content-Type': 'text/plain'
		});
		res.end('No matching http routes.');

	}).listen(options.port);
	return eventEmitter; 
};