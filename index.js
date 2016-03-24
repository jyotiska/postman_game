var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var rooms = ['Basement'];
var usernames = {"Basement": []};
var game_list = {"Basement": 0};
var game_number = {"Basement": 0};
var game_progress = {"Basement": {}};

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    socket.on('new_user', function(username) {
        socket.username = username;
        socket.room = 'Basement';
        socket.join('Basement');
        socket.emit('header', 'Basement', username);
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
        socket.emit('header', socket.room, socket.username);
        socket.emit('refresh_users', usernames[socket.room]);
    });

    socket.on('chat_message', function(text) {
        io.sockets["in"](socket.room).emit('send_message', socket.username + ": " + text);
    });

    socket.on('join_room', function(room) {
        if (rooms.indexOf(room) < 0) {
            rooms.push(room);
            usernames[room] = [];
            game_list[room] = 0;
            game_number[room] = 0;
            game_progress[room] = {};
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
        socket.emit('header', room, socket.username);
        socket.broadcast.to(room).emit('send_message', socket.username + ' has joined this room');
        socket.emit('refresh_rooms', rooms);
        socket.emit('refresh_users', usernames[socket.room]);
    });

    socket.on('start_game', function(number) {
        if (game_list[socket.room] == 1) {
            socket.emit('send_message', 'A game is already in progress.');
        } else if (usernames[socket.room].length < 2 || usernames[socket.room].length > 4) {
            socket.emit('send_message', 'Cannot start the game. The number of users in this room to play this game should be between 2 to 4.');
        }
        else {
            var remainingPlayers = [];
            for (var i=0; i < usernames[socket.room].length; i++) {
                if (usernames[socket.room][i] != socket.username) {
                    remainingPlayers.push(usernames[socket.room][i]);
                    game_progress[socket.room][usernames[socket.room][i]] = 0;
                }
            }
            io.sockets["in"](socket.room).emit('send_message', socket.username + ' has started the game. Please choose a number between 1 and 1000 and send a message as - /play <your_number>.');
            io.sockets["in"](socket.room).emit('send_message', 'Waiting for - ' + remainingPlayers.join(',') + '...');
            game_list[socket.room] = 1;
            game_number[socket.room] = Math.floor(Math.random() * 1000);
            game_progress[socket.room][socket.username] = parseInt(number);
        }
    });

    socket.on('play_game', function(number) {
        if (game_list[socket.room] == 0) {
            socket.emit('send_message', 'No active game found. Please start game using /start');
        } else if (game_progress[socket.room][socket.username] != 0) {
            socket.emit('send_message', 'You have already played your turn');
        } else {
            var remainingPlayers = [];
            for (var i=0; i < usernames[socket.room].length; i++) {
                if (usernames[socket.room][i] != socket.username && game_progress[socket.room][usernames[socket.room][i]] == 0) {
                    remainingPlayers.push(usernames[socket.room][i]);
                }
            }
            if (remainingPlayers.length > 0) {
                io.sockets["in"](socket.room).emit('send_message', socket.username + ' has entered. Waiting for ' + remainingPlayers.join(','));
            }
            game_progress[socket.room][socket.username] = parseInt(number);
            checkGame();
        }
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

    function checkGame() {
        var gameComplete = true;
        var allValues = [];
        var closestNum = "";

        function getClosest(array, num) {
            var i=0;
            var minDiff=1000;
            var ans;
            for (i in array) {
                 var m = Math.abs(num - array[i]);
                 if(m < minDiff){
                    minDiff=m;
                    ans=array[i];
                }
            }
            return ans;
        }
        for (key in game_progress[socket.room]) {
            if (game_progress[socket.room][key] == 0) {
                gameComplete = false;
            }
            allValues.push(game_progress[socket.room][key]);
        }

        if (gameComplete == true) {
            closestNum = getClosest(allValues, game_number[socket.room]);
            for (key in game_progress[socket.room]) {
                if (game_progress[socket.room][key] == closestNum) {
                    io.sockets["in"](socket.room).emit('send_message', 'Game complete. ' + key + ' is the winner!');
                }
            }
            game_progress[socket.room] = {};
            game_list[socket.room] = 0;
            game_number[socket.room] = 0;
        }
    }

    function refreshStats() {
        socket.emit('refresh_rooms', rooms);
        socket.emit('refresh_users', usernames[socket.room]);
    }
    setInterval(refreshStats, 3*1000);
});

http.listen(3000, function() {
    console.log("Listening on *:3000");
});
