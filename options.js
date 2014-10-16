var constants = require('constants');
var fs = require('fs');

module.exports = {
	port: 8080,
	https_port: 8443,
	ssl_options: {
		//
		// This is the default secureProtocol used by Node.js, but it might be
		// sane to specify this by default as it's required if you want to
		// remove supported protocols from the list. This protocol supports:
		//
		// - SSLv2, SSLv3, TLSv1, TLSv1.1 and TLSv1.2
		//
		secureProtocol: 'SSLv23_method',

		//
		// Supply `SSL_OP_NO_SSLv3` constant as secureOption to disable SSLv3
		// from the list of supported protocols that SSLv23_method supports.
		//
		secureOptions: constants.SSL_OP_NO_SSLv3,
		key: fs.readFileSync("/home/ada/keys/ssl.key"),
		cert: fs.readFileSync("/home/ada/keys/ssl.crt"),
		ca: [
			fs.readFileSync("/home/ada/keys/ca.pem"),
			fs.readFileSync("/home/ada/keys/sub.class1.server.ca.pem")
		]
	},
	githookURL: "^http:\/\/githooks",
	repoURL: "https://github.com/AdaRoseEdwards/ada-proxy",
	repoRef: "refs/heads/master"
};