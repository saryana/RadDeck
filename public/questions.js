var userId = document.cookie.replace('studentId=', '');

$('#submit-question').click(function() {
	var $questionArea = $('#question-text');
	var question = $questionArea.val().substring(0, 50);
	$questionArea.val('');
	socket.emit('postQuestion', question);
});