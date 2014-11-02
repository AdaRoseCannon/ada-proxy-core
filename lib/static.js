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
			fs.exists(target, function (exists) {
				if (exists) {
					resolve(new nodeStatic.Server(target));
				} else {
					reject('Static path does not exist: ' + target);
				}
			});
		}
	});
}

module.exports = function staticFolder(req, res, target) {
	return getServer(target).then(function (server) {
		server.serve(req, res, function (err) {
			if (err && (err.status === 404)) {
				// If the file wasn't found
				fs.exists(path.join(target, '/404.html'), function (exists) {
					if (exists) {
						server.serveFile('/404.html', 404, {}, req, res);
					} else {
						res.writeHead(404, {
							'Content-Type': 'text/plain'
						});
						res.write('404 :(');
						res.end();
					}
				});
			} else {
				console.log('Error serving static file', err);
			}
		});
	});
};
