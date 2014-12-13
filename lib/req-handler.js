'use strict';
/* globals Promise*/

var exec = require('child_process').exec;
var logRequest = require('./log');
var staticFolder = require('./static');
var url = require('url');
var jobs = require('./jobs');
var eventEmitter = require('./events');
var invokeHandler = require('github-webhook-handler');
var extend = require('util')._extend;

var options = require('./options').get();
var jobsArray = jobs.getJobs();
var jobsLength = jobs.getLength();

var handler = invokeHandler({ path: options.gitHooks.path || '/', secret: options.gitHooks.secret });

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
		headers = headers || {};
		var ct = (headers && typeof headers['Content-Type'] === 'string' && headers['Content-Type']) ||
			res.getHeader('content-type') ||
			false;
		if (options.noAppcache && ct === 'text/cache-manifest' || !ct && req.url.match(/\.appcache(\?.*)?(#.*)?$/)) {
			headers['Content-Type'] = "text/plain";
			res.oldWriteHead(403, headers);
			res.writeHead = res.oldWriteHead;
			res.end('Appcache Denied');
			console.log('denying appcache');
		} else {
			res.oldWriteHead(statusCode, headers);
		}
	};

	var incomingUrl = unescape(url.parse(req.url));
	var assembledUrl = url.format({
		protocol: https ? 'https' : 'http',
		host: req.headers.host,
		pathname: incomingUrl.pathname,
		search: incomingUrl.query
	});


	if (assembledUrl.match(new RegExp(options.gitHooks.url, "gi"))) {
		handler(req, res, function () {
			res.statusCode = 500;
			res.end("Invalid Githook path");
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

			if (!map[i]) {
				map[i] = "";
			}
			// Replace {{1}} with the first bracket contents etc
			processedTarget = processedTarget.replace(str, String(map[i]));
		});
	}

	return processedTarget;
}

function handleReq(req, res, url, item) {
	var item = extend({}, item);
	var matches = url.match(new RegExp(item.pattern, "i"));

	// if no match return false.
	if( !matches ) {
		return false;
	}
	
	if (item.target) {
		item.target = replaceParts(item.target, matches);
	}

	if (item.rewriteURL) {
		req.url = replaceParts(item.rewriteURL, matches);
	}

	item.url = req.url;

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
			return Promise.resolve(item);

		case 'proxy':
			logRequest(req, 'routing to:', item.target);
			options.proxy.web(req, res,{
				target: item.target
			});
			return Promise.resolve(item);

		case 'static':
			logRequest(req, 'Serving static folder:', item.target);
			return staticFolder(req, res, item.target).then(function () {
				return item;
			});

		/**
		 * Emit an event 
		 */
		case 'return':
			eventEmitter.emit('return', req, res, item);
			return Promise.resolve(true);
	}
	return false;
}

