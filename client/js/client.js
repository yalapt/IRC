function ChatController($scope) {
    var socket = io.connect();
    var command = [];
    command['nick'] = 'nick';
    command['list'] = 'list';
    command['join'] = 'join';
    command['part'] = 'part';
    command['users'] = 'users';
    command['msg'] = 'msg';

    $scope.channels = [];
    $scope.channellist = [];
    $scope.userlist = [];
    $scope.roster = [];
    $scope.rosters = [];
    $scope.messages = [];
    $scope.channel = '';
    $scope.name = '';
    $scope.text = '';

    socket.on('connect', function () {
        $scope.channels = [];
        socket.emit('identify', 'anonymous');
        $scope.name = 'anonymous';
        socket.emit('joinchannel', 'home');
        $scope.channel = 'home';
    });

    socket.on('name', function (name) {
        $scope.name = name;
        $scope.$apply();
    });

    socket.on('channel', function (name) {
        $scope.channel = name;
        $scope.$apply();
    });

    socket.on('channellist', function (channels) {
        $scope.channellist.push(channels);
        $scope.$apply();
    });

    socket.on('channels', function (names) {
        $scope.channels.push(names);
        $scope.$apply();
    });

    socket.on('userlist', function (users) {
        $scope.userlist = users;
        $scope.$apply();
    });

    socket.on('roster', function (names) {
        $scope.roster = names;
        $scope.$apply();
    });

    socket.on('rosters', function (rosters) {
        $scope.rosters = rosters;
        $scope.$apply();
    });

    socket.on('messages', function (msg) {
        var message = msg;
        if(message.type == 'message' || message.type == 'messageSystem') {
            if(message.channel == $scope.channel) {
                $scope.messages.push(message);
            }
        }
        if(message.type == 'mp' || message.type == 'mpSystem') {
            if(message.mpFrom == $scope.name || message.mpTo == $scope.name) {
                message.mpFrom = 'From ' + message.mpFrom;
                message.mpTo = ' to ' + message.mpTo;
                $scope.messages.push(message);
            }
        }
        $scope.$apply();
        var objDiv = document.getElementById("div-messages");
        objDiv.scrollTop = objDiv.scrollHeight;
    });

    $scope.joinChannel = function joinChannel(channel) {
        if (channel != $scope.channel) {
            socket.emit('messages', '/join ' + channel);
            $('#Channels').modal('hide');
        }
    };

    $scope.setMp = function setMp(user) {
        $scope.text = '/msg ' + user;
        $('#Users').modal('hide');
    };

    $scope.sendMessage = function sendMessage() {
        $scope.channellist = [];
        $scope.userlist = [];
        var text = $scope.text;
        if (text[0] == '/') {
            text = text.substring(1);
            if(getCommand(text) == 'list')
            {
                $('#Channels').modal('show');
            }
            if(getCommand(text) == 'users')
            {
                $('#Users').modal('show');
            }
        }
        socket.emit('messages', $scope.text);
        $scope.text = '';
    };

    function getCommand(text) {
        var key = text.split(' ');
        var com = key[0].toLowerCase();
        if(command[com] != undefined) {
            return command[com];
        } else {
            return 0;
        }
    }
}