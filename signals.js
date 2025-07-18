/**
 * نظام إدارة الإشارات
 * هذا الملف يحتوي على منطق تحليل الإشارات وتوليدها بناءً على المؤشرات الفنية
 */

class SignalEngine {
    constructor() {
        this.signals = [];
        this.currentSignal = null;
        this.indicators = {};
        this.settings = {
            timeframe: '1m',
            asset: 'EURUSD',
            candles: 5,
            signalTiming: 'instant',
            minStrength: 'medium',
            activeIndicators: {
                rsi: true,
                ema: true,
                bollinger: true,
                macd: true,
                volume: true
            },
            alerts: {
                sound: true,
                notification: true,
                email: false,
                telegram: false
            }
        };

        // تعريف قيم الحد الأدنى لقوة الإشارة
        this.strengthThresholds = {
            weak: 2,      // على الأقل مؤشرين متوافقين
            medium: 3,    // على الأقل 3 مؤشرات متوافقة
            strong: 4     // على الأقل 4 مؤشرات متوافقة
        };

        // تعريف قيم الحدود للمؤشرات
        this.indicatorThresholds = {
            rsi: {
                oversold: 30,    // منطقة التشبع البيعي
                overbought: 70   // منطقة التشبع الشرائي
            },
            volume: {
                significant: 1.5  // نسبة الحجم المهمة مقارنة بالمتوسط
            }
        };
    }

