window.addEventListener('load', function () {

var bufferView = document.getElementById('buffer-view');

// Generate the table 
var entries = [];

for (var i = 0; i < 4; i++) {
    var headerRow = document.createElement('tr');
    var entryRow = document.createElement('tr');

    for (var j = 0; j < 8; j++) {
        var idx = (i * 8) + j;
        var headerTd = document.createElement('th');
        headerTd.innerHTML = idx;
        headerTd.style = 'text-align: center;';
    
        var entryTd = document.createElement('td');
        var entryObj = document.createElement('input');
        entryObj.min = 0;
        entryObj.max = 255;
        entryObj.type = 'number';
        entryObj.id = 'byte-' + idx;
        entryObj.style = 'text-align: center; width: 3em';
        entryObj.addEventListener('change', onEntryChanged.bind(null, idx));
        entryTd.appendChild(entryObj);
    
        headerRow.appendChild(headerTd);
        entryRow.appendChild(entryTd);
    
        entries.push(entryObj);
    }

    bufferView.appendChild(headerRow);
    bufferView.appendChild(entryRow);
}

// Initialize the buffer
var dataBuf = [];

for (var i = 0; i < 32; i++) {
    dataBuf.push(0);
}

var socket = io();

// === Initialization Code
updateEntries();

socket.on('bufferUpdate', function (newBuf) {
    dataBuf = newBuf;
    updateEntries();
});
// === End Initialization Code


// === Helper functions ===
function updateEntries() {
    for (var i = 0; i < 32; i++) {
        entries[i].value = dataBuf[i];
    }
}

function onEntryChanged(idx, event) {
    var newVal = entries[idx].value;
    if (!newVal) {
        newVal = 0;
        entries[idx].value = 0;
    }

    dataBuf[idx] = newVal;
    socket.emit('byteChanged', {
        idx: idx,
        newVal: newVal
    });

    console.log('byte ' + idx + ' changed to: ' + newVal)
}
});