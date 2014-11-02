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
		server.serve(req, res, function (e, res) {
			if (e && (e.status === 404) && req.url !== '/404.html') {
				// If the file wasn't found
				fileServer.serveFile('/404.html', 404, {}, request, response);
			}
		});
	});
};
