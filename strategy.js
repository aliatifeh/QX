// == FILE: strategy.js ==

window.A2Strategy = {
    lastSignalTime: 0,
    signalCooldown: 60000, // یک دقیقه
    marketData: [],
    trendDirection: 0,
    volatility: 0.5,

    generateSignal() {
        const now = Date.now();

        if (now - this.lastSignalTime < this.signalCooldown) {
            return null;
        }

        this.analyzeMarket();

        if (!this.isFavorableCondition()) {
            return null;
        }

        const signal = this.calculateAdvancedSignal();

        this.lastSignalTime = now;
        return signal;
    },

    analyzeMarket() {
        if (!window.a2Bot || !window.a2Bot.realMarketData) return;

        // استفاده از داده واقعی بروکر
        const price = window.a2Bot.realMarketData.currentPrice;
        this.marketData.push(price);

        if (this.marketData.length > 100) {
            this.marketData.shift();
        }

        this.calculateVolatility();
        this.detectTrend();
    },

    calculateVolatility() {
        if (this.marketData.length < 20) return;
        let sum = 0;
        for (let i = 1; i < this.marketData.length; i++) {
            sum += Math.abs(this.marketData[i] - this.marketData[i - 1]);
        }
        this.volatility = sum / this.marketData.length;
    },

    detectTrend() {
        if (this.marketData.length < 50) return;
        const shortMA = this.calculateSMA(this.marketData, 20);
        const longMA = this.calculateSMA(this.marketData, 50);
        this.trendDirection = shortMA > longMA ? 1 : -1;
        this.trendStrength = Math.abs(shortMA - longMA) / longMA;
    },

    isFavorableCondition() {
        const hasVolatility = this.volatility > 0.005;
        const hasTrend = this.trendStrength > 0.002;
        return hasVolatility && hasTrend;
    },

    calculateAdvancedSignal() {
        const rsi = this.calculateRSI(this.marketData);
        const macd = this.calculateMACD(this.marketData);
        const stochastic = this.calculateStochastic();

        let buyScore = 0;
        let sellScore = 0;

        if (rsi < 30) buyScore += 2;
        if (rsi > 70) sellScore += 2;

        if (macd && macd.macd > macd.signal) buyScore += 1.5;
        if (macd && macd.macd < macd.signal) sellScore += 1.5;

        if (stochastic < 20) buyScore += 1;
        if (stochastic > 80) sellScore += 1;

        if (this.trendDirection > 0) buyScore += 1.5;
        if (this.trendDirection < 0) sellScore += 1.5;

        const direction = buyScore > sellScore ? 'BUY' : 'SELL';
        const confidence = this.calculateConfidence(buyScore, sellScore);

        return {
            direction,
            confidence: Math.min(0.95, Math.max(0.75, confidence)),
            timestamp: Date.now()
        };
    },

    calculateConfidence(buyScore, sellScore) {
        const totalScore = buyScore + sellScore;
        const winningScore = Math.max(buyScore, sellScore);
        let confidence = 0.75 + (winningScore / totalScore) * 0.2;

        if (this.volatility > 0.01) confidence += 0.05;
        if (this.trendStrength > 0.005) confidence += 0.05;

        return confidence;
    },

    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50;
        let gains = 0;
        let losses = 0;
        for (let i = prices.length - period; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            if (change > 0) gains += change;
            else losses -= change;
        }
        gains /= period;
        losses /= period;
        if (losses === 0) return 100;
        const rs = gains / losses;
        return 100 - (100 / (1 + rs));
    },

    calculateSMA(prices, period) {
        if (prices.length < period) return 0;
        return prices.slice(-period).reduce((a, b) => a + b) / period;
    },

    calculateEMA(prices, period) {
        if (prices.length < period) return 0;
        const k = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;
        for (let i = period; i < prices.length; i++) {
            ema = (prices[i] * k) + (ema * (1 - k));
        }
        return ema;
    },

    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (prices.length < slowPeriod + signalPeriod) return null;
        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);
        const macdLine = fastEMA - slowEMA;
        const signalLine = this.calculateEMA(prices.slice(-signalPeriod), signalPeriod);
        return { macd: macdLine, signal: signalLine, histogram: macdLine - signalLine };
    },

    calculateStochastic() {
        if (!window.a2Bot || !window.a2Bot.realMarketData) return 50;
        const { high, low, currentPrice } = window.a2Bot.realMarketData;
        if (high === low) return 50;
        return ((currentPrice - low) / (high - low)) * 100;
    }
};

function syncWithBrokerTime() {
    setInterval(() => {
        if (window.a2Bot && window.a2Bot.active) {
            const brokerTime = new Date();
            if (window.a2Bot.updateBrokerTime) {
                window.a2Bot.updateBrokerTime(brokerTime);
            }
        }
    }, 30000);
}

document.addEventListener('DOMContentLoaded', syncWithBrokerTime);
