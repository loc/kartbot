var socket = require('net').Socket(),
	_ = require("underscore");

var server = "irc.foonetic.net",
	port = 6667,
	channel = "#kart",
	name = 'KartBot';

socket.connect(port, server);

var util = {
	sep: function() {
		return Array.prototype.slice.call(arguments).slice().join(" ");
	}
};

var chat = {
	handshake: function(name, cb) {
		var self = this;
		this.wait(function() {
			self.sendAll([
				"NICK " + name,
				"USER " + util.sep(name, name, name, ":" + name)
			], cb);
		});
	},
	wait: function(fn, delay) {
		// make this chainable
		setTimeout(fn, delay || 1000); 
	},
	join: function(channel, options) {
		var self = this;
		this.wait(function() {
			self.send("JOIN " + channel + (options.password ? " " + options.password : ""));
			if (options.msg)
				self.wait(function() {
					self.msg(options.msg);
				});
		});
	},
	msg: function(msg) {
		this.send("PRIVMSG " + channel + " :" + msg);
	},
	send: function(msg, cb, options) {
		if (_.isArray(msg))
			this.sendAll(msg, cb);

		var delay = options && options.delay || 0;

		setTimeout(function() {
			socket.write(msg + "\r\n");
			if (cb) cb();
		}, delay);
	},
	sendAll: function(msgs, cb) {
		var self = this;
		callback = _.after(msgs.length, cb);
		_.each(msgs, function(msg) {
			self.send(msg, callback);
		});
	}
};

var kart = {
	players: [],
	active: false,
	cupholder: "davids",

	parse: function(line, stripColors) { // {{{
	    var message = {};
	    var match;

	    if (stripColors) {
	        line = line.replace(/[\x02\x1f\x16\x0f]|\x03\d{0,2}(?:,\d{0,2})?/g, "");
	    }

	    if ( match = line.match(/^:([^ ]+) +/) ) {
	        message.prefix = match[1];
	        line = line.replace(/^:[^ ]+ +/, '');
	        if ( match = message.prefix.match(/^([_a-zA-Z0-9\[\]\\`^{}|-]*)(!([^@]+)@(.*))?$/) ) {
	            message.nick = match[1];
	            message.user = match[3];
	            message.host = match[4];
	        }
	        else {
	            message.server = message.prefix;
	        }
	    }

	    match = line.match(/^([^ ]+) */);
	    message.command = match[1];
	    message.rawCommand = match[1];
	    message.commandType = 'normal';
	    line = line.replace(/^[^ ]+ +/, '');

	    message.args = [];
	    var middle, trailing;

	    if ( line.search(/^:|\s+:/) != -1 ) {
	        match = line.match(/(.*?)(?:^:|\s+:)(.*)/);
	        middle = match[1].trimRight();
	        trailing = match[2];
	    }
	    else {
	        middle = line;
	    }

	    if ( middle.length )
	        message.args = middle.split(/ +/);

	    if ( typeof(trailing) != 'undefined' && trailing.length )
	        message.args.push(trailing);

	    return message;
	},

	eval: function(str, msg) {
		str = str.toLowerCase().trim();

		console.log(str);

		switch (str) {
			case "let's play":
			case "lets play":
			case "game on":
			case "who's in":
			case "kart?":
			case "time for kart":
				this.game(msg.nick);
				break;
			case "i'm in":
			case "i'll play":
			case "yep":
			case "yes":
			case "in":
				this.joinGame(msg.nick);
				break;
			case "cancel":
				this.cancel();
				break;
			case "i won":
				this.winner(msg.nick);
				break;
			case "cupholder":
			case "who has the cup":
				this.cupholder();
				break;
			case "who's playing?":
			case "current players":
			case "players":
				chat.msg(this.players.length ? "Currently playing: " + this.players.join(", ") : "There is no one playing right now.");
				break;
		}
	},
	cupholder: function(player) {
		if (this.cupholder) {
			chat.msg(this.cupholder + " currently holds the cup.");
		}
		else {
			chat.msg("No idea. Probably andyl.");
		}
	},
	winner: function(player) {
		// store winner stats somewhere
		chat.msg('Congrats, ' + player + "!");
		if (~this.players.indexOf(this.cupholder)) {
			if (this.cupholder === player) {
				chat.msg(player + " retains the cup.");
			}
			else {
				this.cupholder = player;
				chat.msg(player + " now holds the cup.");
			}
		}
		this.clearGame();
	},
	clearGame: function() {
		this.players = [];
		this.active = false;
	},
	cancel: function() {
		this.clearGame();
		chat.msg("Cancelling game. Kart giveth, and kart taketh away.");
	},
	joinGame: function(player) {
		if (this.active && this.players.length !== 4) {
			this.players.push(player);
			var output = "Adding " + player + ". ";
			if (this.players.length === 4) {
				output += "Game is now full. Good luck to all!";
			}
			else if (this.players.length === 3) {
				output += "Need one more.";
			}
			else if (this.players.length === 2) {
					output += "Two more players.";
			}
			chat.msg(output);
		}
		else {
			chat.msg("There is currently a match going on.");
		}
	},
	game: function(player) {
		if (!this.active) {
			this.active = true;
			this.players.push(player);
			chat.msg("Game started by " + player + ". Waiting for 3 more players.");
		}
		else {
			chat.msg("There is already a game in progress. Type 'players' to see who is playing or 'cancel' to end the current game.");
		}
	},
}


socket.on('connect', function() {
	console.log('connected');
	chat.handshake(name, function() {
		chat.wait(function() {
			chat.join("#kart", {
				password: "c0pt3r",
				msg: "Mario Kart, Wii!"
			})
		}, 3000);
	});
})

socket.on('data', function(d) {
	var str = d.toString('utf8');
	if (str.indexOf('PING') === 0) {
		socket.write(str.replace(/^PING/, "PONG") + "\r\n");
		return;
	}
	else {
		var msg = kart.parse(str);
		if (msg.command === "PRIVMSG") {
			kart.eval(_.last(msg.args), msg);
		}
	}
	console.log(str);
});

process.on('SIGINT', function() {
	socket.write("QUIT\r\n");
	socket.end();
});