    /**
     * تحديث إعدادات المحرك
     * @param {Object} settings - الإعدادات الجديدة
     */
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
    }

    /**
     * تحليل البيانات وتوليد إشارة إذا تم استيفاء الشروط
     * @param {Object} marketData - بيانات السوق (الأسعار، الأحجام، إلخ)
     * @returns {Object|null} إشارة جديدة أو null إذا لم تكن هناك إشارة
     */
    analyzeMarket(marketData) {
        // استخراج البيانات
        const { prices, volumes, timestamp, asset } = marketData;
        
        // التأكد من وجود بيانات كافية
        if (!prices || prices.length < this.settings.candles) {
            console.warn('بيانات غير كافية للتحليل');
            return null;
        }

        // حساب المؤشرات الفنية
        this.calculateIndicators(prices, volumes);

        // تحليل المؤشرات لتحديد الإشارات
        const signalConditions = this.analyzeIndicators();

        // إذا كان هناك عدد كافٍ من الشروط المتوافقة، قم بإنشاء إشارة
        if (signalConditions.buy.length >= this.strengthThresholds[this.settings.minStrength]) {
            return this.createSignal('buy', signalConditions.buy, timestamp, asset);
        } else if (signalConditions.sell.length >= this.strengthThresholds[this.settings.minStrength]) {
            return this.createSignal('sell', signalConditions.sell, timestamp, asset);
        }

        return null;
    }

    /**
     * حساب جميع المؤشرات الفنية المطلوبة
     * @param {Array} prices - مصفوفة من أسعار الإغلاق
     * @param {Array} volumes - مصفوفة من أحجام التداول
     */
    calculateIndicators(prices, volumes) {
        // حساب RSI
        if (this.settings.activeIndicators.rsi) {
            this.indicators.rsi = TechnicalIndicators.calculateRSI(prices, 14);
        }

        // حساب EMA
        if (this.settings.activeIndicators.ema) {
            this.indicators.emaShort = TechnicalIndicators.calculateEMA(prices, 5);
            this.indicators.emaLong = TechnicalIndicators.calculateEMA(prices, 20);
        }

        // حساب Bollinger Bands
        if (this.settings.activeIndicators.bollinger) {
            this.indicators.bollinger = TechnicalIndicators.calculateBollingerBands(prices, 20, 2);
        }

        // حساب MACD
        if (this.settings.activeIndicators.macd) {
            this.indicators.macd = TechnicalIndicators.calculateMACD(prices);
        }

        // تحليل الحجم
        if (this.settings.activeIndicators.volume && volumes) {
            this.indicators.volume = TechnicalIndicators.analyzeVolume(volumes, 20);
        }
    }

    /**
     * تحليل المؤشرات لتحديد شروط الإشارات
     * @returns {Object} كائن يحتوي على شروط الشراء والبيع
     */
    analyzeIndicators() {
        const conditions = {
            buy: [],
            sell: []
        };

        const currentPrice = this.getCurrentPrice();

        // تحليل RSI
        if (this.settings.activeIndicators.rsi && this.indicators.rsi !== null) {
            // شرط الشراء: RSI في منطقة التشبع البيعي
            if (this.indicators.rsi < this.indicatorThresholds.rsi.oversold) {
                conditions.buy.push({
                    indicator: 'RSI',
                    description: `RSI < ${this.indicatorThresholds.rsi.oversold} (${this.indicators.rsi})`
                });
            }
            // شرط البيع: RSI في منطقة التشبع الشرائي
            else if (this.indicators.rsi > this.indicatorThresholds.rsi.overbought) {
                conditions.sell.push({
                    indicator: 'RSI',
                    description: `RSI > ${this.indicatorThresholds.rsi.overbought} (${this.indicators.rsi})`
                });
            }
        }

        // تحليل EMA
        if (this.settings.activeIndicators.ema && 
            this.indicators.emaShort !== null && 
            this.indicators.emaLong !== null) {
            // شرط الشراء: EMA قصيرة تقطع EMA طويلة للأعلى
            if (this.indicators.emaShort > this.indicators.emaLong) {
                conditions.buy.push({
                    indicator: 'EMA',
                    description: `EMA 5 > EMA 20 (${this.indicators.emaShort} > ${this.indicators.emaLong})`
                });
            }
            // شرط البيع: EMA قصيرة تقطع EMA طويلة للأسفل
            else if (this.indicators.emaShort < this.indicators.emaLong) {
                conditions.sell.push({
                    indicator: 'EMA',
                    description: `EMA 5 < EMA 20 (${this.indicators.emaShort} < ${this.indicators.emaLong})`
                });
            }
        }

        // تحليل Bollinger Bands
        if (this.settings.activeIndicators.bollinger && 
            this.indicators.bollinger !== null && 
            currentPrice !== null) {
            // شرط الشراء: السعر يلمس أو يكسر الحد السفلي
            if (currentPrice <= this.indicators.bollinger.lower) {
                conditions.buy.push({
                    indicator: 'Bollinger',
                    description: `السعر عند/تحت الحد السفلي (${currentPrice} <= ${this.indicators.bollinger.lower})`
                });
            }
            // شرط البيع: السعر يلمس أو يكسر الحد العلوي
            else if (currentPrice >= this.indicators.bollinger.upper) {
                conditions.sell.push({
                    indicator: 'Bollinger',
                    description: `السعر عند/فوق الحد العلوي (${currentPrice} >= ${this.indicators.bollinger.upper})`
                });
            }
        }

        // تحليل MACD
        if (this.settings.activeIndicators.macd && this.indicators.macd !== null) {
            // شرط الشراء: MACD فوق خط الإشارة وتقاطع إيجابي
            if (this.indicators.macd.macd > this.indicators.macd.signal && 
                this.indicators.macd.histogram > 0) {
                conditions.buy.push({
                    indicator: 'MACD',
                    description: `MACD تقاطع إيجابي (${this.indicators.macd.macd} > ${this.indicators.macd.signal})`
                });
            }
            // شرط البيع: MACD تحت خط الإشارة وتقاطع سلبي
            else if (this.indicators.macd.macd < this.indicators.macd.signal && 
                     this.indicators.macd.histogram < 0) {
                conditions.sell.push({
                    indicator: 'MACD',
                    description: `MACD تقاطع سلبي (${this.indicators.macd.macd} < ${this.indicators.macd.signal})`
                });
            }
        }

        // تحليل الحجم
        if (this.settings.activeIndicators.volume && this.indicators.volume !== null) {
            // شرط مشترك: حجم التداول فوق المتوسط بشكل ملحوظ
            if (this.indicators.volume.ratio > this.indicatorThresholds.volume.significant) {
                const volumeCondition = {
                    indicator: 'Volume',
                    description: `حجم مرتفع (${this.indicators.volume.ratio}x المتوسط)`
                };
                
                // إضافة شرط الحجم إلى كل من إشارات الشراء والبيع إذا كانت هناك شروط أخرى
                if (conditions.buy.length > 0) {
                    conditions.buy.push(volumeCondition);
                }
                if (conditions.sell.length > 0) {
                    conditions.sell.push(volumeCondition);
                }
            }
        }

        return conditions;
    }

    /**
     * إنشاء إشارة جديدة
     * @param {String} type - نوع الإشارة (شراء أو بيع)
     * @param {Array} conditions - شروط الإشارة المتوافقة
     * @param {Number} timestamp - الطابع الزمني للإشارة
     * @param {String} asset - الأصل (العملة)
     * @returns {Object} كائن الإشارة
     */
    createSignal(type, conditions, timestamp, asset) {
        // تحديد قوة الإشارة بناءً على عدد الشروط المتوافقة
        let strength = 'weak';
        if (conditions.length >= this.strengthThresholds.strong) {
            strength = 'strong';
        } else if (conditions.length >= this.strengthThresholds.medium) {
            strength = 'medium';
        }

        // إنشاء كائن الإشارة
        const signal = {
            id: this.generateSignalId(),
            type,
            asset: asset || this.settings.asset,
            timeframe: this.settings.timeframe,
            timestamp: timestamp || Date.now(),
            conditions,
            strength,
            result: null, // سيتم تحديثه لاحقًا عند معرفة النتيجة
            profitLoss: null // سيتم تحديثه لاحقًا
        };

        // إضافة الإشارة إلى قائمة الإشارات
        this.signals.push(signal);
        this.currentSignal = signal;

        return signal;
    }

    /**
     * تحديث نتيجة إشارة
     * @param {String} signalId - معرف الإشارة
     * @param {String} result - النتيجة (ربح أو خسارة)
     * @param {Number} profitLoss - قيمة الربح أو الخسارة
     */
    updateSignalResult(signalId, result, profitLoss) {
        const signal = this.signals.find(s => s.id === signalId);
        if (signal) {
            signal.result = result;
            signal.profitLoss = profitLoss;
        }
    }

    /**
     * الحصول على السعر الحالي من البيانات
     * @returns {Number|null} السعر الحالي أو null إذا لم تكن هناك بيانات
     */
    getCurrentPrice() {
        // هذه الدالة تحتاج إلى تنفيذ حقيقي للحصول على السعر الحالي
        // في هذا المثال، نفترض أن السعر متاح في مكان آخر
        return window.currentPrice || null;
    }

    /**
     * توليد معرف فريد للإشارة
     * @returns {String} معرف الإشارة
     */
    generateSignalId() {
        return `signal_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }

    /**
     * الحصول على جميع الإشارات
     * @returns {Array} مصفوفة من الإشارات
     */
    getAllSignals() {
        return this.signals;
    }

    /**
     * الحصول على الإشارة الحالية
     * @returns {Object|null} الإشارة الحالية أو null
     */
    getCurrentSignal() {
        return this.currentSignal;
    }

    /**
     * مسح جميع الإشارات
     */
    clearSignals() {
        this.signals = [];
        this.currentSignal = null;
    }
}

// تصدير الفئة للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SignalEngine;
}