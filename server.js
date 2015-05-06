var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));

var sockets = [];
var channels = [];
var rosters = [];
var command = [];

channels.push({name:'home'},{name:'channel_1'},{name:'channel_2'},{name:'channel_3'});

command['nick'] = changeName;
command['list'] = displayChannels;
command['join'] = joinChannel;
command['part'] = quitChannel;
command['users'] = usersInChannel;
command['msg'] = mpUser;

io.on('connection', function (socket) {

	channels.forEach(function (data) {
		socket.emit('channels', data);
	});

	rosters.forEach(function (data) {
		socket.emit('rosters', data);
	});

	sockets.push(socket);

	socket.on('disconnect', function () {
		sockets.splice(sockets.indexOf(socket), 1);
		updateRoster();
		updateRosters();
	});

	socket.on('identify', function (name) {
		var username = name;
		var i = 1;
		while(existUser(username)) {
			username = name + i;
			i++;
		}
		socket.set('name', String(username), function (err) {
			socket.emit('name', String(username));
			updateRoster();
			updateRosters();
		});
	});

	socket.on('joinchannel', function (name) {
		socket.set('channel', String(name || 'home'), function (err) {
			socket.emit('channel', String(name));
			updateRoster();
			updateRosters();
		});
		messageSystemForChannel(getName(socket) + ' join channel ' + getChannel(socket), getChannel(socket));
	});

	socket.on('channels', function (channel) {
		var channel = String(channel || '');
		if (!channel)
			return;
		var data = {
			name: channel
		};
		broadcast('channels', data);
		channels.push(data);
	});

	socket.on('messages', function (msg) {
		var text = String(msg || '');
		if (!text)
			return;
		if (text[0] == '/') {
			text = text.substring(1);
			getCommand(socket, text);
			return;
		}
		socket.get('channel', function (err, channel) {
			socket.get('name', function (err, name) {
				var now = date();
				var data = {
					type: 'message',
					channel: channel,
					name: name,
					text: text,
					date: now
				};
				broadcast('messages', data);
			});
		});
	});
});

/*-- Command --*/

function getCommand(socket, text) {
	var key = text.split(' ');
	var com = key[0].toLowerCase();
	if(command[com] != undefined) {
		var func = command[com];
		func(socket, text);
	} else {
		messageSystemForUser('invalid command', getName(socket));
	}
}

function changeName(socket, text) {
	text = text.split(' ');
	if (text[1] != undefined) {
		if (!existUser(text[1])) {
			if(text[1] != getName(socket)) {
				messageSystemForChannel(getName(socket) + ' change name to ' + text[1], getChannel(socket));
				socket.set('name', String(text[1]), function (err) {
					socket.emit('name', String(text[1]));
					updateRoster();
					updateRosters();
				});
			} else {
				messageSystemForUser('your name is already' + text[1], getName(socket));
			}
		} else {
			messageSystemForUser('name ' + text[1] + ' already used', getName(socket));
		}
	} else {
		messageSystemForUser('invalid command', getName(socket));
	}
}

function displayChannels(socket, text) {
	socket.set('channellist', channels, function (err) {
		socket.emit('channellist', channels);
	});
}

function joinChannel(socket, text) {
	text = text.split(' ');
	if (text[1] != undefined) {
		if (existChannel(text[1])) {
			if(text[1] != getChannel(socket)) {
				messageSystemForChannel(getName(socket) + ' leave channel ' + getChannel(socket), getChannel(socket));
				socket.set('channel', String(text[1]).toLowerCase(), function (err) {
					socket.emit('channel', String(text[1]).toLowerCase());
					updateRoster();
					updateRosters();
				});
				messageSystemForChannel(getName(socket) + ' join channel ' + getChannel(socket), getChannel(socket));
			} else {
				messageSystemForUser('you are in channel ' + text[1], getName(socket));
			}
		} else {
			messageSystemForUser('channel ' + text[1] + ' is not found', getName(socket));
		}
	} else {
		messageSystemForUser('invalid command', getName(socket));
	}
}

function quitChannel(socket, text) {
	text = text.split(' ');
	if (text[1] != undefined) {
		socket.get('channel', function (err, channel) {
			if (text[1] == channel) {
				messageSystemForChannel(getName(socket) + ' leave channel ' + getChannel(socket), getChannel(socket));
				socket.set('channel', String('home'), function (err) {
					socket.emit('channel', String('home'));
					updateRoster();
					updateRosters();
				});
				messageSystemForChannel(getName(socket) + ' join channel ' + getChannel(socket), getChannel(socket));
			}
		});
	} else {
		messageSystemForUser('invalid command', getName(socket));
	}
}

