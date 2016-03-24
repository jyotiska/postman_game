var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var rooms = ['Basement'];
var usernames = {
    'Basement': []
};
var gameList = {
    'Basement': 0
};
var gameNumber = {
    'Basement': 0
};
var gameProgress = {
    'Basement': {}
};

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    var checkGame = function () {
        var gameComplete = true;
        var allValues = [];
        var closestNum = '';

        var getClosest = function (array, num) {
            var i = 0;
            var minDiff = 1000;
            var ans;
            for (i in array) {
                var m = Math.abs(num - array[i]);
                if (m < minDiff) {
                    minDiff = m;
                    ans = array[i];
                }
            }
            return ans;
        }
        for (var key in gameProgress[socket.room]) {
            if (gameProgress[socket.room][key] === 0) {
                gameComplete = false;
            }
            allValues.push(gameProgress[socket.room][key]);
        }

        if (gameComplete === true) {
            closestNum = getClosest(allValues, gameNumber[socket.room]);
            for (key in gameProgress[socket.room]) {
                if (gameProgress[socket.room][key] == closestNum) {
                    io.sockets['in'](socket.room).emit('send_message', 'Game complete. System number was ' + gameNumber[socket.room] + '. ' + key + ' is the winner!');
                }
            }
            gameProgress[socket.room] = {};
            gameList[socket.room] = 0;
            gameNumber[socket.room] = 0;
        }
    };

    socket.on('new_user', function (username) {
        socket.username = username;
        socket.room = 'Basement';
        socket.join('Basement');
        socket.emit('header', 'Basement', username);
        socket.emit('refresh_rooms', rooms);
        socket.broadcast.to(socket.room).emit('send_message', socket.username + ' has joined this room');
        usernames.Basement.push(username);
        socket.emit('refresh_users', usernames.Basement);
    });

    socket.on('change_nick', function (newname) {
        var nickIndex = usernames[socket.room].indexOf(socket.username);
        if (nickIndex > -1) {
            usernames[socket.room].splice(nickIndex, 1);
        }
        socket.username = newname;
        usernames[socket.room].push(newname);
        socket.emit('header', socket.room, socket.username);
        socket.emit('refresh_users', usernames[socket.room]);
    });

    socket.on('chat_message', function (text) {
        io.sockets['in'](socket.room).emit('send_message', socket.username + ': ' + text);
    });

    socket.on('join_room', function (room) {
        if (rooms.indexOf(room) < 0) {
            rooms.push(room);
            usernames[room] = [];
            gameList[room] = 0;
            gameNumber[room] = 0;
            gameProgress[room] = {};
            socket.emit('refresh_rooms', rooms);
        }
        var currentRoom = socket.room;
        socket.leave(currentRoom);
        var nickIndex = usernames[currentRoom].indexOf(socket.username);
        if (nickIndex > -1) {
            usernames[currentRoom].splice(nickIndex, 1);
        }
        socket.join(room);
        usernames[room].push(socket.username);
        socket.emit('send_message', 'You are now in ' + room);
        socket.broadcast.to(currentRoom).emit('send_message', socket.username + ' has left this room');
        socket.room = room;
        socket.emit('header', room, socket.username);
        socket.broadcast.to(room).emit('send_message', socket.username + ' has joined this room');
        socket.emit('refresh_rooms', rooms);
        socket.emit('refresh_users', usernames[socket.room]);
    });

    socket.on('start_game', function (number) {
        if (gameList[socket.room] == 1) {
            socket.emit('send_message', 'A game is already in progress.');
        }
        else if (usernames[socket.room].length < 2 || usernames[socket.room].length > 4) {
            socket.emit('send_message', 'Cannot start the game. The number of users in this room to play this game should be between 2 to 4.');
        }
        else {
            var remainingPlayers = [];
            for (var i = 0; i < usernames[socket.room].length; i++) {
                if (usernames[socket.room][i] != socket.username) {
                    remainingPlayers.push(usernames[socket.room][i]);
                    gameProgress[socket.room][usernames[socket.room][i]] = 0;
                }
            }
            io.sockets['in'](socket.room).emit('send_message', socket.username + ' has started the game and entered ' + parseInt(number) + '. Please choose a number between 1 and 1000 and send a message as - /play <your_number>.');
            io.sockets['in'](socket.room).emit('send_message', 'Waiting for - ' + remainingPlayers.join(',') + '...');
            gameList[socket.room] = 1;
            gameNumber[socket.room] = Math.floor(Math.random() * 1000);
            gameProgress[socket.room][socket.username] = parseInt(number);
        }
    });

    socket.on('play_game', function (number) {
        if (gameList[socket.room] === 0) {
            socket.emit('send_message', 'No active game found. Please start game using /start');
        }
        else if (gameProgress[socket.room][socket.username] !== 0) {
            socket.emit('send_message', 'You have already played your turn');
        }
        else {
            var remainingPlayers = [];
            for (var i = 0; i < usernames[socket.room].length; i++) {
                if (usernames[socket.room][i] != socket.username && gameProgress[socket.room][usernames[socket.room][i]] === 0) {
                    remainingPlayers.push(usernames[socket.room][i]);
                }
            }
            if (remainingPlayers.length > 0) {
                io.sockets['in'](socket.room).emit('send_message', socket.username + ' has entered ' + parseInt(number) + '. Waiting for ' + remainingPlayers.join(','));
            }
            else {
                io.sockets['in'](socket.room).emit('send_message', socket.username + ' has entered ' + parseInt(number) + '.');
            }
            gameProgress[socket.room][socket.username] = parseInt(number);
            checkGame();
        }
    });

    socket.on('disconnect', function () {
        var nickIndex = usernames[socket.room].indexOf(socket.username);
        if (nickIndex > -1) {
            usernames[socket.room].splice(nickIndex, 1);
        }
        socket.emit('refresh_users', usernames[socket.room]);
        socket.broadcast.to(socket.room).emit('send_message', socket.username + ' has disconnected');
        socket.leave(socket.room);
    });

    var refreshStats = function ( ) {
        socket.emit('refresh_rooms', rooms);
        socket.emit('refresh_users', usernames[socket.room]);
    }
    setInterval(refreshStats, 3 * 1000);
});

http.listen(3000, function () {
    console.log('Listening on *:3000');
});
