const I2C = require('./components/i2c');
const AstarBoard = require('./components/astar-board');

var i = new I2C(6968);
var b = new AstarBoard(i, 6969);

module.exports = {
    I2C: I2C
};