var express = require("express");
var app = express();
var log = console.log;
var port = 3700;
var config = require("./config.json");
var users = config.users;
var admins = ['sean', 'sam', 'jana', 'katie', 'pj'];
var connectedUsers = {
    count: 0
};

// Create dictionary for users and their id's
users.forEach(function(student) {
    users[student.id] = student;
});

app.set('views', __dirname + '/temp');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.use(express.bodyParser());
app.use(express.cookieParser());

// Hompage rendering
app.get('/', function(req, res) {
	res.render('index');
});

// Checks if student is registered
app.post('/deck', function(req, res) {
    var studentId = req.body.studentId.toLowerCase();
    if (users[studentId]) {
        res.cookie('studentId', studentId);
        res.redirect('/deck');
    } else {
        res.render('login');
    }
});

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
    socket.on('setUser', function (userId) {
        socket.userId = userId;
        var connections = connectedUsers[userId];
        if (!connections) {
            connections = connectedUsers[userId] = { count: 0 };
            connectedUsers.count++;
        }
        if (!connections[socket.id]) {
            connections.count++;
            connections[socket.id] = true;
        }
        console.log('hi');
        console.log(connectedUsers);
    });

    socket.on('disconnect', function() {
        var userId = socket.userId;
        var connections = connectedUsers[userId];
        if (connections && connections[socket.id]) {
            delete connections[socket.id];
            connections.count--;
            if (!connections.count) {
                delete connectedUsers[userId];
                connectedUsers.count--;
            }
        }
        console.log(connectedUsers);
    });

    socket.on('setMaster', function (userId) {
        
        if (admins.indexOf(userId) > -1) {
        	if (masterSocket && socket.id != masterSocket.id) {
        		masterSocket.emit('isMaster', false);
        	}
            masterSocket = socket;
            socket.emit('isMaster', true);
        }
    });

    socket.on('moveTo', function (index) {
        if (masterSocket && socket.id == masterSocket.id) {
            io.sockets.emit('masterMove', index);
        }
    });

});

console.log("Listening on port " + port);