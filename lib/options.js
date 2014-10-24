'use strict';
var options;

module.exports = {
	init: o => options = o,
	get: () => options
};