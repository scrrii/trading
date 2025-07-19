/**
 * موصل Pocket Option
 * هذا الملف يوفر واجهة للاتصال بمنصة Pocket Option والحصول على بيانات السوق الحقيقية
 */

class PocketOptionConnector {
    constructor() {
        this.sessionId = null;
        this.socket = null;
        this.isConnected = false;
        this.callbacks = {
            onConnect: null,
            onDisconnect: null,
            onData: null,
            onError: null
        };
        this.marketData = {
            prices: {},
            volumes: {},
            timestamps: {}
        };
        this.apiBaseUrl = 'https://api.pocketoption.com';
        this.wsBaseUrl = 'wss://ws.pocketoption.com';
        
        // تحميل معرف الجلسة المحفوظ
        this.loadSessionId();
    }

    /**
     * تعيين معرف الجلسة
     * @param {string} sessionId - معرف الجلسة من Pocket Option
     */
    setSessionId(sessionId) {
        if (!sessionId) {
            console.error('معرف الجلسة غير صالح');
            return;
        }

        // التحقق مما إذا كان معرف الجلسة بتنسيق PHP المشفر
        if (sessionId.startsWith('a:4:') && sessionId.includes('session_id')) {
            try {
                // استخراج معرف الجلسة الفعلي من النص المشفر
                const match = sessionId.match(/s:10:"session_id";s:\d+:"([a-f0-9]+)"/i) || 
                              sessionId.match(/s:10:"session_id";s:\d+:"([^"]+)"/i);
                
                if (match && match[1]) {
                    console.log('تم استخراج معرف الجلسة بنجاح:', match[1]);
                    sessionId = match[1];
                } else {
                    console.warn('لم يتم العثور على معرف الجلسة في النص المشفر');
                }
            } catch (error) {
                console.error('خطأ في معالجة معرف الجلسة:', error);
            }
        } else if (sessionId.length > 100) {
            // إذا كان النص طويلاً جدًا ولكن لا يتطابق مع النمط المعروف
            console.warn('تم توفير نص طويل كمعرف جلسة، قد لا يكون بالتنسيق الصحيح');
        }
        
        // تنظيف معرف الجلسة من أي أحرف غير مرغوب فيها
        sessionId = sessionId.trim();
        
