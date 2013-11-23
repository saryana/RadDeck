var express = require("express");
var app = express();
var log = console.log;
var port = 3700;

app.set('views', __dirname + '/temp');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);

var pages = ['', 'deck'];
pages.forEach(function (page) {
    app.get('/' + page, function(req, res){
        res.render(page || 'test');
    });
});

app.use(express.static(__dirname + '/public'));

var master;

var io = require('socket.io').listen(app.listen(port));

io.sockets.on('connection', function (socket) {

    socket.on('setMaster', function () {
        master = socket.id;
        socket.emit('isMaster', true);
    });

    socket.on('moveTo', function (index) {
        if (socket.id == master) {
            io.sockets.emit('masterMove', index);
        }
    });

});

console.log("Listening on port " + port);