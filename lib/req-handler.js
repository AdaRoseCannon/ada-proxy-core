'use strict';
/* globals Promise*/

var exec = require('child_process').exec;
var logRequest = require('./log');
var staticFolder = require('./static');
var url = require('url');
var jobs = require('./jobs');
var eventEmitter = require('./events');
var invokeHandler = require('github-webhook-handler');

var options = require('./options').get();
var jobsArray = jobs.getJobs();
var jobsLength = jobs.getLength();

var handler = invokeHandler({ path: '/', secret: options.gitSecret });

handler.on('push', function(event) {
	console.log('Received a push event for %s to %s', event.payload.repository.name, event.payload.ref);
	for (var i = 0; i < jobsLength; i++) {
		var item = jobsArray[i];
		if (item.deploy && event.payload.repository.url === item.deploy.watch) {
			if (!item.ref || item.ref === event.payload.ref) {
				eventEmitter.emit('update', item);
			}
		}
	}
});

module.exports = function (req, res, https) {

	res.oldWriteHead = res.writeHead;
	res.writeHead = function(statusCode, headers) {
		console.log(res.getHeader('content-type'));
		res.oldWriteHead(statusCode, headers);
	};

	var incomingUrl = url.parse(req.url);
	var assembledUrl = url.format({
		protocol: https ? 'https' : 'http',
		host: req.headers.host,
		pathname: incomingUrl.pathname,
		search: incomingUrl.query
	});


	if (assembledUrl.match(new RegExp(options.githookURL, "gi"))) {
		handler(req, res, function (err) {
			res.statusCode = 404;
			res.end('no such location');
			res.end(err);
		});
		return Promise.resolve({
			type: "githook"
		});
	}

	for (var i=0;i<jobsLength;i++) {
		var item = jobsArray[i];
		item.https = (typeof item.https !== 'undefined') && item.https;
		if(https !== item.https) {
			continue;
		}
		var result = handleReq(req, res, assembledUrl, item, options);
		if (result !== false) {
			return result;
		}
	}
	return Promise.reject('No matching routes');
};

function replaceParts(stringToReplace, map) {

	var needsReplacement = stringToReplace.match(/{{\d+}}/gi);
	var processedTarget = stringToReplace;

	if (needsReplacement) {
		needsReplacement.forEach(function (str) {

			// Get the digit i.e. 1 from {{1}}
			var i = str.match(/{{(\d+)}}/)[1];

			if (map[i] !== undefined) {

				// Replace {{1}} with the first bracket contents etc
				processedTarget = processedTarget.replace(str, String(map[i]));
			}
		});
	}

	return processedTarget;
}

function handleReq(req, res, url, item) {
	var matches = url.match(new RegExp(item.pattern, "i"));

	// if no match return false.
	if( !matches ) {
		return false;
	}
	
	var processedTarget = replaceParts(item.target, matches);

	if (item.rewriteURL) {
		req.url = replaceParts(item.rewriteURL, matches);
	}

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
			logRequest(req, 'redirecting to:', processedTarget);
			res.statusCode = 302;
			res.setHeader('Location', processedTarget);
			res.end();
			return Promise.resolve(item);

		case 'proxy':
			logRequest(req, 'routing to:', processedTarget);
			options.proxy.web(req, res,{
				target: processedTarget
			});
			return Promise.resolve(item);

		case 'static':
			logRequest(req, 'Serving static folder:', processedTarget);
			return staticFolder(req, res, processedTarget).then(function () {
				return item;
			});

		/**
		 * Emit an event 
		 */
		case 'return':
	}
	return false;
}

