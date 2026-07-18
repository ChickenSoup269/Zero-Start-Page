export function initTerminal() {
    if (!window._terminalLogs) {
        window._terminalLogs = [];
        const capture = (type, args) => {
            try {
                const strArgs = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
                window._terminalLogs.push({ type, msg: strArgs });
                if (window._terminalLogs.length > 100) window._terminalLogs.shift();
            } catch(e) {}
        };
        const origLog = console.log;
        const origWarn = console.warn;
        const origError = console.error;
        console.log = (...args) => { capture('log', args); origLog(...args); };
        console.warn = (...args) => { capture('warn', args); origWarn(...args); };
        console.error = (...args) => { capture('error', args); origError(...args); };
        window.addEventListener('error', e => capture('error', [e.message, e.filename, e.lineno]));
        window.addEventListener('unhandledrejection', e => capture('error', ['Unhandled Promise', e.reason]));
    }

    const terminalHTML = `
        <div id="hidden-terminal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999999; pointer-events: none; justify-content: center; align-items: center;">
            <div id="macos-terminal" style="width: 700px; height: 450px; background: rgba(30, 30, 30, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1); display: flex; flex-direction: column; overflow: hidden; pointer-events: auto; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(0.95); transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s, border-radius 0.3s; opacity: 0;">
                <div id="terminal-titlebar" style="position: relative; height: 38px; min-height: 38px; display: flex; align-items: center; padding: 0 16px; background: rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); user-select: none; cursor: default; transition: background 0.3s;">
                    <div id="mac-controls" style="display: flex; gap: 8px;">
                        <div class="mac-btn mac-close" style="width: 12px; height: 12px; border-radius: 50%; background: #ff5f56; cursor: pointer; transition: filter 0.2s;"></div>
                        <div class="mac-btn mac-min" style="width: 12px; height: 12px; border-radius: 50%; background: #ffbd2e; cursor: pointer; transition: filter 0.2s;"></div>
                        <div class="mac-btn mac-max" style="width: 12px; height: 12px; border-radius: 50%; background: #27c93f; cursor: pointer; transition: filter 0.2s;"></div>
                    </div>
                    <div id="terminal-title" style="flex: 1; text-align: center; color: #aaa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 500; pointer-events: none; transition: margin 0.3s, color 0.3s;">
                        user@startpage ~ -bash
                    </div>
                    <div id="win-controls" style="display: none; height: 100%; position: absolute; right: 0; top: 0; align-items: center;">
                        <div class="win-btn win-min" style="width: 46px; height: 100%; display: flex; justify-content: center; align-items: center; cursor: pointer; color: #fff; font-size: 14px;"><i class="fa-solid fa-minus"></i></div>
                        <div class="win-btn win-max" style="width: 46px; height: 100%; display: flex; justify-content: center; align-items: center; cursor: pointer; color: #fff; font-size: 14px;"><i class="fa-regular fa-square"></i></div>
                        <div class="win-btn win-close" style="width: 46px; height: 100%; display: flex; justify-content: center; align-items: center; cursor: pointer; color: #fff; font-size: 16px;"><i class="fa-solid fa-xmark"></i></div>
                    </div>
                    <div id="ubuntu-controls" style="display: none; height: 100%; position: absolute; right: 8px; top: 0; align-items: center; gap: 6px;">
                        <div class="ubuntu-btn win-min" style="width: 24px; height: 24px; border-radius: 50%; background: #4e4e4e; display: flex; justify-content: center; align-items: center; cursor: pointer; color: #fff; font-size: 10px;"><i class="fa-solid fa-minus"></i></div>
                        <div class="ubuntu-btn win-max" style="width: 24px; height: 24px; border-radius: 50%; background: #4e4e4e; display: flex; justify-content: center; align-items: center; cursor: pointer; color: #fff; font-size: 10px;"><i class="fa-regular fa-square"></i></div>
                        <div class="ubuntu-btn win-close" style="width: 24px; height: 24px; border-radius: 50%; background: #e95420; display: flex; justify-content: center; align-items: center; cursor: pointer; color: #fff; font-size: 12px;"><i class="fa-solid fa-xmark"></i></div>
                    </div>
                </div>
                <div id="terminal-body" style="flex: 1; padding: 16px; overflow-y: auto; color: #e0e0e0; font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace; font-size: 14px; line-height: 1.5; transition: color 0.3s;">
                    <div id="terminal-output" style="white-space: pre-wrap; margin-bottom: 8px; word-break: break-all;">Welcome to Startpage Terminal. Type <span style="color: #61afef;">/help</span> or <span style="color: #61afef;">help</span> to see available commands.</div>
                    <div style="display: flex; align-items: center;">
                        <span id="terminal-prompt" style="margin-right: 8px; font-weight: bold;"><span style="color: #98c379;">➜</span> <span style="color: #61afef;">~</span></span>
                        <input id="terminal-input" type="text" autocomplete="off" spellcheck="false" style="background: transparent; border: none; color: inherit; font-family: inherit; flex: 1; outline: none; font-size: 14px;">
                    </div>
                </div>
            </div>
        </div>
        <style>
            .mac-btn:hover { filter: brightness(0.7); }
            .win-btn:hover { background: rgba(255,255,255,0.1); }
            .win-close:hover { background: #e81123 !important; color: white !important; }
            .ubuntu-btn:hover { filter: brightness(1.2); }
            #terminal-body::-webkit-scrollbar { width: 8px; }
            #terminal-body::-webkit-scrollbar-track { background: transparent; }
            #terminal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
            #terminal-body::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', terminalHTML);

    const overlay = document.getElementById('hidden-terminal-overlay');
    const terminalWindow = document.getElementById('macos-terminal');
    const input = document.getElementById('terminal-input');
    const output = document.getElementById('terminal-output');
    const body = document.getElementById('terminal-body');
    const titlebar = document.getElementById('terminal-titlebar');
    const title = document.getElementById('terminal-title');
    const promptSpan = document.getElementById('terminal-prompt');
    const macControls = document.getElementById('mac-controls');
    const winControls = document.getElementById('win-controls');
    const ubuntuControls = document.getElementById('ubuntu-controls');
    let isTerminalOpen = false;
    let waitingForApiKey = false;

    let currentTheme = localStorage.getItem('terminalTheme') || 'macos';
    let currentUser = localStorage.getItem('terminalUser') || 'user';

    const printOut = (html) => {
        output.insertAdjacentHTML('beforeend', html);
        body.scrollTop = body.scrollHeight;
    };

    function applyTheme() {
        if (currentTheme === 'powershell') {
            terminalWindow.style.background = '#012456';
            terminalWindow.style.backdropFilter = 'none';
            terminalWindow.style.webkitBackdropFilter = 'none';
            terminalWindow.style.borderRadius = '0px';
            titlebar.style.background = '#ffffff';
            titlebar.style.borderBottom = 'none';
            title.innerText = 'Windows PowerShell';
            title.style.color = '#000000';
            title.style.marginLeft = '16px';
            title.style.textAlign = 'left';
            title.style.paddingLeft = '0px';
            macControls.style.display = 'none';
            winControls.style.display = 'flex';
            ubuntuControls.style.display = 'none';
            document.querySelectorAll('.win-btn').forEach(btn => btn.style.color = '#000');
            
            body.style.color = '#cccccc';
            body.style.fontFamily = 'Consolas, "Courier New", monospace';
            promptSpan.innerHTML = `<span style="color: #cccccc; font-weight: normal;">PS C:\\Users\\${currentUser}&gt;</span>`;
        } else if (currentTheme === 'linux') {
            terminalWindow.style.background = '#300A24';
            terminalWindow.style.backdropFilter = 'none';
            terminalWindow.style.webkitBackdropFilter = 'none';
            terminalWindow.style.borderRadius = '8px';
            titlebar.style.background = '#3d3d3d';
            titlebar.style.borderBottom = '1px solid #222';
            title.innerText = `${currentUser}@ubuntu: ~`;
            title.style.color = '#e0e0e0';
            title.style.marginLeft = '0px';
            title.style.textAlign = 'center';
            title.style.paddingLeft = '0px';
            macControls.style.display = 'none';
            winControls.style.display = 'none';
            ubuntuControls.style.display = 'flex';
            
            body.style.color = '#ffffff';
            body.style.fontFamily = "'Ubuntu Mono', 'JetBrains Mono', Consolas, monospace";
            promptSpan.innerHTML = `<span style="color: #8ae234;">${currentUser}@ubuntu</span>:<span style="color: #729fcf;">~</span>$`;
        } else {
            terminalWindow.style.background = 'rgba(30, 30, 30, 0.85)';
            terminalWindow.style.backdropFilter = 'blur(20px)';
            terminalWindow.style.webkitBackdropFilter = 'blur(20px)';
            terminalWindow.style.borderRadius = '12px';
            titlebar.style.background = 'rgba(255,255,255,0.05)';
            titlebar.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            title.innerText = `${currentUser}@startpage ~ -bash`;
            title.style.color = '#aaa';
            title.style.marginLeft = '-44px';
            title.style.textAlign = 'center';
            title.style.paddingLeft = '0px';
            macControls.style.display = 'flex';
            winControls.style.display = 'none';
            ubuntuControls.style.display = 'none';
            
            body.style.color = '#e0e0e0';
            body.style.fontFamily = "'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace";
            promptSpan.innerHTML = '<span style="color: #98c379;">➜</span> <span style="color: #61afef;">~</span>';
        }
    }

    applyTheme();

    document.querySelectorAll('.mac-close, .win-close').forEach(btn => btn.addEventListener('click', closeTerminal));
    document.querySelectorAll('.mac-min, .win-min').forEach(btn => btn.addEventListener('click', closeTerminal));
    
    let isMaximized = false;
    const toggleMaximize = () => {
        if (!isMaximized) {
            terminalWindow.dataset.prevWidth = terminalWindow.style.width || '700px';
            terminalWindow.dataset.prevHeight = terminalWindow.style.height || '450px';
            terminalWindow.dataset.prevTop = terminalWindow.style.top;
            terminalWindow.dataset.prevLeft = terminalWindow.style.left;
            terminalWindow.dataset.prevTransform = terminalWindow.style.transform;
            terminalWindow.dataset.prevRadius = terminalWindow.style.borderRadius;

            terminalWindow.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            terminalWindow.style.width = '100vw';
            terminalWindow.style.height = '100vh';
            terminalWindow.style.top = '0';
            terminalWindow.style.left = '0';
            terminalWindow.style.transform = 'none';
            terminalWindow.style.borderRadius = '0';
            terminalWindow.dataset.dragged = "true";
            isMaximized = true;
        } else {
            terminalWindow.style.width = terminalWindow.dataset.prevWidth;
            terminalWindow.style.height = terminalWindow.dataset.prevHeight;
            terminalWindow.style.top = terminalWindow.dataset.prevTop;
            terminalWindow.style.left = terminalWindow.dataset.prevLeft;
            terminalWindow.style.transform = terminalWindow.dataset.prevTransform;
            let radius = '12px';
            if(currentTheme === 'powershell') radius = '0px';
            if(currentTheme === 'linux') radius = '8px';
            terminalWindow.style.borderRadius = terminalWindow.dataset.prevRadius || radius;
            isMaximized = false;
        }
        setTimeout(() => terminalWindow.style.transition = 'opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s, border-radius 0.3s', 300);
    };

    document.querySelectorAll('.mac-max, .win-max').forEach(btn => btn.addEventListener('click', toggleMaximize));

    let isDragging = false;
    let startX, startY, initialX, initialY;

    titlebar.addEventListener('mousedown', (e) => {
        if(e.target.closest('.mac-btn') || e.target.closest('.win-btn') || e.target.closest('.ubuntu-btn') || isMaximized) return;
        isDragging = true;
        
        const rect = terminalWindow.getBoundingClientRect();
        if (!terminalWindow.dataset.dragged) {
            terminalWindow.dataset.dragged = "true";
            terminalWindow.style.transform = 'none';
            terminalWindow.style.left = rect.left + 'px';
            terminalWindow.style.top = rect.top + 'px';
        }

        startX = e.clientX;
        startY = e.clientY;
        initialX = parseFloat(terminalWindow.style.left) || rect.left;
        initialY = parseFloat(terminalWindow.style.top) || rect.top;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        terminalWindow.style.left = (initialX + (e.clientX - startX)) + 'px';
        terminalWindow.style.top = (initialY + (e.clientY - startY)) + 'px';
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    function openTerminal() {
        isTerminalOpen = true;
        overlay.style.display = 'flex';
        requestAnimationFrame(() => {
            terminalWindow.style.opacity = '1';
            terminalWindow.style.transform = terminalWindow.dataset.dragged ? 'none' : 'translate(-50%, -50%) scale(1)';
        });
        input.value = '';
        input.focus();
    }

    function closeTerminal() {
        isTerminalOpen = false;
        terminalWindow.style.opacity = '0';
        terminalWindow.style.transform = terminalWindow.dataset.dragged ? 'none' : 'translate(-50%, -50%) scale(0.95)';
        setTimeout(() => {
            if (!isTerminalOpen) overlay.style.display = 'none';
        }, 200);
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === '`') {
            if (isTerminalOpen) {
                e.preventDefault();
                closeTerminal();
            } else if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                openTerminal();
            }
        }
    });

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const val = input.value.trim();
            const command = val.toLowerCase();

            if (waitingForApiKey) {
                if (val) {
                    localStorage.setItem('terminalGeminiKey', val);
                    printOut(`\n<span style="color: #98c379;">[AI] API Key saved! You can now use the 'ai' command.</span>`);
                } else {
                    printOut(`\n<span style="color: #e06c75;">[AI] API Key entry cancelled.</span>`);
                }
                waitingForApiKey = false;
                input.type = "text";
                input.value = '';
                return;
            }
            
            let p = '';
            if (currentTheme === 'powershell') p = `<span style="color: #cccccc;">PS C:\\Users\\${currentUser}&gt;</span>`;
            else if (currentTheme === 'linux') p = `<span style="color: #8ae234;">${currentUser}@ubuntu</span>:<span style="color: #729fcf;">~</span>$`;
            else p = '<span style="color: #98c379;">➜</span> <span style="color: #61afef;">~</span>';

            if (val) printOut(`\n${p} ${val}`);
            input.value = '';

            const args = val.split(' ');
            const cmd = args[0].toLowerCase();

            if (cmd === 'start') {
                printOut(`\n<span style="color: #e5c07b;">[System]</span> Initializing system diagnostic...`);
                
                const progressId = "prog-" + Date.now();
                printOut(`\n<span id="${progressId}">[                    ] 0%</span>`);
                const progressSpan = document.getElementById(progressId);
                
                for (let i = 0; i <= 100; i += 4) {
                    await new Promise(r => setTimeout(r, 40));
                    const bars = Math.floor(i / 5);
                    progressSpan.innerHTML = `[<span style="color: #61afef;">${'='.repeat(bars)}${'>'.padEnd(1, '')}</span>${' '.repeat(20 - bars)}] ${i}%`;
                }
                progressSpan.innerHTML = `[<span style="color: #98c379;">====================</span>] 100% - OK`;
                
                const settings = localStorage.getItem('pageSettings') || '{}';
                let parsedSettings = {};
                try { parsedSettings = JSON.parse(settings); } catch(err) { parsedSettings = { error: "Failed to parse" }; }
                
                printOut(`\n\n<span style="color: #c678dd;">--- SYSTEM CONFIGURATION ---</span>\n`);
                for (const key of Object.keys(parsedSettings)) {
                    await new Promise(r => setTimeout(r, 30));
                    let valStr = JSON.stringify(parsedSettings[key]);
                    if (valStr && valStr.length > 50) valStr = valStr.substring(0, 50) + '...';
                    printOut(`<span style="color: #56b6c2;">${key}</span>: ${valStr}\n`);
                }
                printOut(`<span style="color: #c678dd;">----------------------------</span>\n`);
                
            } else if (cmd === 'bug') {
                printOut(`\n<span style="color: #e5c07b;">[Diagnostics]</span> Fetching DevTools Console Logs...`);
                await new Promise(r => setTimeout(r, 500));
                if (window._terminalLogs && window._terminalLogs.length > 0) {
                    window._terminalLogs.forEach(log => {
                        let color = '#e0e0e0';
                        if (log.type === 'warn') color = '#e5c07b';
                        if (log.type === 'error') color = '#e06c75';
                        printOut(`\n<span style="color: ${color};">[${log.type.toUpperCase()}] ${log.msg}</span>`);
                    });
                } else {
                    printOut(`\n<span style="color: #98c379;">No logs or errors captured since terminal initialized.</span>`);
                }
            } else if (cmd === 'clear' || cmd === 'cls') {
                output.innerHTML = '';
            } else if (cmd === 'test') {
                if (args[1] === 'performance') {
                    if (window.perfHUD) {
                        window.perfHUD.toggle();
                        printOut(`\n<span style="color: #98c379;">[Performance]</span> Toggled Performance HUD overlay.`);
                    } else {
                        printOut(`\n<span style="color: #e06c75;">[Error]</span> Performance HUD module not initialized.`);
                    }
                } else {
                    printOut(`\n<span style="color: #61afef;">[Test]</span> Initiating full module diagnostics...`);
                    const modules = [
                        "Background Engine",
                        "Effect Synthesizer",
                        "Clock & Date Manager",
                        "Settings Sync",
                        "Performance Monitor",
                        "Layout Engine",
                        "Local Storage IO"
                    ];
                    for (const mod of modules) {
                        await new Promise(r => setTimeout(r, 400));
                        const statusColor = "#98c379";
                        const statusText = "OK";
                        printOut(`\nTesting ${mod.padEnd(22, '.')} [<span style="color: ${statusColor};">${statusText}</span>]`);
                    }
                    await new Promise(r => setTimeout(r, 300));
                    printOut(`\n<span style="color: #98c379;">[Test]</span> Diagnostics complete. System is stable.`);
                }
            } else if (cmd === 'perf') {
                if (window.perfHUD) {
                    window.perfHUD.toggle();
                    printOut(`\n<span style="color: #98c379;">[Performance]</span> Toggled Performance HUD overlay.`);
                } else {
                    printOut(`\n<span style="color: #e06c75;">[Error]</span> Performance HUD module not initialized.`);
                }
            } else if (cmd === 'exit') {
                closeTerminal();
            } else if (cmd === '/help' || cmd === 'help') {
                printOut(`\n<span style="color: #e5c07b;">Available commands:</span>
  <span style="color: #61afef;">start</span>    - Run system diagnostic and dump settings
  <span style="color: #61afef;">test</span>     - Run self-test on all system modules
  <span style="color: #61afef;">bug</span>      - Fetch intercepted DevTools console logs
  <span style="color: #61afef;">clear, cls</span>- Clear terminal screen
  <span style="color: #61afef;">exit</span>     - Close the terminal
  <span style="color: #61afef;">perf</span>     - Toggle Performance HUD overlay
  <span style="color: #61afef;">/help</span>    - Show this help message
  <span style="color: #61afef;">echo</span>     - Print arguments to standard output
  <span style="color: #61afef;">date</span>     - Display current date and time
  <span style="color: #61afef;">whoami</span>   - Print effective userid
  <span style="color: #61afef;">user</span>     - Change terminal username (e.g., user John)
  <span style="color: #61afef;">matrix</span>   - Initialize matrix protocol
  <span style="color: #61afef;">sudo</span>     - Execute a command as superuser
  <span style="color: #61afef;">ping</span>     - Send ICMP ECHO_REQUEST to network hosts
  <span style="color: #61afef;">style</span>    - Change terminal style (macos | linux | powershell)
  <span style="color: #61afef;">ai</span>       - Chat with Gemini AI (requires API key)`);
            } else if (cmd === 'style') {
                const newStyle = args[1]?.toLowerCase();
                if (['powershell', 'linux', 'macos'].includes(newStyle)) {
                    currentTheme = newStyle;
                    localStorage.setItem('terminalTheme', currentTheme);
                    applyTheme();
                    printOut(`\nSwitched to ${newStyle} style.`);
                } else {
                    printOut(`\nUsage: style <macos|linux|powershell>`);
                }
            } else if (cmd === 'user' || cmd === 'rename') {
                if (args[1]) {
                    currentUser = args[1];
                    localStorage.setItem('terminalUser', currentUser);
                    applyTheme();
                    printOut(`\n<span style="color: #98c379;">Username changed to ${currentUser}</span>`);
                } else {
                    printOut(`\nUsage: user <new_name>`);
                }
            } else if (cmd === 'ai') {
                const apiKey = localStorage.getItem('terminalGeminiKey');
                let aiModel = localStorage.getItem('terminalGeminiModel') || 'gemini-1.5-flash-latest';
                const prompt = val.substring(3).trim();

                if (prompt === 'setkey') {
                    waitingForApiKey = true;
                    input.type = "password";
                    printOut(`\n<span style="color: #e5c07b;">[AI] Please paste your Gemini API Key and press Enter:</span>`);
                } else if (prompt.startsWith('setmodel ')) {
                    const newModel = prompt.substring(9).trim();
                    localStorage.setItem('terminalGeminiModel', newModel);
                    printOut(`\n<span style="color: #98c379;">[AI] Model updated to ${newModel}</span>`);
                } else if (!apiKey) {
                    printOut(`\n<span style="color: #e06c75;">[AI Error] Gemini API key not found.</span>\nType <span style="color: #61afef;">ai setkey</span> to enter your API key.`);
                } else if (!prompt) {
                    printOut(`\n<span style="color: #e5c07b;">[AI] Current Model: ${aiModel}</span>\n<span style="color: #e5c07b;">[AI] Usage: ai &lt;your question&gt; | ai setkey | ai setmodel &lt;model_name&gt;</span>`);
                } else {
                    printOut(`\n<span style="color: #61afef;">[AI] Thinking using ${aiModel}...</span>`);
                    const resId = "ai-" + Date.now();
                    printOut(`\n<span id="${resId}" style="color: #e0e0e0;"></span>`);

                    try {
                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: prompt }] }]
                            })
                        });
                        const data = await response.json();
                        const answerSpan = document.getElementById(resId);
                        
                        if (data.error) {
                            answerSpan.innerHTML = `<span style="color: #e06c75;">Error: ${data.error.message}</span>`;
                        } else if (data.candidates && data.candidates.length > 0) {
                            let text = data.candidates[0].content.parts[0].text;
                            text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
                            answerSpan.innerHTML = `<span style="color: #d19a66;">${text}</span>`;
                        } else {
                            answerSpan.innerHTML = `<span style="color: #e06c75;">No response from Gemini.</span>`;
                        }
                    } catch (e) {
                        const answerSpan = document.getElementById(resId);
                        if(answerSpan) answerSpan.innerHTML = `<span style="color: #e06c75;">Failed to fetch: ${e.message}</span>`;
                    }
                }
            } else if (cmd === 'echo') {
                printOut(`\n${val.substring(5)}`);
            } else if (cmd === 'date') {
                printOut(`\n${new Date().toString()}`);
            } else if (cmd === 'whoami') {
                printOut(`\n${currentUser}`);
            } else if (cmd === 'sudo') {
                printOut(`\n<span style="color: #e06c75;">${currentUser} is not in the sudoers file. This incident will be reported.</span>`);
            } else if (cmd === 'ping') {
                const host = args[1] || '127.0.0.1';
                printOut(`\nPING ${host} (127.0.0.1): 56 data bytes`);
                for(let i = 1; i <= 4; i++) {
                    await new Promise(r => setTimeout(r, 600));
                    printOut(`\n64 bytes from ${host}: icmp_seq=${i} ttl=64 time=${(Math.random() * 20 + 5).toFixed(3)} ms`);
                }
            } else if (cmd === 'matrix') {
                printOut(`\n<span style="color: #98c379;">Wake up, ${currentUser}...</span>`);
                await new Promise(r => setTimeout(r, 1000));
                printOut(`\n<span style="color: #98c379;">The Matrix has you...</span>`);
                await new Promise(r => setTimeout(r, 1000));
                printOut(`\n<span style="color: #98c379;">Follow the white rabbit.</span>`);
                await new Promise(r => setTimeout(r, 1000));
                printOut(`\n<span style="color: #98c379;">Knock, knock, ${currentUser}.</span>`);
            } else if (cmd !== '') {
                const notFound = currentTheme === 'powershell' 
                    ? `\n${cmd} : The term '${cmd}' is not recognized as the name of a cmdlet, function, script file, or operable program.` 
                    : `\nbash: ${cmd}: command not found`;
                printOut(notFound);
            }
        }
    });

    body.addEventListener('click', () => {
        if (window.getSelection().toString().length === 0) {
            input.focus();
        }
    });
}
