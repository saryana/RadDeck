var express = require("express");
var app = express();
var log = console.log;
var port = 3700;
var config = require("./config.json");

app.set('views', __dirname + '/temp');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.use(express.bodyParser());
app.use(express.cookieParser());

/*var pages = ['', 'deck'];
pages.forEach(function (page) {
    app.get('/' + page, function(req, res){
        res.render(page || 'test');
    });
});*/
// Hompage rendering
app.get('/', function(req, res) {
	res.render('index');
});

// Checks if student is registered
app.post('/deck', function(req, res) {
    var studentId = req.body.studentId;
    console.log(config.student[studentId]);
    if (config.student[studentId]) {
        res.cookie('studentId', studentId);
        res.render('deck');
    } else {
        res.render('login');
    }
})

// If student is logged in will go straight to decks
app.get('/deck', function(req, res) {
    if (!req.cookies.studentId) {
        res.render('login');
    } else {
        res.render('deck');
    }
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