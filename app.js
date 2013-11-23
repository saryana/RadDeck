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

var masterSocket;

var io = require('socket.io').listen(app.listen(port));

io.sockets.on('connection', function (socket) {

    socket.on('setMaster', function () {
    	if (masterSocket && socket.id != masterSocket.id) {
    		masterSocket.emit('isMaster', false);
    	}
        masterSocket = socket;
        socket.emit('isMaster', true);
    });

    socket.on('moveTo', function (index) {
        if (masterSocket && socket.id == masterSocket.id) {
            io.sockets.emit('masterMove', index);
        }
    });

});

console.log("Listening on port " + port);