        this.sessionId = sessionId;
        localStorage.setItem('pocketOptionSessionId', sessionId);
        console.log('تم حفظ معرف الجلسة بنجاح');
    }

    /**
     * تحميل معرف الجلسة المحفوظ
     */
    loadSessionId() {
        const savedSessionId = localStorage.getItem('pocketOptionSessionId');
        if (savedSessionId) {
            this.sessionId = savedSessionId;
        }
    }
    
    /**
     * الحصول على معرف الجلسة
     * @returns {string|null} - معرف الجلسة أو null إذا لم يتم تعيينه
     */
    getSessionId() {
        return this.sessionId;
    }

    /**
     * التحقق من صلاحية معرف الجلسة
     * @returns {Promise<boolean>} - وعد بنتيجة التحقق
     */
    async validateSession() {
        if (!this.sessionId) {
            console.warn('لا يوجد معرف جلسة للتحقق منه');
            return Promise.resolve(false);
        }

        // التحقق من تنسيق معرف الجلسة
        if (this.sessionId.length < 10 || this.sessionId.length > 100) {
            console.warn('معرف الجلسة غير صالح: الطول غير صحيح');
        }

        try {
            console.log('جاري التحقق من صلاحية معرف الجلسة...');
            // محاولة الحصول على معلومات المستخدم للتحقق من صلاحية الجلسة
            const response = await fetch(`${this.apiBaseUrl}/v1/user/info`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionId}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const isValid = data && data.success;
                console.log('نتيجة التحقق من معرف الجلسة:', isValid ? 'صالح' : 'غير صالح');
                return isValid;
            }
            console.warn('فشل التحقق من معرف الجلسة: استجابة غير ناجحة من الخادم');
            return false;
        } catch (error) {
            console.error('خطأ في التحقق من صلاحية الجلسة:', error);
            return false;
        }
    }

    /**
     * الاتصال بخدمة البيانات
     * @param {Object} callbacks - دوال رد الاتصال
     * @returns {Promise<void>} - وعد بنتيجة الاتصال
     */
    async connect(callbacks = {}) {
        if (!this.sessionId) {
            return Promise.reject(new Error('معرف الجلسة غير متوفر'));
        }

        // تخزين دوال رد الاتصال
        this.callbacks = { ...this.callbacks, ...callbacks };

        // التحقق من صلاحية الجلسة قبل الاتصال
        const isValid = await this.validateSession();
        if (!isValid) {
            return Promise.reject(new Error('معرف الجلسة غير صالح أو منتهي الصلاحية'));
        }

        // إنشاء اتصال WebSocket
        return new Promise((resolve, reject) => {
            try {
                this.socket = new WebSocket(`${this.wsBaseUrl}/v1/quotes?token=${this.sessionId}`);

                this.socket.onopen = () => {
                    this.isConnected = true;
                    console.log('تم الاتصال بنجاح بخدمة البيانات');
                    
                    if (this.callbacks.onConnect) {
                        this.callbacks.onConnect();
                    }
                    
                    resolve();
                };

                this.socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.processMarketData(data);
                    } catch (error) {
                        console.error('خطأ في معالجة بيانات السوق:', error);
                        
                        if (this.callbacks.onError) {
                            this.callbacks.onError(error);
                        }
                    }
                };

                this.socket.onclose = () => {
                    this.isConnected = false;
                    console.log('تم قطع الاتصال بخدمة البيانات');
                    
                    if (this.callbacks.onDisconnect) {
                        this.callbacks.onDisconnect();
                    }
                };

                this.socket.onerror = (error) => {
                    console.error('خطأ في اتصال WebSocket:', error);
                    
                    if (this.callbacks.onError) {
                        this.callbacks.onError(error);
                    }
                    
                    reject(error);
                };
            } catch (error) {
                console.error('خطأ في إنشاء اتصال WebSocket:', error);
                
                if (this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
                
                reject(error);
            }
        });
    }

    /**
     * قطع الاتصال بخدمة البيانات
     */
    disconnect() {
        if (this.socket && this.isConnected) {
            this.socket.close();
            this.isConnected = false;
        }
    }

    /**
     * معالجة بيانات السوق الواردة
     * @param {Object} data - بيانات السوق
     */
    processMarketData(data) {
        if (!data || !data.asset) return;

        const { asset, price, volume, timestamp } = data;

        // تخزين البيانات
        if (!this.marketData.prices[asset]) {
            this.marketData.prices[asset] = [];
            this.marketData.volumes[asset] = [];
            this.marketData.timestamps[asset] = [];
        }

        // إضافة البيانات الجديدة
        this.marketData.prices[asset].push(price);
        this.marketData.volumes[asset].push(volume || 0);
        this.marketData.timestamps[asset].push(timestamp || Date.now());

        // الاحتفاظ بآخر 100 نقطة بيانات فقط
        const maxDataPoints = 100;
        if (this.marketData.prices[asset].length > maxDataPoints) {
            this.marketData.prices[asset] = this.marketData.prices[asset].slice(-maxDataPoints);
            this.marketData.volumes[asset] = this.marketData.volumes[asset].slice(-maxDataPoints);
            this.marketData.timestamps[asset] = this.marketData.timestamps[asset].slice(-maxDataPoints);
        }

        // إرسال البيانات إلى المستمع
        if (this.callbacks.onData) {
            this.callbacks.onData({
                asset,
                prices: this.marketData.prices[asset],
                volumes: this.marketData.volumes[asset],
                timestamps: this.marketData.timestamps[asset]
            });
        }
    }

    /**
     * الحصول على البيانات التاريخية
     * @param {string} asset - الأصل
     * @param {string} timeframe - الإطار الزمني
     * @param {number} count - عدد الشمعات
     * @returns {Promise<Object>} - وعد ببيانات الشمعات التاريخية
     */
    async getHistoricalData(asset, timeframe, count = 20) {
        if (!this.sessionId) {
            return Promise.reject(new Error('معرف الجلسة غير متوفر'));
        }

        try {
            const tf = this.convertTimeframe(timeframe);
            const endTime = Date.now();
            const startTime = endTime - (this.timeframeToMilliseconds(timeframe) * count);

            const response = await fetch(`${this.apiBaseUrl}/v1/candles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionId}`
                },
                body: JSON.stringify({
                    asset,
                    timeframe: tf,
                    start_time: Math.floor(startTime / 1000),
                    end_time: Math.floor(endTime / 1000),
                    count
                })
            });

            if (!response.ok) {
                throw new Error(`فشل في الحصول على البيانات التاريخية: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success || !data.candles) {
                throw new Error('بيانات الشمعات غير متوفرة');
            }

            // تحويل البيانات إلى التنسيق المطلوب
            const prices = [];
            const volumes = [];
            const timestamps = [];

            data.candles.forEach(candle => {
                prices.push(candle.close);
                volumes.push(candle.volume || 0);
                timestamps.push(candle.timestamp * 1000); // تحويل من ثواني إلى مللي ثانية
            });

            return {
                asset,
                prices,
                volumes,
                timestamps
            };
        } catch (error) {
            console.error('خطأ في الحصول على البيانات التاريخية:', error);
            return Promise.reject(error);
        }
    }

    /**
     * تحويل الإطار الزمني إلى التنسيق المطلوب للواجهة البرمجية
     * @param {string} timeframe - الإطار الزمني (مثل 1m، 5m، 1h)
     * @returns {string} - الإطار الزمني بتنسيق الواجهة البرمجية
     */
    convertTimeframe(timeframe) {
        const value = parseInt(timeframe);
        const unit = timeframe.replace(/[0-9]/g, '');
        
        switch (unit) {
            case 's':
                return `${value}s`;
            case 'm':
                return `${value}m`;
            case 'h':
                return `${value}h`;
            case 'd':
                return `${value}d`;
            default:
                return '1m'; // افتراضي: 1 دقيقة
        }
    }

    /**
     * تحويل الإطار الزمني إلى مللي ثانية
     * @param {string} timeframe - الإطار الزمني (مثل 1m، 5m، 1h)
     * @returns {number} - المدة بالمللي ثانية
     */
    timeframeToMilliseconds(timeframe) {
        const value = parseInt(timeframe);
        const unit = timeframe.replace(/[0-9]/g, '');
        
        switch (unit) {
            case 's':
                return value * 1000;
            case 'm':
                return value * 60 * 1000;
            case 'h':
                return value * 60 * 60 * 1000;
            case 'd':
                return value * 24 * 60 * 60 * 1000;
            default:
                return 60 * 1000; // افتراضي: 1 دقيقة
        }
    }

    /**
     * الحصول على حالة السوق (مفتوح أو مغلق)
     * @param {string} asset - الأصل
     * @returns {Promise<Object>} - وعد بمعلومات حالة السوق
     */
    async getMarketStatus(asset) {
        if (!this.sessionId) {
            return Promise.reject(new Error('معرف الجلسة غير متوفر'));
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/v1/market/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionId}`
                },
                body: JSON.stringify({ asset })
            });

            if (!response.ok) {
                throw new Error(`فشل في الحصول على حالة السوق: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error('معلومات حالة السوق غير متوفرة');
            }

            return {
                asset,
                isOpen: data.is_open,
                nextOpenTime: data.next_open_time ? new Date(data.next_open_time * 1000) : null
            };
        } catch (error) {
            console.error('خطأ في الحصول على حالة السوق:', error);
            return Promise.reject(error);
        }
    }

    /**
     * الحصول على قائمة الأصول المتاحة
     * @returns {Promise<Array>} - وعد بقائمة الأصول
     */
    async getAvailableAssets() {
        if (!this.sessionId) {
            return Promise.reject(new Error('معرف الجلسة غير متوفر'));
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/v1/assets`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionId}`
                }
            });

            if (!response.ok) {
                throw new Error(`فشل في الحصول على قائمة الأصول: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success || !data.assets) {
                throw new Error('قائمة الأصول غير متوفرة');
            }

            return data.assets.map(asset => ({
                id: asset.id,
                name: asset.name,
                type: asset.type,
                isOpen: asset.is_open
            }));
        } catch (error) {
            console.error('خطأ في الحصول على قائمة الأصول:', error);
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