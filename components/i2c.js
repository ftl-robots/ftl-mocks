const { Interfaces } = require('ftl-robot-host');
const logger = require('winston');

const express = require('express');
const http = require('http');
const socketio = require('socket.io');

class MockI2C extends Interfaces.I2C {
    constructor(serverPort) {
        this.d_app = express();
        this.d_httpServer = http.Server(this.d_app);
        this.d_io = socketio(this.d_httpServer);

        this._setupServer();
    }

    _setupServer() {
        this.d_app.use(express.static('client/i2c'));
        this.d_app.get('/', (req, res) => {
            res.sendFile(__dirname + '/client/i2c/index.html');
        });

        this.d_io.on('connection', (socket) => {
            // TODO handle connection
        });

        this.d_httpServer.listen(serverPort, () => {
            logger.info('Mock I2C server listening on *:' + serverPort);
        });
    }
}


app.use(express.static('public_html'));

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/public_html/index.html');
});

io.on('connection', function (socket) {
	var clientId = generateUUID();
	userManager.registerUser(clientId, socket);
});

http.listen(3000, function () {
	console.log('WebApp server listening on *:3000');
});