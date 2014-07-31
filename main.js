'use strict';

/**
 * Dependencies.
 */

var http = require('http');
var httpProxy = require('http-proxy');
var options = require('./options.json');
var fs = require('fs');
var createHandler = require('github-webhook-handler');

/**
 * Local Variables
 */

var handler = createHandler({ path: '/', secret: require('./secret') });
var jobsArray = require('./jobs.json');
var PORT = options.port || 8080;
var HTTPS_PORT = options.https_port || 8443;
var proxy = httpProxy.createProxyServer({}).on('error', function (err, req, res) {
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });
  
  res.end('Something went wrong. And we are reporting a custom error message.\n');
  console.log(err);
});

/*
var httpsProxy = httpProxy.createServer({
  ssl: {
    key: fs.readFileSync('valid-ssl-key.pem', 'utf8'),
    cert: fs.readFileSync('valid-ssl-cert.pem', 'utf8')
  },
  secure: true // Depends on your needs, could be false.
}).on('error', function (err, req, res) {
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });
  
  res.end('Something went wrong. And we are reporting a custom error message.\n');
  console.log(err);
});
*/

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
	var jobsLength = jobsArray.length;
	for (var i=0;i<jobsLength;i++) {
		var item = jobsArray[i];
	}
}
init();


/**
 * Handle http redirects and proxy
 */
var server = http.createServer(function(req, res) {
	
	console.log("incoming request:", req.headers.host);

	if (req.headers.host.match(/^githooks/i)) {
		handler(req, res, function (err) {
			res.statusCode = 404;
			res.end('no such location');
  		});	
		return;
	}

	var jobsLength = jobsArray.length;
	for (var i=0;i<jobsLength;i++) {
		var item = jobsArray[i];
		if (req.headers.host.match(new RegExp(item.pattern))) {

			if (item.type === 'redirect') {
				console.log('redirecting to:', item.target);
				res.redirect(item.target);
			}

			if (item.type === 'proxy') {
				console.log('routing to:', item.target);
				proxy.web(req, res,{ target: item.target });
				return;
			}
		}
	}

	res.writeHead(500, {
		'Content-Type': 'text/plain'
	});
	res.end('No matching routes.');

}).listen(PORT);

console.log("listening for http on PORT ", PORT);

/**
 * Handle self upgrades.
 */
handler.on('push', function (event) {

	console.log('Received a push event for %s to %s', event.payload.repository.name, event.payload.ref);
	if (event.payload.repository.url === "https://github.com/AdaRoseEdwards/ada-proxy") {
		if (event.payload.ref === "refs/heads/master") {

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
			var repo = git(process.cwd());
			repo.sync(function (err) {
				if (err) {
					console.log (err);
					return;
				}

				if (hardReloadRequired) {

					// Shutdown the process so that forever brings it back up.
					console.log('hard reset');
					process.exit();
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
		console.log('');
	}
});
