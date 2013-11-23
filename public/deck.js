var onResize = function () {
    var w = $(window).height();
    var h = $(window).width();
    console.log(s = Math.min(w / 12, h / 9));
    document.body.style.fontSize = s + 'px';
};

var moveTo = function (index) {
    slideIndex = index;
    transition();
};

var moveBy = function (increment) {
    slideIndex = (slideIndex + slideCount + increment) % slideCount;
    transition();
};

function transition() {
    if (isNaN(slideIndex)) {
        slideIndex = 0;
    }
    location.hash = '#' + slideIndex;
    $slides.each(function (index, slide) {
        $(slide).css('opacity', index == slideIndex ? 1 : 0);
    });
}

$(window).on('resize', onResize);

$('#next').click(function () {
    moveBy(1);
});

$('#previous').click(function () {
    moveBy(-1);
});

$('#questions').click(function () {
    $('#questions-area').toggleClass('on');
});

var $slides = $('.slide');
var slideCount = $slides.length;
var slideIndex = location.hash.replace('#', '');

transition();
onResize();


setTimeout(function () {
    $slides.css('transition', 'opacity 0.5s');
}, 100);
