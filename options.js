var constants = require('constants');
var fs = require('fs');
var https = require('https');

module.exports = {
	port: 8080,
	https_port: 8443,
	ssl_options: {
		key: fs.readFileSync("/home/ada/keys/ssl.key"),
		cert: fs.readFileSync("/home/ada/keys/ssl.crt"),
		ca: [
			fs.readFileSync("/home/ada/keys/ca.pem"),
			fs.readFileSync("/home/ada/keys/sub.class1.server.ca.pem")
		]
	},
	githookURL: "^http:\/\/githooks", //If the url begins with http://githooks then it is a git hook
	repoURL: "https://github.com/AdaRoseEdwards/ada-proxy",
	repoRef: "refs/heads/master"
};