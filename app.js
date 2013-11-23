var express = require("express");
var app = express();
var port = 3700;

var master;

app.set('views', __dirname + '/temp');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.get("/", function(req, res){
    res.render("test");
});

app.use(express.static(__dirname + '/public'));

var io = require('socket.io').listen(app.listen(port));

io.sockets.on('connection', function (socket) {
    if (!master) master = socket.id;
    socket.emit('connect', { soc: socket.id, mas: master });

    socket.on('send', function (data) {
        io.sockets.emit('message', data);
    });
});


console.log("Listening on port " + port);