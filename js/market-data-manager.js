/**
 * مدير بيانات السوق
 * هذا الملف يوفر واجهة لإدارة مصادر بيانات السوق المختلفة (وهمية أو حقيقية)
 */

class MarketDataManager {
    constructor() {
        this.dataSource = 'mock'; // 'mock' أو 'real'
        this.mockDataGenerator = null;
        this.realDataConnector = null;
        this.currentAsset = 'EURUSD';
        this.currentTimeframe = '1m';
        this.isRunning = false;
        this.callbacks = {
            onData: null,
            onError: null,
            onStatusChange: null
        };
    }

    /**
     * تهيئة مدير بيانات السوق
     * @param {Object} options - خيارات التهيئة
     * @param {string} options.dataSource - مصدر البيانات ('mock' أو 'real')
     * @param {Object} options.callbacks - دوال رد الاتصال
     */
    init(options = {}) {
        this.dataSource = options.dataSource || 'mock';
        this.callbacks = { ...this.callbacks, ...options.callbacks };

        // تحميل الإعدادات المحفوظة
        this.loadSavedConfig();

        // تهيئة مولد البيانات الوهمية
        this.mockDataGenerator = new MockDataGenerator();

        // تهيئة موصل البيانات الحقيقية إذا كان متاحًا
        if (typeof PocketOptionConnector !== 'undefined') {
            this.realDataConnector = new PocketOptionConnector();
        }

        // إضافة عناصر واجهة المستخدم لإدارة مصدر البيانات
        this.addDataSourceUI();
    }

    /**
     * إضافة عناصر واجهة المستخدم لإدارة مصدر البيانات
     */
    addDataSourceUI() {
        // لا نحتاج إلى إضافة عناصر واجهة المستخدم لأنها موجودة بالفعل في ملف index.html
        // نقوم فقط بتحديث حالة عناصر واجهة المستخدم الموجودة
        const dataSourceSelect = document.getElementById('data-source');
        if (dataSourceSelect) {
            // تحديث القيمة المحددة بناءً على مصدر البيانات الحالي
            const sourceValue = this.dataSource === 'real' ? 'pocket-option' : 'mock';
            dataSourceSelect.value = sourceValue;
            
            // إضافة مستمع الحدث
            dataSourceSelect.addEventListener('change', () => {
                this.setDataSource(dataSourceSelect.value);
                
                // التحقق من تكوين مصدر البيانات الحقيقية
                if (dataSourceSelect.value === 'pocket-option' && this.realDataConnector && !this.realDataConnector.sessionId) {
                    // استخدام showPocketOptionConfigModal من app.js
                    if (typeof showPocketOptionConfigModal === 'function') {
                        showPocketOptionConfigModal();
                    }
                }
            });
        }
        
        // إضافة مستمع الحدث لزر إعدادات Pocket Option
        const pocketOptionSettingsBtn = document.getElementById('pocket-option-settings');
        if (pocketOptionSettingsBtn) {
            pocketOptionSettingsBtn.addEventListener('click', () => {
                // استخدام showPocketOptionConfigModal من app.js
                if (typeof showPocketOptionConfigModal === 'function') {
                    showPocketOptionConfigModal();
                }
            });
        }
        
        // إضافة مستمع الحدث لزر التكوين (إذا كان موجودًا)
        const configureButton = document.querySelector('.data-source-config-button');
        if (configureButton) {
            configureButton.addEventListener('click', () => {
                if (this.dataSource === 'real') {
                    this.showRealDataConfigModal();
                } else {
                    showNotification('لا يلزم تكوين البيانات الوهمية', 'info');
                }
            });
        }
    }

    /**
     * تعيين مصدر البيانات
     * @param {string} source - مصدر البيانات ('mock' أو 'pocket-option')
     */

    /**
     * تعيين مصدر البيانات
     * @param {string} source - مصدر البيانات ('mock' أو 'pocket-option')
     */
    setDataSource(source) {
        // تحويل 'pocket-option' إلى 'real' للتوافق مع المنطق الداخلي
        const internalSource = source === 'pocket-option' ? 'real' : source;
        
        if (internalSource !== 'mock' && internalSource !== 'real') {
            console.error('مصدر بيانات غير صالح:', source);
            return;
        }

        // إيقاف التحليل الحالي إذا كان قيد التشغيل
        const wasRunning = this.isRunning;
        if (wasRunning) {
            this.stop();
        }

        this.dataSource = internalSource;
        localStorage.setItem('dataSource', source); // نحفظ القيمة الأصلية في localStorage

        // تحديث حالة واجهة المستخدم
        const dataSourceSelect = document.getElementById('data-source');
        if (dataSourceSelect) {
            dataSourceSelect.value = source;
        }

        // إعادة تشغيل التحليل إذا كان قيد التشغيل
        if (wasRunning) {
            this.start(this.currentAsset, this.currentTimeframe);
        }

        // استدعاء دالة رد الاتصال لتغيير الحالة
        if (this.callbacks.onStatusChange) {
            this.callbacks.onStatusChange({
                dataSource: this.dataSource,
                isRunning: this.isRunning
            });
        }
    }

