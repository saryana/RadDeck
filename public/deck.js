var onResize = function () {
    var w = $(window).height();
    var h = $(window).width();
    var s = Math.min(w / 12, h / 9);
    $('body').css('fontSize', s + 'px');
    $('textarea').css('fontSize', (s * 0.8) + 'px');
};

// Replaces quiz slides with input fields
$('.quiz').each(function (index, quiz) {
    $(quiz).find('li').each(function (i, answer) {
        var val = $(answer).text();
        $(answer).html('<label><input type="radio" name="quiz' + index + '" value="answer' + i + '">' + val + '</label>');
    });
});

var moveTo = function (index) {
    if (index != currentIndex) {
        currentIndex = index * 1;
        if (isNaN(currentIndex)) {
            currentIndex = 0;
        }
        if (socket) {
            socket.emit('moveTo', currentIndex);
        }
        location.hash = '#' + currentIndex;
        $slides.each(function (index, slide) {
            $(slide).css('opacity', index == currentIndex ? 1 : 0);
        });
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

$('#resume').click(function () {
    if (!$(this).hasClass('disabled')) {
        follow(true);
        moveTo(masterIndex);    
    }
});

$('#questions').click(function () {
    $('#questions-area').toggleClass('on');
});

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

var hash = location.hash.replace('#', '');
moveTo(hash);
onResize();

setTimeout(function () {
    $slides.css('transition', 'opacity 0.5s');
}, 100);

isMaster = false;
var userId = document.cookie.split('=')[1].toLowerCase();
socket.on('connect', function () {

    // Connects a user
    socket.emit('setUser', userId);

    // Makes a master 
    if (hash == 'master') {
        socket.on('isMaster', function (setting) {
            isMaster = setting;
            if (isMaster) {
                $('#resume').hide();
            } else {
                $('#resume').show();
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

});

// Uncomment for seeing changes quickly.
setTimeout(function () {
    //location.reload();
}, 2000);
