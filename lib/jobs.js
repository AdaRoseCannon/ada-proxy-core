'use strict';

/**
 * Initalize and format the jobs array.
 * Creates static servers for folders.
 */

var nodeStatic = require('node-static');
var jobsLength = 0;
var jobsArray;

module.exports = {
	getJobs: function () {
		return jobsArray;
	},

	getLength: function () {
		return jobsLength;
	},

	setArray: function () {
		jobsLength = jobsArray.length;
		for (var i=0;i<jobsLength;i++) {
			var item = jobsArray[i];
			if (item.type === 'static') {
				item.server = new nodeStatic.Server(item.target);
			}
		}
	}
};