    /**
     * تحميل الإعدادات المحفوظة
     */
    loadSavedConfig() {
        const savedDataSource = localStorage.getItem('dataSource');
        if (savedDataSource) {
            // تحويل 'pocket-option' إلى 'real' للتوافق مع المنطق الداخلي
            this.dataSource = savedDataSource === 'pocket-option' ? 'real' : savedDataSource;
            
            // تحديث واجهة المستخدم
            const dataSourceSelect = document.getElementById('data-source');
            if (dataSourceSelect) {
                dataSourceSelect.value = savedDataSource;
            }
        }
    }
    
    /**
     * تعيين معرف جلسة Pocket Option
     * @param {string} sessionId - معرف الجلسة
     */
    setPocketOptionSessionId(sessionId) {
        if (this.realDataConnector) {
            this.realDataConnector.setSessionId(sessionId);
        }
    }
    
    /**
     * الحصول على معرف جلسة Pocket Option
     * @returns {string} - معرف الجلسة
     */
    getPocketOptionSessionId() {
        return this.realDataConnector ? this.realDataConnector.sessionId : null;
    }
    
    /**
     * التحقق مما إذا كان Pocket Option مكونًا
     * @returns {boolean} - هل تم تكوين Pocket Option
     */
    isPocketOptionConfigured() {
        return this.realDataConnector && this.realDataConnector.sessionId ? true : false;
    }

    /**
     * عرض نافذة تكوين مصدر البيانات الحقيقية
     */
    showRealDataConfigModal() {
        // استخدام showPocketOptionConfigModal من app.js
        if (typeof showPocketOptionConfigModal === 'function') {
            showPocketOptionConfigModal();
        } else {
            console.error('وظيفة showPocketOptionConfigModal غير معرفة');
            // إذا لم يكن هناك معرف جلسة صالح، ارجع إلى البيانات الوهمية
            if (!this.realDataConnector || !this.realDataConnector.sessionId) {
                this.setDataSource('mock');
                showNotification('تم الرجوع إلى البيانات الوهمية', 'info');
            }
        }
    }

    /**
     * بدء الحصول على بيانات السوق
     * @param {string} asset - الأصل (مثل EURUSD)
     * @param {string} timeframe - الإطار الزمني (مثل 1m، 5m، 1h)
     */
    start(asset, timeframe) {
        if (this.isRunning) {
            this.stop();
        }

        this.currentAsset = asset || this.currentAsset;
        this.currentTimeframe = timeframe || this.currentTimeframe;
        this.isRunning = true;

        if (this.dataSource === 'mock') {
            // استخدام مولد البيانات الوهمية
            this.startMockDataGeneration();
        } else if (this.dataSource === 'real') {
            // استخدام موصل البيانات الحقيقية
            this.startRealDataConnection();
        }

        // استدعاء دالة رد الاتصال لتغيير الحالة
        if (this.callbacks.onStatusChange) {
            this.callbacks.onStatusChange({
                dataSource: this.dataSource,
                isRunning: this.isRunning,
                asset: this.currentAsset,
                timeframe: this.currentTimeframe
            });
        }
    }

    /**
     * بدء توليد البيانات الوهمية
     */
    startMockDataGeneration() {
        // إعادة تعيين مولد البيانات الوهمية
        this.mockDataGenerator.reset();

        // تحديد فترة التحديث بناءً على الإطار الزمني
        const updateInterval = this.timeframeToMilliseconds(this.currentTimeframe);

        // إنشاء مؤقت لتوليد البيانات
        this.dataTimer = setInterval(() => {
            if (!this.isRunning) return;

            // توليد سعر وحجم جديدين
            const price = this.mockDataGenerator.generatePrice();
            const volume = this.mockDataGenerator.generateVolume();

            // تحديث السعر الحالي للاستخدام في أماكن أخرى
            window.currentPrice = price;

            // إنشاء كائن بيانات السوق
            const marketData = {
                asset: this.currentAsset,
                prices: [price], // في الاستخدام الحقيقي، ستكون هذه مصفوفة من الأسعار التاريخية
                volumes: [volume], // في الاستخدام الحقيقي، ستكون هذه مصفوفة من الأحجام التاريخية
                timestamp: Date.now()
            };

            // استدعاء دالة رد الاتصال مع البيانات الجديدة
            if (this.callbacks.onData) {
                this.callbacks.onData(marketData);
            }
        }, updateInterval / 10); // تحديث أسرع للمحاكاة
    }

