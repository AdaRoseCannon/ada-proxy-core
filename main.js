var http = require('http'),
    httpProxy = require('http-proxy');

var proxy = httpProxy.createProxyServer({});

var server = require('http').createServer(function(req, res) {
  console.log('Connection');
  proxy.web(req, res, { target: 'http://127.0.0.1:9000' });
});

console.log("listening on port 8080")
server.listen(8080);
