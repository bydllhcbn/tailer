let terminalContainer = find('terminal-container');
document.addEventListener('contextmenu', event => event.preventDefault());


function clearTerminal(){
    term.clear();
}
let darkModeConfig = {
    background: '#242424',
    white: '#f3f3f3',
    foreground: '#f3f3f3',
    cursor: '#f3f3f3',
    cursorAccent: '#f3f3f3',
    lineHeight: '1.5',
    selection: 'rgba(121,121,121,0.4)',
};

let lightModeConfig = {
    background: '#ffffff',
    white: '#aeaeae',
    foreground: '#343a40',
    cursor: '#343a40',
    cursorAccent: '#343a40',
    lineHeight: '1.5',
    selection: 'rgba(57,57,57,0.4)',
};


let term = new Terminal({
    cursorBlink: true,
    fontSize: 16,
    fontFamily: 'monospace',
    cols: 150
});
window.term = term;
term.setOption('theme', darkModeConfig);
let h = ((window.innerHeight - 100) / 20) | 0;
let w = (window.innerWidth / 10) | 0;
term.resize(w, h)
window.onresize = function () {
    let h = ((window.innerHeight - 100) / 20) | 0;
    let w = (window.innerWidth / 10) | 0;
    term.resize(w, h)
}
let lights = false;

function toggleLights() {
    if (lights) {
        document.body.style.backgroundColor = "#242424";
        term.setOption('theme', darkModeConfig);
    } else {
        document.body.style.backgroundColor = "#ffffff";
        term.setOption('theme', lightModeConfig);
    }
    lights = !lights;
}
window.copyTerminal = function () {
    term.selectAll();
    Clipboard.copy(term.getSelection());
    term.clearSelection();
}

window.copySelected = function () {
    Clipboard.copy(term.getSelection());
}
term.open(terminalContainer);

if (window.location.hash) {
    let serverName = window.location.hash.substring(1);
    document.title = serverName + ' - SSH';
    term.write('Connecting to ' + serverName + '...')
    ws = new WebSocket("ws://" + window.location.host);
    ws.onopen = function () {
        ws.send(JSON.stringify({
            "action": "START_SHELL",
            "params": {
                serverName: serverName,
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
        term.write('Connection closed from remote host.\r\n');
    }
} else {
    term.write('Server is not specified...\r\n')
}