function usersInChannel(socket, text) {
	socket.get('channel', function (err, channel) {
		rosters.forEach(function (roster) {
			if (channel == roster.channel) {
				socket.set('userlist', roster.roster, function (err) {
					socket.emit('userlist', roster.roster);
				});
			}
		});
	});
}

function mpUser(socket, text) {
	text = text.split(' ');
	if (text[1] != undefined) {
		var user = text[1];
		if (existUser(user))
		{
			if (text[2] != undefined) {
				var msg = '';
				for (var i in text) {
					if(i != 0 && i != 1) {
						if (i == 2) {
							msg += text[i];
						} else {
							msg += ' ' + text[i];
						}
					}
				}
				socket.get('name', function (err, name) {
					var now = date();
					var data = {
						type: 'mp',
						mpFrom: name,
						mpTo: user,
						text: msg,
						date: now
					};
					broadcast('messages', data);
				});
			}
		}
	}
}

/*-- End Command --*/

function date() {
	var date = new Date();
	var zero = "00";
	var day = date.getDate();
	var month = date.getMonth()+1;
	var year = date.getFullYear();
	var hours = ""+date.getHours();
	hours = zero.substring(0, zero.length-hours.length)+hours;
	var minutes = ""+date.getMinutes();
	minutes = zero.substring(0, zero.length-minutes.length)+minutes;
	var seconds = ""+date.getSeconds();
	seconds = zero.substring(0, zero.length-seconds.length)+seconds;
	return day+'/'+month+'/'+year+' '+hours+':'+minutes+':'+seconds;
}

function existChannel(name)
{
	var exist = false;
	channels.forEach(function (channel) {
		if (name.toLowerCase() == channel.name.toLowerCase()) {
			exist = true;
		}
	});
	return exist;
}

function existUser(name)
{
	var exist = false;
	if(name.toLowerCase() == 'system') {
		exist = true;
	}
	if(name.toLowerCase() != 'system') {
		sockets.forEach(function (socket) {
			socket.get('name', function (err, username) {
				if(username != undefined) {
					if (name.toLowerCase() == username.toLowerCase()) {
						exist = true;
					}
				}
			});
		});
	}
	return exist;
}

function getName(socket) {
	var user = '';
	socket.get('name', function (err, name) {
		user = name;
	});
	return user;
}

function getChannel(socket) {
	var chan = '';
	socket.get('channel', function (err, channel) {
		chan = channel;
	});
	return chan;
}

function messageSystemForUser(msg, user) {
	var now = date();
	var data = {
		type: 'mpSystem',
		mpFrom: 'SYSTEM',
		mpTo: user,
		text: msg,
		date: now
	};
	broadcast('messages', data);
}

function messageSystemForChannel(msg, channel) {
	var now = date();
	var data = {
		type: 'messageSystem',
		channel: channel,
		name: 'SYSTEM',
		text: msg,
		date: now
	};
	broadcast('messages', data);
}

function updateRoster() {
	async.map(
		sockets,
		function (socket, callback) {
			socket.get('name', callback);
		},
		function (err, names) {
			broadcast('roster', names);
		}
	);
}

function updateRosters() {
	var data = [];
	sockets.forEach(function (socket) {
		socket.get('channel', function (err, channel) {
			socket.get('name', function (err, name) {
				if(channel != undefined && name != undefined) {
					var user = {
						channel: channel,
						name: name,
					};
					data.push(user);
				}
			});
		});
	});

	var tab = [];
	
	for (var i in channels) {
		var nb = 0;
		elem = {channel: channels[i].name, roster: 0, nb: 0};
		var names = [];
		for (var c in data) {
			if(data[c].channel == channels[i].name) {
				names[nb] = data[c].name;
				nb += 1;
				elem.nb = nb;
			}
		}
		elem.roster = names;
		tab.push(elem);
	}
	broadcast('rosters', tab);
	rosters = tab;
}

function broadcast(event, data) {
	sockets.forEach(function (socket) {
		socket.emit(event, data);
	});
}

server.listen(process.env.PORT || 80, process.env.IP || "irc", function() {
	var addr = server.address();
	console.log("Irc server listening at", addr.address + ":" + addr.port);
});