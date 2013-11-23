$(window).ready(function () {
 
    var messages = [];
    var socket = io.connect('http://localhost:3700');
    //var content = document.getElementById("content");
 
    socket.on('connect', function (data) {
    	if (data.soc) {
    		console.log(data.soc == data.mas);
    	}
    });

 	$('#send').on('click', function() {
 		var text = $('#field').val();
        socket.emit('send', { message: text });
 	});
 
});