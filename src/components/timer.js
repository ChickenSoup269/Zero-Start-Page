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
                <input type="text" id="timer-smart-input" placeholder="Enter time" maxlength="6" inputmode="numeric">
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
        
        // Smart input handler
        const smartInput = this.container.querySelector('#timer-smart-input');
        smartInput.addEventListener('input', (e) => {
            // Only allow numbers
            e.target.value = e.target.value.replace(/\D/g, '');
            // Update display preview as user types
            this.updateSmartInputPreview(e.target.value);
        });
        
        smartInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.setTimer();
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
        const smartInput = this.container.querySelector('#timer-smart-input');
        modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
        if (modal.style.display === 'flex') {
            // Convert current time to smart format
            const h = Math.floor(this.timeLeft / 3600);
            const m = Math.floor((this.timeLeft % 3600) / 60);
            const s = this.timeLeft % 60;
            
            let smartValue = '';
            if (h > 0) {
                smartValue = h.toString().padStart(2, '0') + m.toString().padStart(2, '0') + s.toString().padStart(2, '0');
            } else if (m > 0) {
                smartValue = m.toString().padStart(2, '0') + s.toString().padStart(2, '0');
            } else {
                smartValue = s.toString();
            }
            smartInput.value = smartValue;
            smartInput.focus();
            smartInput.select();
        }
    }
    
    updateSmartInputPreview(value) {
        // Update the timer display to show preview
        if (!value) {
            this.render();
            return;
        }
        const parsed = this.parseSmartTimerInput(value);
        const h = Math.floor(parsed / 3600);
        const m = Math.floor((parsed % 3600) / 60);
        const s = parsed % 60;
        
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
    
    parseSmartTimerInput(value) {
        // Remove any non-digits
        const digits = value.replace(/\D/g, '');
        const len = digits.length;
        
        if (len === 0) return 0;
        
        let hours = 0, minutes = 0, seconds = 0;
        
        if (len <= 2) {
            // 1-2 digits: seconds only
            seconds = parseInt(digits);
        } else if (len <= 4) {
            // 3-4 digits: MMSS
            minutes = parseInt(digits.slice(0, -2));
            seconds = parseInt(digits.slice(-2));
        } else {
            // 5-6 digits: HHMMSS
            hours = parseInt(digits.slice(0, -4));
            minutes = parseInt(digits.slice(-4, -2));
            seconds = parseInt(digits.slice(-2));
        }
        
        // Validate and cap values
        hours = Math.min(hours, 23);
        minutes = Math.min(minutes, 59);
        seconds = Math.min(seconds, 59);
        
        return (hours * 3600) + (minutes * 60) + seconds;
    }

    setTimer() {
        const smartInput = this.container.querySelector('#timer-smart-input');
        const totalSeconds = this.parseSmartTimerInput(smartInput.value);
        
        if (totalSeconds === 0) {
            this.toggleModal();
            return;
        }
        
        // Remember if timer was running
        const wasRunning = this.isRunning;
        
        // Stop current timer if running
        if (this.isRunning) {
            this.pauseTimer();
        }
        
        // Set new time
        this.initialTime = totalSeconds;
        this.timeLeft = this.initialTime;
        this.isRunning = false;
        this.saveState();
        this.render();
        this.toggleModal();
        
        // Auto-start if it was running before
        if (wasRunning) {
            setTimeout(() => this.startTimer(), 100);
        }
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
