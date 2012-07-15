var express = require('express'),
http = require('http');

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(process.env.PORT);
console.log(process.env.PORT);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket) {
    socket.on("imgData", function(data) {
        console.log("Received data. Broadcasting..");
        this.broadcast.emit("imgData", data);
    });
});