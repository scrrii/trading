/**
 * نظام المؤشرات الفنية
 * هذا الملف يحتوي على حسابات المؤشرات الفنية المستخدمة في نظام الإشارات
 */

class TechnicalIndicators {
    /**
     * حساب مؤشر القوة النسبية (RSI)
     * @param {Array} prices - مصفوفة من أسعار الإغلاق
     * @param {Number} period - الفترة المستخدمة لحساب RSI (عادة 14)
     * @returns {Number} قيمة مؤشر RSI
     */
    static calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) {
            return null; // نحتاج على الأقل فترة + 1 من البيانات
        }

        // حساب التغيرات في الأسعار
        let changes = [];
        for (let i = 1; i < prices.length; i++) {
            changes.push(prices[i] - prices[i - 1]);
        }

        // حساب المكاسب والخسائر
        let gains = changes.map(change => change > 0 ? change : 0);
        let losses = changes.map(change => change < 0 ? Math.abs(change) : 0);

        // حساب متوسط المكاسب والخسائر
        let avgGain = this.calculateAverage(gains.slice(0, period));
        let avgLoss = this.calculateAverage(losses.slice(0, period));

        // حساب RS و RSI للفترة الأولى
        if (avgLoss === 0) {
            return 100; // لا توجد خسائر، RSI = 100
        }

        // حساب RS و RSI للفترات اللاحقة باستخدام الصيغة الأصلية
        for (let i = period; i < changes.length; i++) {
            avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
            avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
        }

        const RS = avgGain / avgLoss;
        const RSI = 100 - (100 / (1 + RS));

        return parseFloat(RSI.toFixed(2));
    }

    /**
     * حساب المتوسط المتحرك الأسي (EMA)
     * @param {Array} prices - مصفوفة من أسعار الإغلاق
     * @param {Number} period - الفترة المستخدمة لحساب EMA
     * @returns {Number} قيمة EMA
     */
    static calculateEMA(prices, period) {
        if (prices.length < period) {
            return null;
        }

        const k = 2 / (period + 1); // معامل الترجيح

        // حساب SMA الأولي
        let ema = this.calculateSMA(prices.slice(0, period), period);

        // حساب EMA للفترات اللاحقة
        for (let i = period; i < prices.length; i++) {
            ema = (prices[i] * k) + (ema * (1 - k));
        }

        return parseFloat(ema.toFixed(2));
    }

    /**
     * حساب المتوسط المتحرك البسيط (SMA)
     * @param {Array} prices - مصفوفة من أسعار الإغلاق
     * @param {Number} period - الفترة المستخدمة لحساب SMA
     * @returns {Number} قيمة SMA
     */
    static calculateSMA(prices, period) {
        if (prices.length < period) {
            return null;
        }

        return this.calculateAverage(prices.slice(-period));
    }

    /**
     * حساب مؤشر MACD
     * @param {Array} prices - مصفوفة من أسعار الإغلاق
     * @param {Number} fastPeriod - الفترة السريعة (عادة 12)
     * @param {Number} slowPeriod - الفترة البطيئة (عادة 26)
     * @param {Number} signalPeriod - فترة الإشارة (عادة 9)
     * @returns {Object} كائن يحتوي على قيم MACD و Signal و Histogram
     */
    static calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (prices.length < slowPeriod + signalPeriod) {
            return null;
        }

        // حساب EMA السريع والبطيء
        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);

        // حساب خط MACD
        const macdLine = fastEMA - slowEMA;

        // حساب خط الإشارة (EMA لخط MACD)
        // نحتاج إلى حساب MACD لعدة فترات لحساب خط الإشارة
        let macdValues = [];
        for (let i = slowPeriod - 1; i < prices.length; i++) {
            const fastEMA = this.calculateEMA(prices.slice(0, i + 1), fastPeriod);
            const slowEMA = this.calculateEMA(prices.slice(0, i + 1), slowPeriod);
            macdValues.push(fastEMA - slowEMA);
        }

        const signalLine = this.calculateEMA(macdValues, signalPeriod);

        // حساب الهيستوجرام
        const histogram = macdLine - signalLine;

        return {
            macd: parseFloat(macdLine.toFixed(2)),
            signal: parseFloat(signalLine.toFixed(2)),
            histogram: parseFloat(histogram.toFixed(2))
        };
    }

    /**
     * حساب مؤشر Bollinger Bands
     * @param {Array} prices - مصفوفة من أسعار الإغلاق
     * @param {Number} period - الفترة المستخدمة (عادة 20)
     * @param {Number} stdDev - عدد الانحرافات المعيارية (عادة 2)
     * @returns {Object} كائن يحتوي على الحد العلوي والمتوسط والحد السفلي
     */
    static calculateBollingerBands(prices, period = 20, stdDev = 2) {
        if (prices.length < period) {
            return null;
        }

        // حساب SMA
        const middle = this.calculateSMA(prices.slice(-period), period);

        // حساب الانحراف المعياري
        const sd = this.calculateStandardDeviation(prices.slice(-period), middle);

        // حساب الحدود العليا والسفلى
        const upper = middle + (stdDev * sd);
        const lower = middle - (stdDev * sd);

        return {
            upper: parseFloat(upper.toFixed(2)),
            middle: parseFloat(middle.toFixed(2)),
            lower: parseFloat(lower.toFixed(2))
        };
    }

    /**
     * تحليل حجم التداول
     * @param {Array} volumes - مصفوفة من أحجام التداول
     * @param {Number} period - الفترة المستخدمة لحساب المتوسط (عادة 20)
     * @returns {Object} كائن يحتوي على معلومات حول حجم التداول
     */
    static analyzeVolume(volumes, period = 20) {
        if (volumes.length < period) {
            return null;
        }

        // حساب متوسط الحجم
        const avgVolume = this.calculateAverage(volumes.slice(-period));

        // الحجم الحالي
        const currentVolume = volumes[volumes.length - 1];

        // نسبة الحجم الحالي إلى المتوسط
        const volumeRatio = currentVolume / avgVolume;

        return {
            current: currentVolume,
            average: parseFloat(avgVolume.toFixed(2)),
            ratio: parseFloat(volumeRatio.toFixed(2)),
            isAboveAverage: volumeRatio > 1
        };
    }

    /**
     * حساب المتوسط لمجموعة من القيم
     * @param {Array} values - مصفوفة من القيم
     * @returns {Number} المتوسط
     */
    static calculateAverage(values) {
        if (values.length === 0) return 0;
        const sum = values.reduce((total, value) => total + value, 0);
        return sum / values.length;
    }

    /**
     * حساب الانحراف المعياري
     * @param {Array} values - مصفوفة من القيم
     * @param {Number} mean - المتوسط (إذا كان معروفًا مسبقًا)
     * @returns {Number} الانحراف المعياري
     */
    static calculateStandardDeviation(values, mean = null) {
        if (values.length === 0) return 0;

        const avg = mean !== null ? mean : this.calculateAverage(values);
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = this.calculateAverage(squareDiffs);
        return Math.sqrt(avgSquareDiff);
    }
}

// تصدير الفئة للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TechnicalIndicators;
}