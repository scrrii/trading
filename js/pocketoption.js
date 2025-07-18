/**
 * نظام الاتصال ببيانات السوق الحقيقية من منصة Pocket Option
 * هذا الملف يوفر واجهة للاتصال بـ API الخاص بمنصة Pocket Option والحصول على بيانات السوق الحقيقية
 */

class PocketOptionConnector {
    constructor() {
        this.isConnected = false;
        this.sessionId = null;
        this.apiUrl = 'https://api.pocketoption.com/v1/';
        this.wsConnection = null;
        this.marketData = {};
        this.callbacks = {
            onConnect: null,
            onDisconnect: null,
            onData: null,
            onError: null
        };
    }

    /**
     * تعيين معرف الجلسة للاتصال بـ API
     * @param {string} sessionId - معرف الجلسة من متصفح المستخدم
     */
    setSessionId(sessionId) {
        this.sessionId = sessionId;
        localStorage.setItem('pocketOptionSessionId', sessionId);
    }

    /**
     * تحميل معرف الجلسة المحفوظ
     * @returns {boolean} - نجاح تحميل معرف الجلسة
     */
    loadSavedSessionId() {
        const savedSessionId = localStorage.getItem('pocketOptionSessionId');
        if (savedSessionId) {
            this.sessionId = savedSessionId;
            return true;
        }
        return false;
    }

    /**
     * الاتصال بخدمة Pocket Option
     * @param {Object} callbacks - دوال رد الاتصال
     * @returns {Promise} - وعد بنتيجة الاتصال
     */
    async connect(callbacks = {}) {
        if (!this.sessionId) {
            if (!this.loadSavedSessionId()) {
                const error = new Error('لم يتم تعيين معرف الجلسة. يرجى استخدام setSessionId أولاً.');
                if (callbacks.onError) callbacks.onError(error);
                return Promise.reject(error);
            }
        }

        // تعيين دوال رد الاتصال
        this.callbacks = { ...this.callbacks, ...callbacks };

        try {
            // التحقق من صحة معرف الجلسة
            const isValid = await this.validateSession();
            if (!isValid) {
                const error = new Error('معرف الجلسة غير صالح أو منتهي الصلاحية.');
                if (this.callbacks.onError) this.callbacks.onError(error);
                return Promise.reject(error);
            }

            // إنشاء اتصال WebSocket للحصول على بيانات السوق في الوقت الحقيقي
            await this.connectWebSocket();

            this.isConnected = true;
            if (this.callbacks.onConnect) this.callbacks.onConnect();
            return Promise.resolve(true);
        } catch (error) {
            if (this.callbacks.onError) this.callbacks.onError(error);
            return Promise.reject(error);
        }
    }

    /**
     * التحقق من صحة معرف الجلسة
     * @returns {Promise<boolean>} - وعد بنتيجة التحقق
     */
    async validateSession() {
        try {
            const response = await fetch(`${this.apiUrl}account/info`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionId}`
                }
            });

            if (response.ok) {
                return true;
            }
            return false;
        } catch (error) {
            console.error('خطأ في التحقق من معرف الجلسة:', error);
            return false;
        }
    }

    /**
     * إنشاء اتصال WebSocket للحصول على بيانات السوق في الوقت الحقيقي
     * @returns {Promise} - وعد بنتيجة الاتصال
     */
    connectWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                // في الواقع، يجب استبدال هذا بعنوان WebSocket الحقيقي لـ Pocket Option
                const wsUrl = `wss://ws.pocketoption.com/v1/quotes?session=${this.sessionId}`;
                this.wsConnection = new WebSocket(wsUrl);

                this.wsConnection.onopen = () => {
                    console.log('تم الاتصال بخدمة WebSocket');
                    resolve(true);
                };

                this.wsConnection.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.processMarketData(data);
                    } catch (error) {
                        console.error('خطأ في معالجة بيانات WebSocket:', error);
                    }
                };

                this.wsConnection.onerror = (error) => {
                    console.error('خطأ في اتصال WebSocket:', error);
                    if (this.callbacks.onError) this.callbacks.onError(error);
                    reject(error);
                };

