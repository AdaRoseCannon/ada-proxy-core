'use strict';

var http = require('http'),
    httpProxy = require('http-proxy'),
	options = require('./options.json'),
	forever = require('forever');
	gith = require('gith');

var port = options.port || 8080;
var p=process.argv.indexOf('-p');
if(!!~p && process.argv[p+1]) {
	port = process.argv[p+1];
}

var proxy = httpProxy.createProxyServer({});

var jobsArray = require('./jobs.json');
var jobsLength = jobsArray.length;

for (var i=0;i<jobsLength;i++) {
	var item = jobsArray[i];
	forever.startDaemon(item.app);
}

var server = http.createServer(function(req, res) {
	
	console.log(req.headers.host);

	if (req.headers.host.match(/^http://githooks/i)) {
		console.log('github webhook redirect');
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

console.log("listening on port ", port);
server.listen(port);

var gith = require( 'gith' ).create( port + 1 );
 
gith().on( 'all', function( payload ) {
  console.log(payload);
});
