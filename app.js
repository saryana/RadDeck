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
var chatRoom = {};

var quizzes = [];
var questions = [];
var chatIdCreator = 10;

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
app.post('/login', function(req, res) {
    var studentId = req.body.studentId.toLowerCase();
    if (users[studentId]) {
        res.cookie('studentId', studentId);
        res.redirect('/deck');
    } else {
        res.render('login');
    }
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

// Checks if student is registered
app.get('/login', function(req, res) {
    res.render('login');
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

var io = require('socket.io').listen(app.listen(port), { log: false });

io.sockets.on('connection', function (socket) {
    // Emit existing results
    io.sockets.emit('questionsUpdate', questions);
    for (var i = 0; i < quizzes.length; i++) {
        io.sockets.emit('answerUpdate', quizzes[i]);
    }
    // Adds user and all the devices it is connecting from
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
        //console.log('connected');
        //console.log(connectedUsers);
    });

    // Deletes sockets or  users if no sockets exist
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
        //console.log('disconnect');
        //console.log(connectedUsers);
    });

    // Sets or changes the master if they are an admin
    socket.on('setMaster', function (userId) {
        if (admins.indexOf(userId) > -1) {
        	if (masterSocket && socket.id != masterSocket.id) {
        		masterSocket.emit('isMaster', false);
        	}
            masterSocket = socket;
            socket.emit('isMaster', true);
        }
    });

    // Moves the slides of students if master moves his
    socket.on('moveTo', function (index) {
        if (masterSocket && socket.id == masterSocket.id) {
            io.sockets.emit('masterMove', index);
        }
    });

    // Moniters the answers of all the students as well as the answers
    socket.on('submitAnswer', function (answerObj) {
        var userId = answerObj.userId;
        var quizNumber = parseInt(answerObj.quiz.replace('quiz', ''));
        var answerNumber = parseInt(answerObj.answer.replace('answer', ''));
        var prevAnswerNumber;
        var quiz = quizzes[quizNumber];
        if (!quiz) {
            quiz = quizzes[quizNumber] = {
                'quiz': quizNumber,
                'answers': [],
                'userCount': 0,
                'totalUsers': connectedUsers.count,
                'users': {}
            };
        }
        
        prevAnswerNumber = quiz.users[userId];
        if (typeof prevAnswerNumber != 'undefined' && answerNumber != prevAnswerNumber) {
            quiz.answers[prevAnswerNumber]--;
        } else if (typeof prevAnswerNumber == 'undefined') {
            quiz.userCount++;
        }

        if (typeof quiz.answers[answerNumber] == 'undefined') {
            quiz.answers[answerNumber] = 1;
        } else if (prevAnswerNumber != answerNumber) {
            quiz.answers[answerNumber]++;
        }
        quiz.users[userId] =  answerNumber;
        //console.log('quiz');
        //console.log(quizzes);
        var clientQuiz = {
            'quiz': quizNumber,
            'totalUsers': connectedUsers.count,
            'userCount': quiz.userCount,
            'answers': quiz.answers
        };
        quiz.totalUsers = connectedUsers.count;
        //console.log('console quiz');
        //console.log(clientQuiz);
        io.sockets.emit('answerUpdate', quiz);
    });

    // Posting questions
    socket.on('postQuestion', function(question) {
        questions.push({
            'question': question,
            'chatId': chatIdCreator,
            'userId': socket.userId,
            'dateTime': new Date(),
            'upvotes': 1,
            'upvotesUsers': [socket.userId]
        });
        chatRoom[chatIdCreator] = [];
        chatIdCreator += 7;
        io.sockets.emit('questionsUpdate', questions);
    });

    // Sends back responses according to chat room
    socket.on('getChatResponse', function(room) {
        var newData = {};
        newData.chatId = room;
        newData.response = chatRoom[room];
        console.log(newData);
        socket.emit('chatResponse', newData);
    });

    // Recieves student response to a questions
    socket.on('sendChat', function(data) {
        if (chatRoom[data.chatId]) {
            chatRoom[data.chatId].push(data.response);    
        } else {
            var chatResponses = chatRoom[data.chatId] = new Array();
            chatResponses.push(data.response);
        }
        var newData = {};
        newData.chatId = data.chatId;
        newData.response = chatRoom[data.chatId];
        console.log(newData);

        io.sockets.emit('chatResponse', newData);
    });

    // Tally upvotes
    socket.on('tallyUpvote', function(question) {
        question = question.replace('ques', '');
        if (questions[question]['upvotesUsers'].indexOf(socket.userId) == -1) {
            questions[question]['upvotes']++;
            questions[question]['upvotesUsers'].push(socket.userId);
        }
        io.sockets.emit('questionsUpdate', questions);
    });
});

console.log("Listening on port " + port);

process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err);
});
