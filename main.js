'use strict';

var http = require('http'),
    httpProxy = require('http-proxy'),
	options = require('./options.json'),
	forever = require('forever');
	gith = require('gith');

var PORT = options.port || 8080;
var p=process.argv.indexOf('-p');
if(!!~p && process.argv[p+1]) {
	PORT = process.argv[p+1];
}

var GITH_PORT = PORT + 1;

var proxy = httpProxy.createProxyServer({});

var jobsArray = require('./jobs.json');
var jobsLength = jobsArray.length;

for (var i=0;i<jobsLength;i++) {
	var item = jobsArray[i];
	forever.startDaemon(item.app);
}

var server = http.createServer(function(req, res) {
	
	console.log(req.headers.host);

	if (req.headers.host.match(/^githooks/i)) {
		console.log('github webhook redirect');
		proxy.web(req, res,{ target: "http://localhost:" + GITH_PORT });
	}

	for (var i=0;i<jobsLength;i++) {
		var item = jobsArray[i];
		if (req.headers.host.match(new RegExp(item.pattern))) {
			console.log('redirecting to:', item.target);
			proxy.web(req, res,{ target: item.target });
			break;
		}
	}
});

console.log("listening on PORT ", PORT);
server.listen(PORT);

var gith = require( 'gith' ).create( GITH_PORT );

console.log("Githooks listening on PORT ", GITH_PORT);

gith().on( 'all', function( payload ) {
  console.log(payload);
});
