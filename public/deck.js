var onResize = function () {
    var w = $(window).height();
    var h = $(window).width();
    var s = Math.min(w / 15, h / 9);
    $('body').css('fontSize', s + 'px');
    $('textarea').css('fontSize', (s * 0.8) + 'px');
    $('input[type=radio]').css('zoom', (s * 7) + '%');
    console.log($('input[type=radio]').length);
};

$('img.bg').each(function () {
    var bg = this;
    var parent = bg.parentNode;
    parent.bg = bg;
    $bg = $(bg);
    $bg.insertBefore(parent);
});

var userId = document.cookie.split('=')[1].toLowerCase();

// Replaces quiz slides with input fields
$('.quiz').each(function (index, quiz) {
    $(quiz).find('li').each(function (i, answer) {
        var val = $(answer).text();
        var unique = 'qa' +index +i;
        $(answer).html('<div class="answerlog" id=' + unique + '></div><label><input type="radio" name="quiz' + index + '" value="answer' + i + '">' + val + '</label>');
    });
});

// Submits the answer to a question
$(document).on('click', 'input[type="radio"]', function (e) {
    var quiz = this.name;
    var answer = this.value;
    var answerObj = {
        'userId': userId,
        'quiz': quiz,
        'answer': answer
    };

    socket.emit('submitAnswer', answerObj);
});

// Moves slides accordingly 
var moveTo = function (index) {
    if (index != currentIndex) {
        var previous = $slides[currentIndex];
        if (previous) {
            var $previous = $(previous).add(previous.bg);
            $previous.css('opacity', 0);
            previous.t = setTimeout(function () {
                $previous.hide();
            }, 500);
        }
        currentIndex = index * 1;
        if (isNaN(currentIndex)) {
            currentIndex = 0;
        }
        location.hash = '#' + currentIndex;
        if (socket) {
            socket.emit('moveTo', currentIndex);
        }
        var current = $slides[currentIndex];
        clearTimeout(current.t);
        $(current).add(current.bg).show().css('opacity', 1);
    }
};

var moveBy = function (increment) {
    moveTo((currentIndex + slideCount + increment) % slideCount);
};

$(window).on('resize', onResize);

$('#next').click(function () {
    follow(false);
    moveBy(1);
});

$('#previous').click(function () {
    follow(false);
    moveBy(-1);
});

// Will catch up and start to follow the instructor
$('#resume').click(function () {
    if (!$(this).hasClass('disabled')) {
        follow(true);
        moveTo(masterIndex);    
    }
});


$('#questions').click(function () {
    var $area = $('#questions-area');
    var area = $area[0];
    if ($area.hasClass('on')) {
        area.t = setTimeout(function () {
            $area.hide();
        }, 500);
    } else {
        clearTimeout(area.t);
        $area.show();
    }
    setTimeout(function () {
        $area.toggleClass('on');
    }, 5);
});

// Will go at own pace or follow the instructor
function follow(following) {
    isFollowing = following;
    if (isFollowing) {
        $('#resume').addClass('disabled');
    } else {
        $('#resume').removeClass('disabled');
    }
}

var $slides = $('.slide');
var slideCount = $slides.length;
var currentIndex = 'unknown'; // moveTo will only move if index != currentIndex
var masterIndex = 0;
var socket = io.connect(location.protocol + '//' + location.host);
var isFollowing = true;
var $quizProgesses = $('.log');
var currentChatThread = 0;
var currentQuestionList;


// Changes to question view
$('#top-questions').click(function () {
    hideChat();
    $('#question-tabs .on').removeClass('on');
    $(this).addClass('on');
    console.log(currentQuestionList);
    orderUpvotes(currentQuestionList);
});
$('#new-questions').click(function() {
    hideChat();
    $('#question-tabs .on').removeClass('on');
    $(this).addClass('on');
    console.log(currentQuestionList);
    orderNewest(currentQuestionList);
});

$('.answerlog').hide(); // Not sure where to implement these
$('#showAnswer').hide();

var hash = location.hash.replace('#', '');
moveTo(hash);
onResize();

