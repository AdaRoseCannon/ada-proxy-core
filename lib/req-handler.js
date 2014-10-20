'use strict';
var exec = require('child_process').exec;
var logRequest = require('./log');
var staticFolder = require('./static');

module.exports = function (req, res, url, item, options) {

	var matches = url.match(new RegExp(item.pattern, "i"));

	// if no match return false.
	if( !matches ) {
		return false;
	}

	var needsReplacement = item.target.match(/{{\d+}}/gi);
	var processedTarget = item.target;

	if (needsReplacement) {
		needsReplacement.forEach(function (str) {

			// Get the digit i.e. 1 from {{1}}
			var i = str.match(/{{(\d+)}}/)[1];

			if (matches[i]) {

				// Replace {{1}} with the first bracket contents etc
				processedTarget = processedTarget.replace(str, String(matches[i]));
			}
		});
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
			return true;

		case 'proxy':
			logRequest(req, 'routing to:', processedTarget);
			options.proxy.web(req, res,{
				target: processedTarget
			});
			return true;

		case 'static':
			logRequest(req, 'Serving static folder:', processedTarget);
			staticFolder(req, res, processedTarget);
			return true;
	}
	return false;
};