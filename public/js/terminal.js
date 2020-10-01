var terminalContainer = document.getElementById('terminal-container');
var term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'monospace',
    cols: 150
});
window.term = term;
term.setOption('theme', {
    background: '#ffffff',
    white: '#aeaeae',
    foreground: '#393939',
    cursor: '#393939',
    cursorAccent: '#393939',
    lineHeight: '1.5',
    selection: 'rgba(57,57,57,0.4)',
});


window.copyTerminal = function () {
    term.resize(200,50)
    /*window.copiedtext = term.getSelection();
    term.clearSelection();*/
}

window.lightMode = function () {
    term.setOption('theme', {
        background: '#ffffff',
        white: '#aeaeae',
        foreground: '#393939',
        cursor: '#393939',
        cursorAccent: '#393939',
        lineHeight: '1.5',
        selection: 'rgba(57,57,57,0.4)',
    });
}
window.darkMode = function () {
    term.setOption('theme', {
        background: '#242424',
        white: '#f3f3f3',
        foreground: '#f3f3f3',
        cursor: '#f3f3f3',
        cursorAccent: '#f3f3f3',
        lineHeight: '1.5',
        selection: 'rgba(121,121,121,0.4)',
    });
}
term.open(terminalContainer);


ws = new WebSocket("ws://" + window.location.host);
ws.onopen = function () {
    ws.send(JSON.stringify({
        "action": "START_SHELL",
        "params": {
            serverName: 'myServer',
            token: localStorage.getItem('token') || '',
        }
    }));

    term.on('data', function (data) {
        ws.send(data);
    });
};
ws.onmessage = function (data) {
    term.write(data.data);
};
ws.onclose = function () {
    term.write('\r\nConnection closed from remote host.\r\n');
}