    /**
     * بدء الاتصال بالبيانات الحقيقية
     */
    async startRealDataConnection() {
        if (!this.realDataConnector || !this.realDataConnector.sessionId) {
            showNotification('لم يتم تكوين الاتصال بالبيانات الحقيقية', 'error');
            this.setDataSource('mock'); // الرجوع إلى البيانات الوهمية
            this.start(this.currentAsset, this.currentTimeframe);
            return;
        }

        try {
            // الاتصال بخدمة البيانات الحقيقية
            await this.realDataConnector.connect({
                onConnect: () => {
                    showNotification('تم الاتصال بنجاح بخدمة البيانات الحقيقية', 'success');
                },
                onDisconnect: () => {
                    showNotification('تم قطع الاتصال بخدمة البيانات الحقيقية', 'info');
                    this.isRunning = false;
                },
                onData: (data) => {
                    // تحديث السعر الحالي للاستخدام في أماكن أخرى
                    if (data.asset === this.currentAsset && data.prices && data.prices.length > 0) {
                        window.currentPrice = data.prices[data.prices.length - 1];
                    }

                    // استدعاء دالة رد الاتصال مع البيانات الجديدة
                    if (this.callbacks.onData) {
                        this.callbacks.onData(data);
                    }
                },
                onError: (error) => {
                    showNotification('خطأ في خدمة البيانات الحقيقية: ' + error.message, 'error');
                    console.error('خطأ في خدمة البيانات الحقيقية:', error);

                    // الرجوع إلى البيانات الوهمية في حالة الخطأ
                    this.setDataSource('mock');
                    this.start(this.currentAsset, this.currentTimeframe);

                    if (this.callbacks.onError) {
                        this.callbacks.onError(error);
                    }
                }
            });

            // الحصول على البيانات التاريخية للأصل والإطار الزمني الحاليين
            const historicalData = await this.realDataConnector.getHistoricalData(
                this.currentAsset,
                this.currentTimeframe,
                20 // عدد الشمعات التاريخية
            );

            // استدعاء دالة رد الاتصال مع البيانات التاريخية
            if (historicalData && this.callbacks.onData) {
                this.callbacks.onData(historicalData);
            }
        } catch (error) {
            showNotification('فشل في الاتصال بخدمة البيانات الحقيقية: ' + error.message, 'error');
            console.error('فشل في الاتصال بخدمة البيانات الحقيقية:', error);

            // الرجوع إلى البيانات الوهمية في حالة الخطأ
            this.setDataSource('mock');
            this.start(this.currentAsset, this.currentTimeframe);

            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
        }
    }

    /**
     * إيقاف الحصول على بيانات السوق
     */
    stop() {
        this.isRunning = false;

        // إيقاف مؤقت البيانات الوهمية
        if (this.dataTimer) {
            clearInterval(this.dataTimer);
            this.dataTimer = null;
        }

        // قطع الاتصال بالبيانات الحقيقية
        if (this.dataSource === 'real' && this.realDataConnector) {
            this.realDataConnector.disconnect();
        }

        // استدعاء دالة رد الاتصال لتغيير الحالة
        if (this.callbacks.onStatusChange) {
            this.callbacks.onStatusChange({
                dataSource: this.dataSource,
                isRunning: this.isRunning
            });
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
        if (this.dataSource === 'mock') {
            // في حالة البيانات الوهمية، نفترض أن السوق مفتوح دائمًا
            return Promise.resolve({
                asset: asset || this.currentAsset,
                isOpen: true,
                nextOpenTime: null
            });
        } else if (this.dataSource === 'real' && this.realDataConnector) {
            try {
                return await this.realDataConnector.getMarketStatus(asset || this.currentAsset);
            } catch (error) {
                console.error('خطأ في الحصول على حالة السوق:', error);
                if (this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
                return Promise.reject(error);
            }
        }

        return Promise.reject(new Error('مصدر بيانات غير صالح'));
    }

    /**
     * التحقق مما إذا كان Pocket Option مكوناً
     * @returns {boolean} - إذا كان Pocket Option مكوناً
     */
    isPocketOptionConfigured() {
        return this.realDataConnector && this.realDataConnector.getSessionId() !== null;
    }

    /**
     * الحصول على قائمة الأصول المتاحة
     * @returns {Promise<Array>} - وعد بقائمة الأصول
     */
    async getAvailableAssets() {
        if (this.dataSource === 'mock') {
            // في حالة البيانات الوهمية، نعيد قائمة ثابتة من الأصول
            return Promise.resolve([
                { id: 'EURUSD', name: 'EUR/USD' },
                { id: 'GBPUSD', name: 'GBP/USD' },
                { id: 'USDJPY', name: 'USD/JPY' },
                { id: 'BTCUSD', name: 'BTC/USD' },
                { id: 'ETHUSD', name: 'ETH/USD' }
            ]);
        } else if (this.dataSource === 'real' && this.realDataConnector) {
            try {
                return await this.realDataConnector.getAvailableAssets();
            } catch (error) {
                console.error('خطأ في الحصول على قائمة الأصول:', error);
                if (this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
                return Promise.reject(error);
            }
        }

        return Promise.reject(new Error('مصدر بيانات غير صالح'));
    }
}

// تصدير الفئة للاستخدام في الملفات الأخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MarketDataManager };
} else {
    // للاستخدام في المتصفح
    window.MarketDataManager = MarketDataManager;
}