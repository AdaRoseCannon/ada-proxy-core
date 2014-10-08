'use strict';

/**
 * Dependencies.
 */

var http = require('http');
var https = require('https');
var httpProxy = require('http-proxy');
var options = require('./options.json');
var fs = require('fs');
var createHandler = require('github-webhook-handler');
var exec = require('child_process').exec;
var nodeStatic = require('node-static');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

/**
 * Local Variables
 */

var handler = createHandler({ path: '/', secret: require('./secret') });
var jobsArray;
var jobsLength;
var PORT = options.port || 8080;
var HTTPS_PORT = options.https_port || 8443;

var sslOptions = options.ssl_options;

function filePathToFile(array) {
	for (var item in array) {
		if (typeof array[item] === 'string') {
			array[item] = fs.readFileSync(array[item]);
			continue;
		}
		if (array[item].constructor === Array || typeof array[item] === 'object') {
			filePathToFile(array[item]);
			continue;
		}
	}
}

filePathToFile(sslOptions);

var proxy = httpProxy.createProxyServer({
	ssl: sslOptions,

	// SPDY-specific options
	windowSize: 1024,
	secure: false,
	hostnameOnly: true

}).on('error', function (err, req, res) {
	res.writeHead(500, {
		'Content-Type': 'text/plain'
	});
	
	res.write(err.message);
	res.end('Oh dear!!');
	console.log(err);
});

/**
 * Process the args in this Immediately-Invoked Function Expression
 * To avoid cluttering the global scope
 */

(function () {
	var p=process.argv.indexOf('-p');
	if(!!~p && process.argv[p+1]) {
		PORT = process.argv[p+1];
	}

	var s=process.argv.indexOf('-s');
	if(!!~s && process.argv[s+1]) {
		HTTPS_PORT = process.argv[s+1];
	}

	HTTPS_PORT = parseInt(HTTPS_PORT);
	PORT = parseInt(PORT);
})();

function init() {
	jobsArray = require('./jobs.json');
	jobsLength = jobsArray.length;
	for (var i=0;i<jobsLength;i++) {
		var item = jobsArray[i];
		if (item.type === 'folder') {
			item.server = new nodeStatic.Server(item.target);
		}
	}
}
init();

var n=0;
function logRequest(req) {
	var args = [];
	for (var i = 1; i < arguments.length; i++) {
		args.push(arguments[i]);
	}
	var message = args.join(" ");
	console.log(++n + ': ', req.headers.host, ':', message);
}

/**
 * Handle http redirects and proxy
 */
http.createServer(function(req, res) {
	
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
					proxy.web(req, res,{
						target: item.target
					});
					return;

				case 'folder':
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

}).listen(PORT);

console.log("listening for http on PORT ", PORT);

/**
 * Handling https proxy
 */
https.createServer(sslOptions, function(req, res) {
	
	var testPath = 'https://' + req.headers.host;

	var jobsLength = jobsArray.length;
	for (var i=0;i<jobsLength;i++) {
		var item = jobsArray[i];
		if(!item.https) {
			continue;
		}

		if (testPath.match(new RegExp(item.pattern))) {

			if (item.type === 'proxy') {
				logRequest(req, 'routing to:', item.target);
				proxy.web(req, res, {
					target: item.target
				});
			}
			return;
		}
	}

	res.writeHead(500, {
		'Content-Type': 'text/plain'
	});
	res.end('No matching https routes.');

}).listen(HTTPS_PORT);

console.log("listening for https on PORT ", HTTPS_PORT);

/**
 * Handle self upgrades.
 */
handler.on('push', function (event) {

	console.log('Received a push event for %s to %s', event.payload.repository.name, event.payload.ref);
	if (event.payload.repository.url === options.repoURL) {
		if (event.payload.ref === (options.repoRef || "refs/heads/master")) {

			var commits = event.payload.commits;
			var hardReloadRequired = false;
			var softReloadRequired = false;
			for (var i=commits.length;i--;) {
				var item = commits[i];
				if (!!item.added.length || !!item.removed.length) {
					hardReloadRequired = true;
					break;
				}
				if (item.modified.length === 1 && item.modified[0] === 'jobs.json') {
					softReloadRequired = true;
				} else {
					hardReloadRequired = true;
				}
			}
			// It needs to update itself
			// Update git in place

			var git = require('gift');
			var repo = git(__dirname);
			repo.sync(function (err) {
				if (err) {
					console.log (err);
					return;
				}

				if (hardReloadRequired) {
					var run = exec("npm install", {
						cwd: __dirname
					});
					run.on('close', function (code) {
						if (!code) {
							console.log('Updated ada-proxy successfully');
						} else {
							console.log('Deploy step failed.');
						}

						// Shutdown the process so that forever brings it back up.
						console.log('hard reset');
						process.exit();
					});
				}
				if (softReloadRequired) {

					// Update the jobs
					jobsArray = require('./jobs.json');
					console.log('soft reset');
					init();
				}
			});
		}
	} else {

		// It needs to update one of the programs being run by forever
		var jobsLength = jobsArray.length;
		for (var i = 0; i < jobsLength; i++) {
			var item = jobsArray[i];
			if (item.deploy && event.payload.repository.url === item.deploy.watch) {
				var git = require('gift');
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
							} else {
								console.log('Deploy step failed.');
							}
						});
					}
				});
			}
		}
	}
});