isMaster = false;
socket.on('connect', function () {

    // Connects a user
    socket.emit('setUser', userId);

    // Makes a master 
    if (hash == 'master') {
        socket.on('isMaster', function (setting) {
            isMaster = setting;
            if (isMaster) {
                $('#resume').hide();
                $('#showAnswer').show();
            } else {
                $('#resume').show();
                $('#showAnswer').hide();
            }
        });
        socket.emit('setMaster', userId);
    }

    // Detects when the master is making a move and moves the index
    socket.on('masterMove', function (index) {
        masterIndex = index;
        if (isFollowing) {
            moveTo(index);
        }
    });

    // Update the progress of the quizzes
    socket.on('answerUpdate', function(clientQuiz) {
        console.log(clientQuiz);
        var quiz = clientQuiz.quiz,
            userCount = clientQuiz.userCount,
            totalUsers = clientQuiz.totalUsers,
            progress = Math.min(1, userCount / totalUsers) * 100,
            quizNum = clientQuiz.quiz,
            $log = $($quizProgesses[quiz]),
            answers = clientQuiz.answers;
        if (progress > 80) {
            $quiz = $($('.quiz').get(quiz));
            $quiz.find('.answerlog').show();
            $quiz.find('li:not(.correct) label').addClass('faded');
            $quiz.find('.correct').css('fontWeight', 'bold');
        }
        $log.css('width', progress + '%');
        $.each(answers, function (index, answer) {
            var search = '#qa' + quiz + index;
            $(search).css('width', Math.min(1, answer / totalUsers) * 100 + '%');
        });
    });

    // Receives questions from all users
    socket.on('questionsUpdate', function(data) {
        var $q = $('#question-list');
        var $chatRes = $('#chat-res');
        var $askQ = $('#ask-question');
        var $chatB = $('#chat-box');

        currentQuestionList = data;
        if ($('#new-questions').hasClass('on')) {
            orderNewest(data);
        } else {
            orderUpvotes(data);
        }
    });

    // Receives the responses for a chat room
    socket.on('chatResponse', function(chatResponse) {
        console.log('Here is the data from for room ' + chatResponse.chatId);
        if (chatResponse.chatId == currentChatThread) {
            $('#chat-area').empty();

            $.each(chatResponse.response, function(index, responses) {
                var $res = $('<div>');
                $res.text(responses);
                $('#chat-area').append($res);
            });
        }
    })

});

function orderNewest(data) {
    if (data) {
        data.sort(function (a, b) {
            return b.DateTime - a.DateTime;
        });
        addQuestions(data);
    }
}

function orderUpvotes(data) {
    if (data) {
        data.sort(function (a, b) {
            return b.upvotes - a.upvotes;
        });
        addQuestions(data);
    }
}

function addQuestions(data) {
    var $q = $('#question-list');
    var $chatRes = $('#chat-res');
    var $askQ = $('#ask-question');
    var $chatB = $('#chat-box');
    $q.empty();
    $.each(data, function (index, obj) {
        var $qdiv = $('<span class="upvote" id="ques' + index + '"><img src="/vote.png" style="width:1em"> ' + obj.upvotes + '</span><span class="question" id="' + obj.chatId + '">'+obj.question+'</span><span class="author">' + obj.userId + '</span><span class="date">' + (new Date(obj.dateTime).toLocaleTimeString()) +  '</span></br>');
        $('#question-list').append($qdiv);
        $('.upvote').click(function() {
            var questionNum = this.id;
            socket.emit('tallyUpvote', questionNum);
        });

    });

    // Handles question clicking and moving to chatroom
    $('.question').click(function() {
        $q.hide();
        $askQ.hide();
        $chatRes.show();
        $chatB.show();

        var chatId = this.id;
        currentChatThread = chatId;

        console.log('Getting responses from ' + chatId);
        socket.emit('getChatResponse', chatId);
        console.log('Now viweing content form ' + currentChatThread);

        var $chatArea = $('chat-area');

        var question = $(this).text();
        question = question.substring(question.indexOf(' ')+1, question.length);
        $('#chat-title').text(question);

        // Handles sending chat messages to specific chatroom
        $('#submit-chat').unbind('click').bind('click', function() {
            var chatTextRes = $('#chat-send-box').val();
            $('#chat-send-box').val('');
            var data = {};
            console.log('sending: ' + currentChatThread);
            data['chatId'] = currentChatThread;
            data['response'] = chatTextRes;
            socket.emit('sendChat', data);
        });

    });
}
function hideChat() {
    var $q = $('#question-list');
    var $chatRes = $('#chat-res');
    var $askQ = $('#ask-question');
    var $chatB = $('#chat-box');
    $chatRes.hide();
    $chatB.hide();
    $q.show();
    $askQ.show();
}

// Uncomment for seeing changes quickly.
setTimeout(function () {
    //location.reload();
}, 2000);
