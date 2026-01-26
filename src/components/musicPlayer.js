import { getSettings } from "../services/state.js";

export class MusicPlayer {
    constructor() {
        const settings = getSettings();
        console.log("MusicPlayer: Initializing with settings:", settings);
        
        this.player = null;
        this.container = null;
        this.isVisible = false;
        this.isPlaying = false;
        this.currentUrl = settings.musicYoutubeUrl || '';
        this.showPlayer = settings.musicPlayerEnabled || false;
        this.source = settings.musicSource || 'embed';
        this.showVideo = settings.showMusicVideo || false;
        this.activeMediaInterval = null;
        this.isIframeReady = false;

        this.init();
    }

    init() {
        this.createElements();
        this.setupEventListeners();
        this.updateVisibility();
        this.updateVideoVisibility();
        this.reloadPlayer();
        this.startActiveMediaTracking();
    }

    createElements() {
        // Create player container
        this.container = document.createElement('div');
        this.container.id = 'music-player-container';
        this.container.className = 'music-player-container minimized';
        
        this.container.innerHTML = `
            <div class="music-player-wrapper">
                <button id="close-player" class="close-player-btn"><i class="fa-solid fa-xmark"></i></button>
                <div class="disc-container">
                    <div id="vinyl-disc" class="vinyl-disc"></div>
                    <div id="source-icon-overlay" class="source-icon-overlay"></div>
                </div>
                <div class="player-main">
                    <div class="player-info">
                        <h3 id="music-title" data-i18n="music_player_title">Music Player</h3>
                    </div>
                    <div class="slider-container">
                        <input type="range" id="seek-bar" class="music-slider" min="0" max="100" value="0">
                    </div>
                    <div class="controls-row">
                        <button id="prev-track" class="player-btn"><i class="fa-solid fa-backward-step"></i></button>
                        <button id="play-pause-btn" class="player-btn play-pause-btn"><i class="fa-solid fa-play"></i></button>
                        <button id="next-track" class="player-btn"><i class="fa-solid fa-forward-step"></i></button>
                        <div class="volume-container">
                            <i class="fa-solid fa-volume-low"></i>
                            <input type="range" id="volume-slider" class="music-slider" min="0" max="100" value="100">
                        </div>
                    </div>
                </div>
                <div id="player-iframe-wrapper">
                    <iframe id="youtube-player-iframe" 
                            frameborder="0" 
                            allow="autoplay; encrypted-media; picture-in-picture" 
                            allowfullscreen></iframe>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);
        this.iframe = this.container.querySelector('#youtube-player-iframe');
        this.disc = this.container.querySelector('#vinyl-disc');
        this.sourceIcon = this.container.querySelector('#source-icon-overlay');
        this.titleElement = this.container.querySelector('#music-title');

        this.iframe.onload = () => {
            console.log("MusicPlayer: IFrame loaded");
            this.isIframeReady = true;
            
            // Wait a bit for the player to initialize internal listeners
            setTimeout(() => {
                const vol = document.getElementById('volume-slider').value;
                this.sendPlayerCommand('unMute');
                this.sendPlayerCommand('setVolume', [vol]);
                
                if (this.isPlaying && this.source === 'embed') {
                    console.log("MusicPlayer: Attempting to play after load");
                    this.sendPlayerCommand('playVideo');
                }
            }, 1000);
        };

        // Listen for messages from YouTube player
        window.addEventListener('message', (event) => {
            if (event.origin.includes('youtube')) {
                try {
                    const data = JSON.parse(event.data);
                    if (data.event === 'onReady') {
                        console.log("MusicPlayer: YouTube player is ready");
                    }
                    if (data.event === 'infoDelivery' && data.info) {
                        // Some info about the video is available
                    }
                    if (data.event === 'onStateChange') {
                        // 1 = playing, 2 = paused
                        const state = data.info;
                        console.log("MusicPlayer: Player state changed to:", state);
                    }
                } catch (e) {
                    // Not a JSON message or not from YT player
                }
            }
        });

        // Create toggle button
        this.toggleBtn = document.createElement('button');
        this.toggleBtn.id = 'music-toggle-btn';
        this.toggleBtn.className = 'music-toggle-btn';
        this.toggleBtn.innerHTML = '<i class="fa-solid fa-music"></i>';
        this.toggleBtn.style.display = this.showPlayer ? 'flex' : 'none';
        
        document.body.appendChild(this.toggleBtn);
    }

    setupEventListeners() {
        this.toggleBtn.addEventListener('click', () => this.togglePlayer());
        
        document.getElementById('close-player').addEventListener('click', () => this.togglePlayer());

        document.getElementById('play-pause-btn').addEventListener('click', () => {
            if (this.source === 'embed') {
                this.isPlaying = !this.isPlaying;
                console.log("MusicPlayer: Play/Pause toggled, isPlaying =", this.isPlaying);
                const command = this.isPlaying ? 'playVideo' : 'pauseVideo';
                this.sendPlayerCommand(command);
                this.updatePlayerUI();
            }
        });

        document.getElementById('next-track').addEventListener('click', () => {
            if (this.source === 'embed') {
                console.log("MusicPlayer: Next track requested");
                this.sendPlayerCommand('nextVideo');
                this.isPlaying = true;
                this.updatePlayerUI();
            }
        });

        document.getElementById('prev-track').addEventListener('click', () => {
            if (this.source === 'embed') {
                console.log("MusicPlayer: Previous track requested");
                this.sendPlayerCommand('previousVideo');
                this.isPlaying = true;
                this.updatePlayerUI();
            }
        });

        // Volume control
        const volumeSlider = document.getElementById('volume-slider');
        volumeSlider.addEventListener('input', () => {
            if (this.source === 'embed') {
                this.sendPlayerCommand('setVolume', [volumeSlider.value]);
            }
        });

        // Listen for settings changes
        window.addEventListener('settingsUpdated', (e) => {
            console.log("MusicPlayer: Settings updated:", e.detail);
            if (e.detail.key === 'music_player_enabled') {
                this.showPlayer = e.detail.value;
                this.toggleBtn.style.display = this.showPlayer ? 'flex' : 'none';
                if (!this.showPlayer && this.isVisible) this.togglePlayer();
            }
            if (e.detail.key === 'music_youtube_url') {
                this.currentUrl = e.detail.value;
                if (this.source === 'embed') {
                    console.log("MusicPlayer: URL changed, forcing reload and play");
                    this.isPlaying = true;
                    this.reloadPlayer();
                    this.updatePlayerUI();
                }
            }
            if (e.detail.key === 'music_source') {
                this.source = e.detail.value;
                this.reloadPlayer();
                this.updateVideoVisibility();
            }
            if (e.detail.key === 'music_show_video') {
                this.showVideo = e.detail.value;
                this.updateVideoVisibility();
            }
        });
    }

    updateVideoVisibility() {
        if (this.showVideo && this.source === 'embed') {
            this.container.classList.add('show-video');
        } else {
            this.container.classList.remove('show-video');
        }
    }

    startActiveMediaTracking() {
        if (this.activeMediaInterval) clearInterval(this.activeMediaInterval);
        
        if (!chrome.runtime || !chrome.runtime.sendMessage) {
            console.warn("MusicPlayer: chrome.runtime.sendMessage not available.");
            return;
        }

        this.activeMediaInterval = setInterval(() => {
            if (this.source === 'active_tab' && this.showPlayer) {
                chrome.runtime.sendMessage({ action: "getActiveMedia" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("MusicPlayer: Active detection error:", chrome.runtime.lastError);
                        return;
                    }
                    if (response && response.audible) {
                        this.updateFromActiveTab(response);
                    } else {
                        this.setInactive();
                    }
                });
            }
        }, 2000);
    }

    updateFromActiveTab(data) {
        if (this.titleElement.textContent !== data.title) {
            console.log("MusicPlayer: Active tab updated:", data.title);
            this.titleElement.textContent = data.title;
        }
        this.isPlaying = true;
        this.updatePlayerUI();
        this.updateSourceIcon(data.url);
    }

    updateSourceIcon(url) {
        if (!url) return;
        let iconClass = 'fa-solid fa-music';
        if (url.includes('youtube.com') || url.includes('youtu.be')) iconClass = 'fa-brands fa-youtube';
        else if (url.includes('spotify.com')) iconClass = 'fa-brands fa-spotify';
        else if (url.includes('soundcloud.com')) iconClass = 'fa-brands fa-soundcloud';
        else if (url.includes('facebook.com')) iconClass = 'fa-brands fa-facebook';
        
        if (this.sourceIcon.innerHTML.indexOf(iconClass) === -1) {
            this.sourceIcon.innerHTML = `<i class="${iconClass}"></i>`;
        }
        this.sourceIcon.style.display = 'flex';
    }

    setInactive() {
        if (this.source === 'active_tab' && this.isPlaying) {
            console.log("MusicPlayer: No active media detected");
            this.isPlaying = false;
            this.updatePlayerUI();
            this.titleElement.textContent = "Music Player";
        }
    }

    updatePlayerUI() {
        const btn = document.getElementById('play-pause-btn');
        if (btn) btn.innerHTML = this.isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
        
        if (this.disc) {
            if (this.isPlaying) {
                this.disc.classList.add('playing');
            } else {
                this.disc.classList.remove('playing');
            }
        }
    }

    sendPlayerCommand(func, args = []) {
        if (!this.iframe || !this.iframe.contentWindow) {
            console.warn("MusicPlayer: IFrame not available for command:", func);
            return;
        }
        
        try {
            const message = JSON.stringify({
                event: 'command',
                func: func,
                args: args
            });
            console.log("MusicPlayer: Sending command to YouTube:", func, args);
            this.iframe.contentWindow.postMessage(message, '*');
        } catch (e) {
            console.error("MusicPlayer: PostMessage failed:", e);
        }
    }

    togglePlayer() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.container.classList.remove('minimized');
            this.toggleBtn.classList.add('player-active');
        } else {
            this.container.classList.add('minimized');
            this.toggleBtn.classList.remove('player-active');
        }
    }

    updateVisibility() {
        this.toggleBtn.style.display = this.showPlayer ? 'flex' : 'none';
        if (!this.showPlayer) {
            this.container.classList.add('minimized');
            this.toggleBtn.classList.remove('player-active');
            this.isVisible = false;
        }
    }

    reloadPlayer() {
        if (!this.iframe) return;
        
        if (this.source === 'active_tab') {
            this.iframe.src = 'about:blank';
            if (this.sourceIcon) this.sourceIcon.style.display = 'none';
            this.isIframeReady = false;
            return;
        }

        if (this.source === 'embed' && this.sourceIcon) {
            this.sourceIcon.style.display = 'none';
        }

        if (!this.currentUrl) {
            this.iframe.src = 'about:blank';
            this.isIframeReady = false;
            return;
        }
        
        const videoId = this.extractVideoId(this.currentUrl);
        const listId = this.extractListId(this.currentUrl);

        let embedUrl = '';
        // Force autoplay=1 and mute=1 to get past most browser blocks
        // We'll unmute via postMessage after load
        const autoPlay = this.isPlaying ? '1' : '0';
        // Omitting origin for now to see if it fixes 153
        const baseParams = `enablejsapi=1&autoplay=${autoPlay}&mute=1&modestbranding=1&rel=0`;

        if (listId) {
            embedUrl = `https://www.youtube-nocookie.com/embed?listType=playlist&list=${listId}&${baseParams}`;
        } else if (videoId) {
            embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?${baseParams}`;
        }

        if (embedUrl) {
            console.log("MusicPlayer: Loading embed URL:", embedUrl);
            this.isIframeReady = false;
            this.iframe.src = embedUrl;
        }
    }

    extractVideoId(url) {
        if (!url) return '';
        // Support for watch?v=, shorts/, and youtu.be/
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : '';
    }

    extractListId(url) {
        if (!url) return '';
        const regExp = /[&?]list=([^&]+)/;
        const match = url.match(regExp);
        return match ? match[1] : '';
    }
}