                this.wsConnection.onclose = () => {
                    console.log('تم إغلاق اتصال WebSocket');
                    this.isConnected = false;
                    if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
                };
            } catch (error) {
                console.error('خطأ في إنشاء اتصال WebSocket:', error);
                reject(error);
            }
        });
    }

    /**
     * معالجة بيانات السوق الواردة من WebSocket
     * @param {Object} data - بيانات السوق
     */
    processMarketData(data) {
        // تحديث بيانات السوق المحلية
        if (data.asset && data.quotes) {
            const asset = data.asset;
            const quotes = data.quotes;

            if (!this.marketData[asset]) {
                this.marketData[asset] = {
                    prices: [],
                    volumes: [],
                    timestamps: []
                };
            }

            // إضافة البيانات الجديدة
            this.marketData[asset].prices.push(quotes.close);
            this.marketData[asset].volumes.push(quotes.volume || 0);
            this.marketData[asset].timestamps.push(quotes.timestamp);

            // الاحتفاظ بعدد محدود من البيانات (مثلاً آخر 100 قيمة)
            const maxDataPoints = 100;
            if (this.marketData[asset].prices.length > maxDataPoints) {
                this.marketData[asset].prices.shift();
                this.marketData[asset].volumes.shift();
                this.marketData[asset].timestamps.shift();
            }

            // استدعاء دالة رد الاتصال لإشعار المستمعين بالبيانات الجديدة
            if (this.callbacks.onData) {
                this.callbacks.onData({
                    asset,
                    prices: this.marketData[asset].prices,
                    volumes: this.marketData[asset].volumes,
                    timestamp: quotes.timestamp
                });
            }
        }
    }

    /**
     * الحصول على بيانات السوق التاريخية
     * @param {string} asset - الأصل (مثل EURUSD)
     * @param {string} timeframe - الإطار الزمني (مثل 1m، 5m، 1h)
     * @param {number} count - عدد الشمعات المطلوبة
     * @returns {Promise} - وعد ببيانات السوق
     */
    async getHistoricalData(asset, timeframe, count = 100) {
        if (!this.isConnected || !this.sessionId) {
            const error = new Error('غير متصل بخدمة Pocket Option');
            if (this.callbacks.onError) this.callbacks.onError(error);
            return Promise.reject(error);
        }

        try {
            // تحويل الإطار الزمني إلى تنسيق API
            const apiTimeframe = this.convertTimeframe(timeframe);

            const response = await fetch(`${this.apiUrl}candles/history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionId}`
                },
                body: JSON.stringify({
                    asset,
                    timeframe: apiTimeframe,
                    count
                })
            });

            if (!response.ok) {
                throw new Error(`فشل في الحصول على البيانات التاريخية: ${response.statusText}`);
            }

            const data = await response.json();
            return this.formatHistoricalData(data, asset);
        } catch (error) {
            console.error('خطأ في الحصول على البيانات التاريخية:', error);
            if (this.callbacks.onError) this.callbacks.onError(error);
            return Promise.reject(error);
        }
    }

    /**
     * تنسيق البيانات التاريخية إلى تنسيق متوافق مع نظام الإشارات
     * @param {Object} data - البيانات الخام من API
     * @param {string} asset - الأصل
     * @returns {Object} - البيانات المنسقة
     */
    formatHistoricalData(data, asset) {
        if (!data || !data.candles || !Array.isArray(data.candles)) {
            return null;
        }

        const prices = [];
        const volumes = [];
        const timestamps = [];

        data.candles.forEach(candle => {
            prices.push(candle.close);
            volumes.push(candle.volume || 0);
            timestamps.push(candle.timestamp);
        });

        return {
            asset,
            prices,
            volumes,
            timestamps
        };
    }

    /**
     * تحويل الإطار الزمني إلى تنسيق API
     * @param {string} timeframe - الإطار الزمني (مثل 1m، 5m، 1h)
     * @returns {string} - الإطار الزمني بتنسيق API
     */
    convertTimeframe(timeframe) {
        // تحويل الإطار الزمني من تنسيق التطبيق إلى تنسيق API
        const timeframeMap = {
            '15s': '15s',
            '30s': '30s',
            '1m': '1m',
            '2m': '2m',
            '5m': '5m',
            '15m': '15m',
            '30m': '30m',
            '1h': '1h',
            '4h': '4h',
            '1d': '1d'
        };

        return timeframeMap[timeframe] || '1m';
    }

    /**
     * قطع الاتصال بخدمة Pocket Option
     */
    disconnect() {
        if (this.wsConnection) {
            this.wsConnection.close();
            this.wsConnection = null;
        }

        this.isConnected = false;
        if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
    }

    /**
     * الحصول على قائمة الأصول المتاحة
     * @returns {Promise<Array>} - وعد بقائمة الأصول
     */
    async getAvailableAssets() {
        if (!this.isConnected || !this.sessionId) {
            const error = new Error('غير متصل بخدمة Pocket Option');
            if (this.callbacks.onError) this.callbacks.onError(error);
            return Promise.reject(error);
        }

        try {
            const response = await fetch(`${this.apiUrl}assets/list`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionId}`
                }
            });

            if (!response.ok) {
                throw new Error(`فشل في الحصول على قائمة الأصول: ${response.statusText}`);
            }

            const data = await response.json();
            return data.assets || [];
        } catch (error) {
            console.error('خطأ في الحصول على قائمة الأصول:', error);
            if (this.callbacks.onError) this.callbacks.onError(error);
            return Promise.reject(error);
        }
    }

    /**
     * الحصول على معلومات حالة السوق (مفتوح أو مغلق)
     * @param {string} asset - الأصل
     * @returns {Promise<Object>} - وعد بمعلومات حالة السوق
     */
    async getMarketStatus(asset) {
        if (!this.isConnected || !this.sessionId) {
            const error = new Error('غير متصل بخدمة Pocket Option');
            if (this.callbacks.onError) this.callbacks.onError(error);
            return Promise.reject(error);
        }

        try {
            const response = await fetch(`${this.apiUrl}assets/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionId}`
                },
                body: JSON.stringify({
                    assets: [asset]
                })
            });

            if (!response.ok) {
                throw new Error(`فشل في الحصول على حالة السوق: ${response.statusText}`);
            }

            const data = await response.json();
            return data.statuses && data.statuses[asset] ? {
                asset,
                isOpen: data.statuses[asset].isOpen,
                nextOpenTime: data.statuses[asset].nextOpenTime
            } : null;
        } catch (error) {
            console.error('خطأ في الحصول على حالة السوق:', error);
            if (this.callbacks.onError) this.callbacks.onError(error);
            return Promise.reject(error);
        }
    }
}

// تصدير الفئة للاستخدام في الملفات الأخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PocketOptionConnector };
} else {
    // للاستخدام في المتصفح
    window.PocketOptionConnector = PocketOptionConnector;
}