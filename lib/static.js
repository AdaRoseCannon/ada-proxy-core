'use strict';
/* globals Promise*/


var servers = {};
var nodeStatic = require('node-static');
var fs = require('fs');

function getServer(target) {
	return new Promise(function (resolve, reject) {
		if (servers[target]) {
			resolve(servers[target]);
		} else {
			fs.exists(target, function (exists) {
				if (exists) {
					resolve(new nodeStatic.Server(target));
				} else {
					reject();
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
				server.serveFile('/404.html', 404, {}, req, res, function (err) {
					console.log(err);
				});
			} else {
				console.log(err);
			}
		});
	});
};
