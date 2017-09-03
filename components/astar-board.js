const logger = require('winston');

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');

// ===  Memory Map  ===
var MMAP_CONFIG_SECT_START = 0;
var MMAP_CONFIG_SECT_LEN = 1;


// --- INPUT SECTION ---
var MMAP_INPUT_SECT_START = 1;
var MMAP_INPUT_SECT_LEN = 16;
// - Absolute Positions in the main buffer
var MMAP_INPUT_BUTTONS = 1;
var MMAP_INPUT_DIGITAL = 2;
var MMAP_INPUT_ANALOG = 3; // These are uint_16ts
var MMAP_INPUT_BATT = 15;
// - Relative Positions in the partial buffer (0-based)
var MMAP_INPUT_BUTTONS_REL = 0;
var MMAP_INPUT_DIGITAL_REL = 1;
var MMAP_INPUT_ANALOG_REL = 2;
var MMAP_INPUT_BATT_REL = 14;

// --- OUTPUT SECTION ---
var MMAP_OUTPUT_SECT_START = 17;
var MMAP_OUTPUT_SECT_LEN = 13;
var MMAP_OUTPUT_LED_RED = 17;
var MMAP_OUTPUT_LED_GREEN = 18;
var MMAP_OUTPUT_LED_YELLOW = 19;
var MMAP_OUTPUT_DIGITAL = 20; // 6 of these, bytes
var MMAP_OUTPUT_MOTOR0 = 26;
var MMAP_OUTPUT_MOTOR1 = 28;

class MockAstarBoard {
    constructor(i2c, serverPort) {
        
        this.d_i2c = i2c;

        this.d_port = serverPort;
        this.d_app = express();
        this.d_httpServer = http.Server(this.d_app);
        this.d_io = socketio(this.d_httpServer);

        this.d_boardState = {
            buttons: {
                buttonA: false,
                buttonB: false,
                buttonC: false,
            },
            battMV: 0.0,
            leds: {
                red: false,
                green: false,
                yellow: false,
            },
            motors: {
                0: 0.0,
                1: 0.0
            },
            digitalIn: [
                false,
                false,
                false,
                false,
                false,
                false
            ],
            analogIn: [
                0.0,
                0.0,
                0.0,
                0.0,
                0.0,
                0.0, // <-- Fake value
            ],
            digitalOut: [
                false,
                false,
                false,
                false,
                false,
                false
            ]
        };

        this.d_i2cPolling = setInterval(this._processI2c.bind(this), 100);
        this.d_lastUpdate = 0;

        this._setupServer();
    }

    _setupServer() {
        this.d_app.use(express.static(path.join(__dirname, '../client/astar-board')));
        this.d_app.get('/', (req, res) => {
            console.log('dirname = ', __dirname);
            res.sendFile('index.html', { root: path.join(__dirname, '../client/astar-board') });
        });

        this.d_io.on('connection', (socket) => {
            socket.emit('stateUpdate', this.d_boardState);

            socket.on('buttonChanged', (buttonData) => {
                this.d_boardState.buttons[buttonData.button] = buttonData.value;
                socket.broadcast.emit('stateUpdate', this.d_boardState);

                // Generate the button values
                var buttonVal = 0;
                buttonVal = (this.d_boardState.buttons.buttonA ? 1 : 0) |
                            (this.d_boardState.buttons.buttonB ? (1 << 1) : 0) |
                            (this.d_boardState.buttons.buttonC ? (1 << 2) : 0);
                this.d_i2c.writeByteSync(0x20, 1, buttonVal);
            });

        });

        this.d_httpServer.listen(this.d_port, () => {
            logger.info('Mock AstarBoard server listening on *:' + this.d_port);
        });
    }

    _processI2c() {
        // Really, we are reading the 'output' section
        var buf = Buffer.allocUnsafe(32);
        this.d_i2c.readI2cBlock(this.d_addr, 0, 32, buf, (err, bytesRead, inpBuf) => {
            if (err) {
                logger.error('Error reading I2C bus: ', err);
                return;
            }
            var timestamp = Date.now();
            if (timestamp > this.d_lastUpdate) {
                var ledRed = buf.readUInt8(17);
                var ledGreen = buf.readUInt8(18);
                var ledYellow = buf.readUInt8(19);
                var doutVals = [false, false, false, false, false, false];
                for (var i = 0; i < 6; i++) {
                    doutVals[i] = (buf.readUInt8(20 + i) === 1);
                }
                var leftMotor = buf.readInt16BE(26);
                var rightMotor = buf.readInt16BE(28);

                this.d_boardState.leds.red = ledRed;
                this.d_boardState.leds.green = ledGreen;
                this.d_boardState.leds.yellow = ledYellow;

                // TODO handle digital output

                this.d_boardState.motors[0] = leftMotor;
                this.d_boardState.motors[1] = rightMotor;

                this.d_lastUpdate = timestamp;

                this.d_io.emit('stateUpdate', this.d_boardState);
            }
        });
    }

}

module.exports = MockAstarBoard;