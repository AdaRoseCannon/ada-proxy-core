'use strict';
var jobs = require('./jobs');
var jobsArray = jobs.getJobs();
var jobsLength = jobs.getLength();
var exec = require('child_process').exec;
var logRequest = require('./log');
var staticFolder = require('./static');
var extend = require('util')._extend;

module.exports = function (req, res, url) {
	var routeHandled = false;
	for (var i = 0; i < jobsLength && !routeHandled; i++) {
		var item = jobsArray[i];
		routeHandled = routeHandled || !!processUrl(req, res, url, item);
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

/**
 * Processes the depending on the item given. Todo replace with iterator.
 * @param  {[type]}   req      Node request object
 * @param  {[type]}   res      Node response object
 * @param  {[type]}   url      Full url inclding protocol e.g. "http://example.com/index.html"
 * @param  {[type]}   item     Task to fullfill
 * @param  {Function} callback callback with a promise for the item
 * @return {[type]}            Returns true if the request is now finished with. I.e. res.end() will be called.
 */
function processUrl (req, res, url, itemIn) {
	var item = extend({}, itemIn);
	var matches = url.match(new RegExp(item.pattern, "i"));

	console.log(url, item.pattern);

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
			if (typeof item.middleware === "function") {
				callback(new Promise(function (resolve, reject) {
					item.middleware(req, res, resolve);
				}));
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

