'use strict';

/**
 * Dependencies.
 */

var httpProxy = require('http-proxy');
var exec = require('child_process').exec;
var git = require('gift');
var jobs = require('./lib/jobs');

module.exports = function(options, jobsArray) {
	jobs.setArray(jobsArray);
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

	/**
	 * Local Variables
	 */

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
	 * Handling https proxy
	 */

	require('./lib/https-proxy-server')(options);
	console.log("listening for https on options.port ", options.https_port);
	require('./lib/http-proxy-server')(options)
		.on('updateself', selfUpdate)
		.on('update', deploy);
	console.log("listening for http on options.port ", options.port);


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
};