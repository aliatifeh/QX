class A2WebBot {
    constructor() {
        this.initializeElements();
        this.loadSettings();
        this.initializeEventListeners();
        this.loadTradingPairs();
        this.updateCountdown();
        this.brokerTime = null;
    }

    initializeElements() {
        // Elements
        this.pairSelect = document.getElementById('pairSelect');
        this.btnStart = document.getElementById('btnStart');
        this.btnStop = document.getElementById('btnStop');
        this.btnSettings = document.getElementById('btnSettings');
        this.saveSettings = document.getElementById('saveSettings');
        this.closeSettings = document.getElementById('closeSettings');
        this.settingsPanel = document.getElementById('settingsPanel');
        
        // Display elements
        this.statusEl = document.getElementById('status');
        this.sigEl = document.getElementById('signal');
        this.pairEl = document.getElementById('currentPair');
        this.confEl = document.getElementById('confidence');
        this.barsEl = document.getElementById('bars');
        this.countdownEl = document.getElementById('countdown');
        this.modeEl = document.getElementById('mode');
        this.connectionStatusEl = document.getElementById('connectionStatus');
        this.todaySignalsEl = document.getElementById('todaySignals');
        
        // Settings elements
        this.minConfidenceSlider = document.getElementById('minConfidence');
        this.minConfidenceValue = document.getElementById('minConfidenceValue');
        this.strategySensitivitySlider = document.getElementById('strategySensitivity');
        this.sensitivityValue = document.getElementById('sensitivityValue');
        this.soundEnabledCheckbox = document.getElementById('soundEnabled');
        this.notificationsEnabledCheckbox = document.getElementById('notificationsEnabled');
        
        // License elements
        this.licenseSection = document.getElementById('licenseSection');
        this.licenseInput = document.getElementById('licenseInput');
        this.activateLicenseBtn = document.getElementById('activateLicense');
        this.licenseStatus = document.getElementById('licenseStatus');
        
        // State
        this.active = false;
        this.selectedPair = null;
        this.todayStats = { signals: 0 };
        this.connectionStatus = { connected: false };
        this.countdownInterval = null;
        this.audioContext = null;
        this.licenseActive = false;
        this.licenseKey = null;
        this.brokerTime = null;
        this.brokerTimeInterval = null;
    }

    loadSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('a2_settings')) || {};
        this.settings = {
            minConfidence: savedSettings.minConfidence || 0.75,
            strategySensitivity: savedSettings.strategySensitivity || 6,
            soundEnabled: savedSettings.soundEnabled !== false,
            notificationsEnabled: savedSettings.notificationsEnabled !== false,
            licenseKey: savedSettings.licenseKey || null
        };

        // Update UI with saved settings
        this.minConfidenceSlider.value = this.settings.minConfidence * 100;
        this.minConfidenceValue.textContent = Math.round(this.settings.minConfidence * 100) + '%';
        this.strategySensitivitySlider.value = this.settings.strategySensitivity;
        this.sensitivityValue.textContent = this.settings.strategySensitivity;
        this.soundEnabledCheckbox.checked = this.settings.soundEnabled;
        this.notificationsEnabledCheckbox.checked = this.settings.notificationsEnabled;

        // Load license
        if (this.settings.licenseKey) {
            this.licenseInput.value = this.settings.licenseKey;
            this.validateLicense(this.settings.licenseKey);
        }

        // Load stats
        const savedStats = JSON.parse(localStorage.getItem('a2_stats'));
        if (savedStats) {
            this.todayStats = savedStats;
            this.updateStatsDisplay();
        }
    }

    initializeEventListeners() {
        // Button events
        this.btnStart.addEventListener('click', () => this.startBot());
        this.btnStop.addEventListener('click', () => this.stopBot());
        this.btnSettings.addEventListener('click', () => this.toggleSettings());
        this.saveSettings.addEventListener('click', () => this.saveSettingsToStorage());
        this.closeSettings.addEventListener('click', () => this.toggleSettings());

        // Settings sliders
        this.minConfidenceSlider.addEventListener('input', () => {
            this.minConfidenceValue.textContent = this.minConfidenceSlider.value + '%';
        });

        this.strategySensitivitySlider.addEventListener('input', () => {
            this.sensitivityValue.textContent = this.strategySensitivitySlider.value;
        });

        // Pair selection
        this.pairSelect.addEventListener('change', (e) => {
            this.selectedPair = e.target.value;
        });

        // License activation
        this.activateLicenseBtn.addEventListener('click', () => this.activateLicense());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.settingsPanel.style.display = 'none';
            }
        });

        // Page visibility
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.active) {
                this.updateConnectionStatus(true);
            }
        });
    }

    async loadTradingPairs() {
        try {
            // Load from external JSON or use default
            const response = await fetch('./data/pairs.json');
            const pairs = await response.json();
            
            pairs.forEach(pair => {
                const option = document.createElement('option');
                option.value = pair;
                option.textContent = pair;
                this.pairSelect.appendChild(option);
            });
        } catch (error) {
            // Fallback to default pairs
            const defaultPairs = [
                "USD/BRL OTC", "USD/ARS OTC", "USD/IDR OTC", "USD/INR OTC",
                "NZD/CAD OTC", "EUR/CHF OTC", "CAD/JPY OTC", "USD/BDT OTC",
                "AUD/USD OTC", "EUR/GBP OTC"
            ];
            
            defaultPairs.forEach(pair => {
                const option = document.createElement('option');
                option.value = pair;
                option.textContent = pair;
                this.pairSelect.appendChild(option);
            });
        }
    }

    validateLicense(key) {
        // استفاده از License Manager برای اعتبارسنجی
        this.licenseActive = window.licenseManager.validateLicense(key);
        
        // به روز رسانی وضعیت UI
        if (window.licenseManager.currentLicense) {
            this.licenseStatus.textContent = 'فعال';
            this.licenseStatus.className = 'status-active';
        } else {
            this.licenseStatus.textContent = 'غیرفعال';
            this.licenseStatus.className = 'status-inactive';
        }
        
        return this.licenseActive;
    }

    activateLicense() {
        const key = this.licenseInput.value.trim().toUpperCase(); // تبدیل به حروف بزرگ
        if (!key) {
            this.showNotification('لطفاً کلید لایسنس را وارد کنید', 'error');
            return;
        }
        
        // Validate license using License Manager
        if (window.licenseManager.activateLicense(key)) {
            this.settings.licenseKey = key;
            localStorage.setItem('a2_settings', JSON.stringify(this.settings));
            this.licenseActive = true;
            this.licenseStatus.textContent = 'فعال';
            this.licenseStatus.className = 'status-active';
            this.showNotification('لایسنس با موفقیت فعال شد', 'success');
        } else {
            this.licenseActive = false;
            this.licenseStatus.textContent = 'نامعتبر';
            this.licenseStatus.className = 'status-inactive';
            this.showNotification('لایسنس نامعتبر است', 'error');
        }
    }

    startBot() {
        if (!this.selectedPair) {
            this.showNotification('لطفاً یک جفت ارز انتخاب کنید', 'error');
            return;
        }

        if (!this.licenseActive) {
            this.showNotification('لطفاً لایسنس را فعال کنید', 'error');
            return;
        }

        this.active = true;
        this.statusEl.textContent = 'وصل';
        this.connectionStatusEl.classList.add('connected');
        this.pairEl.textContent = this.selectedPair;
        
        this.updateConnectionStatus(true);
        this.startMarketSimulation();
        this.startBrokerTimeSync();
        
        this.showNotification(`ربات برای ${this.selectedPair} فعال شد`, 'success');
    }

    stopBot() {
        this.active = false;
        this.statusEl.textContent = 'قطع';
        this.connectionStatusEl.classList.remove('connected');
        this.sigEl.textContent = '...';
        this.sigEl.className = 'signal neutral';
        this.confEl.textContent = 'اعتبار: —';
        
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        
        if (this.brokerTimeInterval) {
            clearInterval(this.brokerTimeInterval);
            this.brokerTimeInterval = null;
        }
        
        this.updateConnectionStatus(false);
        this.showNotification('ربات متوقف شد', 'info');
    }

    startMarketSimulation() {
        // Simulate market data and signals
        this.simulateMarketData();
        
        // Start countdown timer
        this.updateCountdown();
        this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
    }

    startBrokerTimeSync() {
        // Simulate broker time synchronization
        this.brokerTime = new Date();
        this.brokerTimeInterval = setInterval(() => {
            this.brokerTime = new Date(this.brokerTime.getTime() + 1000);
        }, 1000);
    }

    updateCountdown() {
        if (!this.active) {
            this.countdownEl.textContent = '--:--';
            this.modeEl.textContent = '--';
            return;
        }

        // Use broker time if available, otherwise use local time
        const now = this.brokerTime || new Date();
        const secondsRemain = 60 - now.getSeconds();
        const mm = String(Math.floor(secondsRemain / 60)).padStart(2, '0');
        const ss = String(secondsRemain % 60).padStart(2, '0');
        
        this.countdownEl.textContent = `${mm}:${ss}`;
        this.modeEl.textContent = 'real';

        // Generate signal at 00 seconds
        if (secondsRemain === 60) {
            this.generateSignal();
        }
    }

    generateSignal() {
        if (!this.active) return;

        const signal = window.A2Strategy.generateSignal();
        if (signal) {
            this.displaySignal(signal);
            this.playNotificationSound();
            
            if (this.settings.notificationsEnabled) {
                this.showBrowserNotification(signal);
            }
        }
    }

    displaySignal(signal) {
        this.pairEl.textContent = this.selectedPair;
        this.sigEl.textContent = signal.direction.toUpperCase() === 'BUY' ? 'BUY' : 'SELL';
        this.sigEl.className = `signal ${signal.direction.toLowerCase()}`;
        this.confEl.textContent = `اعتبار: ${Math.round(signal.confidence * 100)}%`;
        
        this.setBars(signal.confidence);
        this.modeEl.textContent = 'real';

        // Update stats
        this.todayStats.signals++;
        this.updateStatsDisplay();
        this.saveToStorage();
    }

    setBars(score) {
        this.barsEl.innerHTML = '';
        const ups = Math.round(score * 5);
        
        for (let i = 0; i < 5; i++) {
            const bar = document.createElement('div');
            bar.className = `bar ${i < ups ? 'up' : 'down'}`;
            
            // Dynamic height based on confidence
            if (i < ups) {
                bar.style.height = `${20 + (i * 4)}px`;
            } else {
                bar.style.height = `${10 + ((i - ups) * 2)}px`;
            }
            
            this.barsEl.appendChild(bar);
        }
    }

    playNotificationSound() {
        if (!this.settings.soundEnabled) return;

        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);
            
        } catch (error) {
            console.log('Sound playback not supported:', error);
        }
    }

    showBrowserNotification(signal) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification(`سیگنال ${signal.direction} - ${this.selectedPair}`, {
                body: `اعتبار: ${Math.round(signal.confidence * 100)}%`,
                icon: './assets/icons/icon48.png'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    updateStatsDisplay() {
        this.todaySignalsEl.textContent = this.todayStats.signals;
    }

    updateConnectionStatus(connected) {
        this.connectionStatus.connected = connected;
        this.connectionStatusEl.classList.toggle('connected', connected);
    }

    toggleSettings() {
        this.settingsPanel.style.display = this.settingsPanel.style.display === 'block' ? 'none' : 'block';
    }

    saveSettingsToStorage() {
        this.settings = {
            minConfidence: parseInt(this.minConfidenceSlider.value) / 100,
            strategySensitivity: parseInt(this.strategySensitivitySlider.value),
            soundEnabled: this.soundEnabledCheckbox.checked,
            notificationsEnabled: this.notificationsEnabledCheckbox.checked,
            licenseKey: this.settings.licenseKey
        };

        localStorage.setItem('a2_settings', JSON.stringify(this.settings));
        this.settingsPanel.style.display = 'none';
        
        this.showNotification('تنظیمات ذخیره شد', 'success');
    }

    saveToStorage() {
        localStorage.setItem('a2_stats', JSON.stringify(this.todayStats));
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;

        // Add to body
        document.body.appendChild(notification);

        // Remove after delay
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    simulateMarketData() {
        // Simulate receiving market data
        setInterval(() => {
            if (this.active) {
                // Update connection status randomly
                if (Math.random() > 0.1) {
                    this.updateConnectionStatus(true);
                }
            }
        }, 5000);
    }

    updateBrokerTime(brokerTime) {
        this.brokerTime = brokerTime;
    }
}

// Initialize the bot when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.a2Bot = new A2WebBot();
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}