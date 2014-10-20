'use strict';

var servers = {};
var nodeStatic = require('node-static');

function getServer(target) {
	if (!servers[target]) {
		servers[target] = new nodeStatic.Server(target);
	}
	return servers[target];
}

module.exports = function staticFolder(req, res, target) {
	getServer(target).serve(req, res);
};