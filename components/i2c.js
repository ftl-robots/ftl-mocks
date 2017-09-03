const { Interfaces } = require('ftl-robot-host');
const logger = require('winston');

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');

class MockI2C extends Interfaces.I2C {
    constructor(serverPort) {
        super();
        this.d_port = serverPort;
        this.d_app = express();
        this.d_httpServer = http.Server(this.d_app);
        this.d_io = socketio(this.d_httpServer);

        this.d_buffer = [];

        this._initBuffer();
        this._setupServer();

    }

    _setupServer() {
        this.d_app.use(express.static(path.join(__dirname, '../client/i2x')));
        this.d_app.get('/', (req, res) => {
            res.sendFile('index.html', { root: path.join(__dirname, '../client/i2c') });
        });

        this.d_io.on('connection', (socket) => {
            // TODO handle connection
            //send an immediate update with our buffer state
            socket.emit('bufferUpdate', this.d_buffer);

            socket.on('byteChanged', (evt) => {
                this.d_buffer[evt.idx] = evt.newVal;
                socket.broadcast.emit('bufferUpdate', this.d_buffer);
            });
        });

        this.d_httpServer.listen(this.d_port, () => {
            logger.info('Mock I2C server listening on *:' + this.d_port);
        });
    }

    _initBuffer() {
        this.d_buffer.length = 0;
        for (var i = 0; i < 32; i++) {
            this.d_buffer.push(0);
        }
    }

    _updateClients() {
        // Update all clients with the current buffer state
        this.d_io.emit('bufferUpdate', this.d_buffer);
    }

    // === I2C Interface Methods
    close(cb) {
        this.d_io.emit('close');
        if (cb) {
            cb();
        }
    }

    closeSync() {
        this.d_io.emit('close');
    }

    readByteSync(addr, cmd) {
        return this.d_buffer[cmd];
    }

    readByte(addr, cmd, cb) {
        if (cb) {
            cb(null, this.readByteSync(addr, cmd));
        }
    }

    readWordSync(addr, cmd) {
        var val = ((this.d_buffer[cmd] << 8) & 0xFF00) | (this.d_buffer[cmd + 1] & 0xFF);
        return val;
    }

    readWord(addr, cmd, cb) {
        if (cb) {
            cb(null, this.readWordSync(addr, cmd));
        }
    }

    readI2cBlockSync(addr, cmd, length, buffer) {
        for (var i = 0; i < length; i++) {
            buffer[i] = this.d_buffer[cmd + i];
        }

        return length;
    }

    readI2cBlock(addr, cmd, length, buffer, cb) {
        if (cb) {
            var l = this.readI2cBlockSync(addr, cmd, length, buffer);
            cb(null, length, buffer);
        }
    }

    writeByteSync(addr, cmd, byte) {
        this.d_buffer[cmd] = byte;
        this._updateClients();
    }

    writeByte(addr, cmd, byte, cb) {
        this.writeByteSync(addr, cmd, byte);
        if (cb) {
            cb(null);
        }
    }

    writeWordSync(addr, cmd, word) {
        this.d_buffer[cmd] = (word >> 8) & 0xFF;
        this.d_buffer[cmd + 1] = (word & 0xFF);
        this._updateClients();
    }

    writeWord(addr, cmd, word, cb) {
        this.writeWordSync(addr, cmd, word);
        if (cb) {
            cb(null);
        }
    }

    writeI2cBlockSync(addr, cmd, length, buffer) {
        for (var i = 0; i < length; i++) {
            this.d_buffer[cmd + i] = buffer[i];
        }
        this._updateClients();
    }

    writeI2cBlock(addr, cmd, length, buffer, cb) {
        this.writeI2cBlockSync(addr, cmd, length, buffer);
        if (cb) {
            cb(null, length, buffer);
        }
    }
}

module.exports = MockI2C;