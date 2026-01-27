import { getSettings, updateSetting, saveSettings } from "../services/state.js";

export class Timer {
    constructor() {
        this.container = null;
        this.display = null;
        const settings = getSettings();
        this.timeLeft = settings.timerCurrentTime || 0;
        this.initialTime = settings.timerInitialTime || 0;
        this.endTime = settings.timerEndTime || 0;
        this.isRunning = settings.timerIsRunning || false;
        this.timerId = null;
        this.alarm = new Audio('sounds/bedside_clock_alarm.mp3');
        this.alarm.loop = true;
        this.isVisible = settings.showTimer === true;
        
        this.init();
    }

    init() {
        this.createElements();
        this.setupEventListeners();
        this.updateVisibility();
        
        // Resume logic
        if (this.isRunning && this.endTime > Date.now()) {
            this.timeLeft = Math.ceil((this.endTime - Date.now()) / 1000);
            this.startTimer(true);
        } else if (this.isRunning) {
            // Timer expired while user was away
            this.timeLeft = 0;
            this.isRunning = false;
            this.render();
            this.saveState();
            // Optional: Play alarm if it just finished? Usually better stay silent if away.
        } else {
            // Paused state
            this.render();
        }
    }

    createElements() {
        this.container = document.createElement('div');
        this.container.className = 'timer-container glass-panel drag-handle';
        this.container.id = 'timer-component';
        
        this.container.innerHTML = `
            <div class="timer-display" id="timer-display">00:00:00</div>
            <div class="timer-controls">
                <button id="timer-start-pause" class="icon-btn"><i class="fa-solid fa-play"></i></button>
                <button id="timer-reset" class="icon-btn"><i class="fa-solid fa-rotate-right"></i></button>
                <button id="timer-settings" class="icon-btn"><i class="fa-solid fa-ellipsis"></i></button>
            </div>
            <div id="timer-modal" class="timer-input-modal" style="display: none;">
                <input type="number" id="timer-hours" placeholder="HH" min="0" max="23">
                <span>:</span>
                <input type="number" id="timer-minutes" placeholder="MM" min="0" max="59">
                <span>:</span>
                <input type="number" id="timer-seconds" placeholder="SS" min="0" max="59">
                <button id="timer-set-confirm" class="icon-btn"><i class="fa-solid fa-check"></i></button>
            </div>
            <button id="stop-alarm-btn" class="primary-btn" style="display: none; margin-top: 10px; width: 100%;">Stop Alarm</button>
        `;

        document.body.appendChild(this.container);
        this.display = this.container.querySelector('#timer-display');
    }

    setupEventListeners() {
        this.container.querySelector('#timer-start-pause').addEventListener('click', () => this.toggleTimer());
        this.container.querySelector('#timer-reset').addEventListener('click', () => this.resetTimer());
        this.container.querySelector('#timer-settings').addEventListener('click', () => this.toggleModal());
        this.container.querySelector('#timer-set-confirm').addEventListener('click', () => this.setTimer());
        this.container.querySelector('#stop-alarm-btn').addEventListener('click', () => this.stopAlarm());

        window.addEventListener('layoutUpdated', (e) => {
            if (e.detail.key === 'showTimer') {
                this.isVisible = e.detail.value;
                this.updateVisibility();
            }
        });
    }

    updateVisibility() {
        this.container.style.display = this.isVisible ? 'flex' : 'none';
    }

    toggleTimer() {
        if (this.timerId) {
            this.pauseTimer();
        } else if (this.timeLeft > 0) {
            this.startTimer();
        }
    }

    startTimer(isResuming = false) {
        const btn = this.container.querySelector('#timer-start-pause i');
        if (btn) btn.className = 'fa-solid fa-pause';
        
        this.isRunning = true;
        if (!isResuming) {
            this.endTime = Date.now() + (this.timeLeft * 1000);
        }
        
        this.saveState();

        this.timerId = setInterval(() => {
            const remaining = Math.ceil((this.endTime - Date.now()) / 1000);
            if (this.timeLeft !== remaining) {
                this.timeLeft = Math.max(0, remaining);
                this.render();
            }

            if (this.timeLeft <= 0) {
                this.pauseTimer();
                this.playAlarm();
                this.timeLeft = this.initialTime;
                this.render();
                this.saveState();
            }
        }, 500);
    }

    pauseTimer() {
        clearInterval(this.timerId);
        this.timerId = null;
        this.isRunning = false;
        const btn = this.container.querySelector('#timer-start-pause i');
        if (btn) btn.className = 'fa-solid fa-play';
        this.saveState();
    }

    resetTimer() {
        this.pauseTimer();
        this.timeLeft = this.initialTime;
        this.isRunning = false;
        this.render();
        this.stopAlarm();
        this.saveState();
    }

    toggleModal() {
        const modal = this.container.querySelector('#timer-modal');
        modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
        if (modal.style.display === 'flex') {
            const h = Math.floor(this.timeLeft / 3600);
            const m = Math.floor((this.timeLeft % 3600) / 60);
            const s = this.timeLeft % 60;
            this.container.querySelector('#timer-hours').value = h || '';
            this.container.querySelector('#timer-minutes').value = m || '';
            this.container.querySelector('#timer-seconds').value = s || '';
        }
    }

    setTimer() {
        const h = parseInt(this.container.querySelector('#timer-hours').value) || 0;
        const m = parseInt(this.container.querySelector('#timer-minutes').value) || 0;
        const s = parseInt(this.container.querySelector('#timer-seconds').value) || 0;
        
        this.initialTime = (h * 3600) + (m * 60) + s;
        this.timeLeft = this.initialTime;
        this.isRunning = false;
        this.saveState();
        this.render();
        this.toggleModal();
    }

    saveState() {
        updateSetting('timerInitialTime', this.initialTime);
        updateSetting('timerCurrentTime', this.timeLeft);
        updateSetting('timerEndTime', this.endTime);
        updateSetting('timerIsRunning', this.isRunning);
        saveSettings();
    }

    playAlarm() {
        this.alarm.play().catch(e => console.error("Alarm play failed:", e));
        this.container.querySelector('#stop-alarm-btn').style.display = 'block';
    }

    stopAlarm() {
        this.alarm.pause();
        this.alarm.currentTime = 0;
        this.container.querySelector('#stop-alarm-btn').style.display = 'none';
    }

    render() {
        const h = Math.floor(this.timeLeft / 3600);
        const m = Math.floor((this.timeLeft % 3600) / 60);
        const s = this.timeLeft % 60;
        
        let displayStr = '';
        if (h > 0) {
            displayStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        } else if (m > 0) {
            displayStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        } else {
            displayStr = `${s.toString().padStart(2, '0')}`;
        }
        
        this.display.textContent = displayStr;
    }
}
