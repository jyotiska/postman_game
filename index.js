var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var rooms = ['Basement'];
var usernames = {"Basement": []};

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    socket.on('new_user', function(username) {
        socket.username = username;
        socket.room = 'Basement';
        socket.join('Basement');
        socket.emit('header', 'Basement');
        socket.emit('refresh_rooms', rooms);
        socket.broadcast.to(socket.room).emit('send_message', socket.username + ' has joined this room');
        usernames["Basement"].push(username);
        socket.emit('refresh_users', usernames['Basement']);
    });

    socket.on('change_nick', function(newname) {
        var nickIndex = usernames[socket.room].indexOf(socket.username);
        if (nickIndex > -1) {
            usernames[socket.room].splice(nickIndex, 1);
        }
        socket.username = newname;
        usernames[socket.room].push(newname);
        socket.emit('refresh_users', usernames[socket.room]);
    });

    socket.on('chat_message', function(text) {
        io.sockets["in"](socket.room).emit('send_message', socket.username + ": " + text);
    });

    socket.on('join_room', function(room) {
        if (rooms.indexOf(room) < 0) {
            rooms.push(room);
            usernames[room] = [];
            socket.emit('refresh_rooms', rooms);
        }
        var current_room = socket.room;
        socket.leave(current_room);
        var nickIndex = usernames[current_room].indexOf(socket.username);
        if (nickIndex > -1) {
            usernames[current_room].splice(nickIndex, 1);
        }
        socket.join(room);
        usernames[room].push(socket.username);
        socket.emit('send_message', 'You are now in ' + room);
        socket.broadcast.to(current_room).emit('send_message', socket.username + ' has left this room');
        socket.room = room;
        socket.emit('header', room);
        socket.broadcast.to(room).emit('send_message', socket.username + ' has joined this room');
        socket.emit('refresh_rooms', rooms);
        socket.emit('refresh_users', usernames[socket.room]);
    });

    socket.on('disconnect', function() {
        var nickIndex = usernames[socket.room].indexOf(socket.username);
        if (nickIndex > -1) {
            usernames[socket.room].splice(nickIndex, 1);
        }
        socket.emit('refresh_users', usernames[socket.room]);
        socket.broadcast.to(socket.room).emit('send_message', socket.username + ' has disconnected');
        socket.leave(socket.room);
    });

    function refreshStats() {
        socket.emit('refresh_rooms', rooms);
        socket.emit('refresh_users', usernames[socket.room]);
    }
    setInterval(refreshStats, 3*1000);
});

http.listen(3000, function() {
    console.log("Listening on *:3000");
});
