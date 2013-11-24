var onResize = function () {
    var w = $(window).height();
    var h = $(window).width();
    var s = Math.min(w / 15, h / 9);
    $('body').css('fontSize', s + 'px');
    $('textarea').css('fontSize', (s * 0.8) + 'px');
};

$('img.bg').each(function () {
    var bg = this;
    var parent = bg.parentNode;
    parent.bg = bg;
    $bg = $(bg);
    $bg.insertBefore(parent);
});

//$('h2').wrap('<div style="background:url(/double-shade.png);width:100%;"/>');
//$('ol,dl').wrap('<div style="background:url(/shade.png);width:100%;"/>');

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
    }

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

// Changes to question view
$('#top-questions').click(questionView);
$('#new-questions').click(questionView);
function questionView() {
    $('#chat-res').hide();
    $('#ask-question').show();
    $('#question-list').show();
    $('#chat-box').hide()
}

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
            progress = (userCount/totalUsers)*100,
            quizNum = clientQuiz.quiz,
            $log = $($quizProgesses[quiz]),
            answers = clientQuiz.answers;
        console.log('uc' + userCount);
        console.log('tu' + totalUsers);
        if (progress > 80) {
            $($('.quiz').get(quizNum)).find('.answerlog').show();
        }
        $log.css('width', progress + '%');
        $.each(answers, function (index, answer) {
            var search = '#qa' + quiz + index;
            $(search).css('width', (answer/totalUsers)*100 + '%');
        });
    });

    // Receives questions from all users
    socket.on('questionsUpdate', function(data) {
        var $q = $('#question-list');
        var $chatRes = $('#chat-res');
        var $askQ = $('#ask-question');
        var $chatB = $('#chat-box');

        $chatRes.hide();
        $chatB.hide();

        $.each(data, function (index, obj) {
            var $qdiv = $('<div class="question" id="' + obj.chatId + '">');
            $qdiv.text(++index + ') ' + obj.question);
            $q.append($qdiv);
            console.log($qdiv);
        });

        $('.question').click(function() {
            $q.hide();
            $askQ.hide();
            $chatRes.show();
            $chatB.show();

            var chatId = this.id;

            socket.emit('getChatResponse', chatId);

            var $chatArea = $('chat-area');

            var question = $(this).text();
            question = question.substring(question.indexOf(' ')+1, question.length);

            $('#chat-title').text(question);
            $('#chat-title').attr('id', 'chat' + chatId);
            $('#submit-chat').click(function() {
                var chatTextRes = $('#chat-send-box').val();
                $('#chat-send-box').val('');
                var data = {};
                data['chatId'] = chatId;
                data['response'] = chatTextRes;
                socket.emit('sendChat', data);
            });
        });
    });

    // Receives the responses for a chat room
    socket.on('chatResponse', function(chatResponse) {
        console.log(chatResponse);
        $('#chat-area').empty();

        $.each(chatResponse, function(index, responses) {
            var $res = $('<div>');
            $res.text(responses);
            $('#chat-area').append($res);
        });
    })

});

// Uncomment for seeing changes quickly.
setTimeout(function () {
    //location.reload();
}, 2000);
