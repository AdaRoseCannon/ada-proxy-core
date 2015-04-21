'use strict';
/* globals unescape */

var url = require('url');
var eventEmitter = require('./events');
var invokeHandler = require('github-webhook-handler');
var options = require('./options').get();
var jobs = require('./jobs');
var jobsArray = jobs.getJobs();
var jobsLength = jobs.getLength();
var JobGenerator = require('./jobGenerator');

if (options.gitHooks) {
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
}

module.exports = function (req, res, next, https) {
	reqHandler(req, res, https, function (p) {
		if (!p) {
			if (typeof next === 'function') {
				next();
				return;
			} else {
				console.log('No matching route for', unescape(req.url));
				res.writeHead(500, {
					'Content-Type': 'text/plain'
				});
				res.end('No matching http' + (https ? 's' : '' + ' routes.' + "\n"));
			}
		} else {
			p.then(function (item) {
				eventEmitter.emit('jobcomplete', req, res, item);
			}).catch(function (err) {
				console.log('An error has occured', err);
				res.writeHead(500, {
					'Content-Type': 'text/plain'
				});
				res.end('An error has occured', err.message, "/n");
			});
		}
	});
};

/**
 * [reqHandler description]
 * @param  {Object}   req      [description]
 * @param  {Object}   res      [description]
 * @param  {Boolean}   https    Whether https or not (for determining the protocol)
 * @param  {Function} callback returns a chain of promises
 * @return {void}
 */
function reqHandler(req, res, https, callback) {

	var incomingUrl = url.parse(unescape(req.url));
	var assembledUrl = url.format({
		protocol: https ? 'https' : 'http',
		host: req.headers.host,
		pathname: incomingUrl.pathname,
		search: incomingUrl.query
	});

	if (options.gitHooks && assembledUrl.match(new RegExp(options.gitHooks.url, "gi"))) {
		handler(req, res, function () {
			res.statusCode = 500;
			res.end("Invalid Githook path /n");
		});
		callback(false);
		return;
	}

	var jg = new JobGenerator(req, res, assembledUrl);
	function promiseRecursion () {
		var next = jg.next();
		next.promise.then(function () {
			if (!next.done) {
				promiseRecursion();
			} else {
				callback(next.promise);
			}
		}, function (err) {
			callback(next.promise.then(function () {
				throw err;
			}));
		});
	}
	promiseRecursion();
}
