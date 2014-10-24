'use strict';
var options;

module.exports = {
	init: function (o) {
		return (options = o);
	},
	get: function () {
		return options;
	}
};