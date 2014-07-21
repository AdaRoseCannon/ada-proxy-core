'use strict';

var http = require('http'),
    httpProxy = require('http-proxy'),
	options = require('./options.json'),
	forever = require('forever'),
	createHandler = require('github-webhook-handler'),
	handler = createHandler({ path: '/', secret: require('./secret') });

var PORT = options.port || 8080;
var p=process.argv.indexOf('-p');
if(!!~p && process.argv[p+1]) {
	PORT = process.argv[p+1];
}

PORT = parseInt(PORT);
var proxy = httpProxy.createProxyServer({});

proxy.on('error', function (err, req, res) {
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });
  
  res.end('Something went wrong. And we are reporting a custom error message.\n');
  console.log(err);
});

var jobsArray = require('./jobs.json');
var jobsLength = jobsArray.length;

for (var i=0;i<jobsLength;i++) {
	var item = jobsArray[i];
	forever.startDaemon(item.app);
}

var server = http.createServer(function(req, res) {
	
	// console.log(req.headers.host);

	if (req.headers.host.match(/^githooks/i)) {
		handler(req, res, function (err) {
			res.statusCode = 404;
			res.end('no such location');
  		});	
		return;
	}

	for (var i=0;i<jobsLength;i++) {
		var item = jobsArray[i];
		if (req.headers.host.match(new RegExp(item.pattern))) {
			console.log('redirecting to:', item.target);
			proxy.web(req, res,{ target: item.target });
			return;
		}
	}

	res.writeHead(500, {
		'Content-Type': 'text/plain'
	});
	res.end('No matching routes.');

});

handler.on('push', function (event) {

	console.log('Received a push event for %s to %s', event.payload.repository.name, event.payload.ref);
	if (event.payload.repository.url === "https://github.com/AdaRoseEdwards/ada-proxy") {
		if (event.payload.ref === "refs/heads/master") {

			var commits = event.payload.commits;
			var hardReloadRequired = false;
			var softReloadRequired = false;
			for (var i=commits.length;i--;) {
				var item = commits[i];
				if (!item.added.length || !item.removed.length) {
					console.log(item.added, !item.added.length, item.removed, !item.removed.length, item.modified);
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
				}
			});
		}
	} else {

		// It needs to update one of the programs being run by forever
		console.log('');
	}
});

console.log("listening on PORT ", PORT);
server.listen(PORT);
