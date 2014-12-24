'use strict';

var path = require('path');

module.exports = [{
	pattern: "/static/(.*)",
	type: "static",
	rewriteURL: "/{{1}}",
	target: path.join(__dirname, 'testResources'),
	comment: "Simple static path"
}, {
	pattern: "^http://ada\\.is/(.*)",
	type: "redirect",
	target: "https://ada.is/{{1}}",
	comment: "Redirect http to https"
}];
