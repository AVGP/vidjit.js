var express = require('express'),
http = require('http');

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

var port = process.env.PORT || 8080;
server.listen(port);
console.log(port);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket) {
    socket.on("imgData", function(data) {
        console.log("Received data. Broadcasting..");
        this.broadcast.emit("imgData", data);
    });
});