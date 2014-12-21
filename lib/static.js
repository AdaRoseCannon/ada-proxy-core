'use strict';
/* globals Promise*/


var servers = {};
var nodeStatic = require('node-static');
var fs = require('fs');
var path = require('path');

function getServer(target) {
	return new Promise(function (resolve, reject) {
		if (servers[target]) {
			resolve(servers[target]);
		} else {
			fs.lstat(target, function (err, stats) {
				if (err) {
					reject('Error with the target: ' + target, err);
					return;
				}
				if (!stats.isDirectory()) {
					reject('Target must be a directory: ' + target);
					return;
				}
				console.log('Adding static target', target, stats.isDirectory());
				resolve(new nodeStatic.Server(target));
			});
		}
	});
}

module.exports = function staticFolder(req, res, target) {
	return getServer(target).then(function (server) {
		server.serve(req, res, function (err) {
			if (err && (err.status === 404)) {

				console.log(target, err);

				// If the file wasn't found
				fs.exists(path.join(target, '/404.html'), function (exists) {
					if (exists) {
						server.serveFile('/404.html', 404, {}, req, res);
					} else {
						res.writeHead(404, {
							'Content-Type': 'text/plain'
						});
						res.write("404 :( \n");
						res.end();
					}
				});
			} else {
				console.log('Error serving static file', target, req.url, err);
			}
		});
	});
};
