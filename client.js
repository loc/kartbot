var socket = require('net').Socket();

var server = "irc.foonetic.net",
	port = 6667,
	channel = "roomkey-kart",
	name = 'rkart';

socket.connect(port, server);

var send = function(msg, options) {

	setTimeout(function() {
		socket.write(msg + "\r\n");
	}, options && options.delay || 0);
}

socket.on('connect', function() {
	console.log('connected');
	send("NICK KartGod", {delay: 1000});
	send("USER KartGod KartGod KartGod :Kart God", {delay: 1000});
	send("JOIN #kart c0pt3r", {delay: 2000});
	send("PRIVMSG #kart :Hello Kart Players, your God is here.", {delay: 3000});
})

socket.on('data', function(d) {
	var str = d.toString('utf8');
	if (str.indexOf('PING') === 0) {
		socket.write(str.replace(/^PING/, "PONG") + "\r\n");
	}
	console.log(str);
});

process.on('SIGINT', function() {
	socket.write("QUIT\r\n");
	socket.end();
});