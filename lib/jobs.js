'use strict';

/**
 * Initalize and format the jobs array.
 * Creates static servers for folders.
 */

var jobsLength = 0;
var jobsArray = [];

module.exports = {
	getJobs: function () {
		return jobsArray;
	},

	getLength: function () {
		return jobsLength;
	},

	setArray: function (arr) {
		jobsArray = arr;
		jobsLength = jobsArray.length;
	}
};