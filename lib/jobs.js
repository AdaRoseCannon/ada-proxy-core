'use strict';

/**
 * Initalize and format the jobs array.
 * Creates static servers for folders.
 */

var jobsLength = 0;
var jobsArray = [];

module.exports = {
	getJobs: () => jobsArray,

	getLength: () => jobsLength,

	setArray: function (arr) {
		jobsArray = arr;
		jobsLength = jobsArray.length;
	}
};