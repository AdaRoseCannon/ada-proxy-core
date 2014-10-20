'use strict';

/**
 * Dependencies.
 */

var invokeHandler = require('github-webhook-handler');
var jobs = require('./jobs');
var http = require('http');
var EventEmitter = require('events').EventEmitter;
var reqHandler = require('./req-handler');
var url = require('url');

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

		// Check to see if it is goint to the githooks url
		var incomingUrl = url.parse(req.url);
		var testPath = url.format({
			protocol: 'http',
			host: req.headers.host,
			pathname: incomingUrl.pathname,
			search: incomingUrl.query
		});

		if (testPath.match(new RegExp(options.githookURL, "gi"))) {
			handler(req, res, function (err) {
				res.statusCode = 404;
				res.end('no such location');
				res.end(err);
			});
			return;
		}

		// See if it matches any of the jobs
		for (var i=0;i<jobsLength;i++) {
			var item = jobsArray[i];

			// If the job is https then skip it
			if(item.https) {
				continue;
			}

			// otherwise see if the route matches a request.
			if (reqHandler(req, res, testPath, item, options)) return;
		}

		// if no matching routes were found return an error
		res.writeHead(500, {
			'Content-Type': 'text/plain'
		});
		res.end('No matching http routes.');

	}).listen(options.port);
	return eventEmitter; 
};