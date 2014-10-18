'use strict';

/**
 * Dependencies.
 */

var httpProxy = require('http-proxy');
var options = require('./options');
var exec = require('child_process').exec;
var git = require('gift');
var jobs = require('./lib/jobs');
jobs.setArray(require('./jobs.json'));


process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Local Variables
 */

options.port = options.port || 8080;
options.https_port = options.https_port || 8443;

options.proxy = httpProxy.createProxyServer({
	ssl: options.ssl_options,

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
		options.port = process.argv[p+1];
	}

	var s=process.argv.indexOf('-s');
	if(!!~s && process.argv[s+1]) {
		options.https_port = process.argv[s+1];
	}

	options.https_port = parseInt(options.https_port);
	options.port = parseInt(options.port);
})();

console.log("listening for http on options.port ", options.port);

/**
 * Handling https proxy
 */

require('./lib/https-proxy-server')(options);
require('./lib/http-proxy-server')(options)
	.on('updateself', selfUpdate)
	.on('update', deploy);

/**
 * Update the proxy
 * @return void
 */
function selfUpdate() {
	var selfItem = {
		deploy: {
			folder: __dirname,
			run: "npm install"
		}
	};
	deploy(selfItem, function () {
		console.log('Updated ada-proxy successfully');
		console.log('hard reset');
		process.exit();
	});
}

/**
 * Sync a folder using git & run install commands
 * @return void
 */
function deploy(item, callback) {
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
					if (callback) callback();
				} else {
					console.log('Deploy step failed.');
				}
			});
		}
	});
}