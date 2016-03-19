var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var rooms = ['Basement'];

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    socket.on('chat message', function(msg){
        io.emit('chat message', msg);
    });

    socket.on('new_user', function(username) {
        socket.username = username;
        socket.room = 'Basement';
        socket.join('Basement');
        socket.emit('header', 'Basement');
        socket.emit('refresh_rooms', rooms);
    });

    socket.on('change_nick', function(newname) {
        socket.username = newname;
    });

    socket.on('chat_message', function(text) {
        io.sockets["in"](socket.room).emit('send_message', socket.username + ": " + text);
    });

    socket.on('/join_room', function(room) {
        if (rooms.indexOf(room) < 0) {
            rooms.push(room);
            socket.emit('refresh_rooms', rooms);
        }
        var current_room = socket.room;
        socket.leave(current_room);
        socket.join(room);
        socket.emit('send_message', 'You are now in ' + room);
        socket.broadcast.to(current_room).emit('send_message', socket.username + ' has left this room');
        socket.room = room;
        socket.broadcase.to(room).emit('send_message', socket.username + ' has joined this room');
        socket.emit('refresh_rooms', rooms);
    });
});

http.listen(3000, function() {
    console.log("Listening on *:3000");
});
