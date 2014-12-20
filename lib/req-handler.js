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

module.exports = function (req, res, https, callback) {

	// Super horrible hacky best attempt to disable appcache
	// Cannot be relied on.
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

	var incomingUrl = url.parse(unescape(req.url));
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

	var promiseChain = Promise.resolve();
	function handleCallbackPromise(callbackPromise) {

		// Apend the callback promise to the promise chain.
		promiseChain.then(callbackPromise);
	}

	var routeHandled = false;
	for (var i=0;i<jobsLength && !routeHandled;i++) {
		var item = jobsArray[i];
		item.https = (typeof item.https !== 'undefined') && item.https;
		if(https !== item.https) {
			continue;
		}
		routeHandled = routeHandled || !!handleReq(req, res, assembledUrl, item, options, handleCallbackPromise);
	}
	if (!routeHandled) {
		callback(Promise.reject('No matching routes'));
	} else {
		callback(promiseChain);
	}
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

function handleReq(req, res, url, item, callback) {
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
			callback(new Promise(function (resolve, reject) {
				run.on('close', function (code) {
					if (!code) {
						console.log('Ran', item.name, 'successfully');
						resolve(item);
					} else {
						console.log('Failed to run', item.name);
						reject('Failed to run', item.name);
					}
				});
			}));
			break;

		case 'middleware':
			if (typeof item.function === "function") {
				item.function(req, res, function () {
					callback(Promise.resolve(item));
				});
			}
			break;

		case 'redirect':
			logRequest(req, 'redirecting to:', item.target);
			res.statusCode = 302;
			res.setHeader('Location', item.target);
			res.end();
			callback(Promise.resolve(item));
			return true;

		case 'proxy':
			logRequest(req, 'routing to:', item.target);
			options.proxy.web(req, res,{
				target: item.target
			});
			callback(Promise.resolve(item));
			return true;

		case 'static':
			logRequest(req, 'Serving static folder:', item.target);
			callback(staticFolder(req, res, item.target).then(function () {
				return item;
			}));
			return true;

		/**
		 * Emit an event 
		 */
		case 'return':
			eventEmitter.emit('return', req, res, item);
			callback(Promise.resolve(true));
			return true;
	}
}

