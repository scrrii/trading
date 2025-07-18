/**
 * نظام إرسال التنبيهات عبر Telegram
 * يتطلب إعداد بوت Telegram وتكوين معرف القناة أو الدردشة
 */

class TelegramNotifier {
    constructor() {
        this.botToken = ''; // يجب تعبئة رمز البوت الخاص بك هنا
        this.chatId = ''; // معرف الدردشة أو القناة
        this.enabled = false;
        this.baseUrl = 'https://api.telegram.org/bot';
    }

    /**
     * تكوين إعدادات بوت Telegram
     * @param {string} botToken - رمز البوت الخاص بك
     * @param {string} chatId - معرف الدردشة أو القناة
     */
    configure(botToken, chatId) {
        this.botToken = botToken;
        this.chatId = chatId;
        this.enabled = (botToken && chatId) ? true : false;
        
        // حفظ الإعدادات في التخزين المحلي
        if (this.enabled) {
            localStorage.setItem('telegramBotToken', botToken);
            localStorage.setItem('telegramChatId', chatId);
            localStorage.setItem('telegramEnabled', 'true');
            return true;
        } else {
            localStorage.removeItem('telegramBotToken');
            localStorage.removeItem('telegramChatId');
            localStorage.setItem('telegramEnabled', 'false');
            return false;
        }
    }

    /**
     * تحميل الإعدادات المحفوظة
     */
    loadSavedConfig() {
        const savedToken = localStorage.getItem('telegramBotToken');
        const savedChatId = localStorage.getItem('telegramChatId');
        const savedEnabled = localStorage.getItem('telegramEnabled') === 'true';
        
        if (savedToken && savedChatId && savedEnabled) {
            this.botToken = savedToken;
            this.chatId = savedChatId;
            this.enabled = true;
            return true;
        }
        
        return false;
    }

    /**
     * التحقق من حالة التكوين
     * @returns {boolean} - ما إذا كان التكوين صالحًا
     */
    isConfigured() {
        return this.enabled && this.botToken && this.chatId;
    }

    /**
     * إرسال رسالة إلى Telegram
     * @param {string} message - نص الرسالة المراد إرسالها
     * @returns {Promise} - وعد بنتيجة الإرسال
     */
    async sendMessage(message) {
        if (!this.isConfigured()) {
            console.warn('لم يتم تكوين إعدادات Telegram بشكل صحيح');
            return false;
        }

        try {
            const url = `${this.baseUrl}${this.botToken}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            const data = await response.json();
            return data.ok;
        } catch (error) {
            console.error('خطأ في إرسال رسالة Telegram:', error);
            return false;
        }
    }

    /**
     * إرسال تنبيه إشارة إلى Telegram
     * @param {Object} signal - كائن الإشارة
     * @returns {Promise} - وعد بنتيجة الإرسال
     */
    async sendSignalAlert(signal) {
        if (!this.isConfigured() || !signal) {
            return false;
        }

        // تنسيق رسالة الإشارة
        const strengthEmoji = {
            'weak': '🔴',
            'medium': '🟡',
            'strong': '🟢'
        }[signal.strength] || '⚪';
        
        const signalTypeEmoji = signal.type === 'buy' ? '🔼 شراء' : '🔽 بيع';
        
        let message = `<b>${signalTypeEmoji} إشارة جديدة</b>\n\n`;
        message += `<b>الأصل:</b> ${signal.asset}\n`;
        message += `<b>الفريم الزمني:</b> ${signal.timeframe}\n`;
        message += `<b>الوقت:</b> ${signal.time}\n`;
        message += `<b>قوة الإشارة:</b> ${strengthEmoji} ${signal.strength}\n\n`;
        message += `<b>المؤشرات المتوافقة:</b>\n`;
        
        // إضافة المؤشرات المتوافقة
        if (signal.matchedIndicators && signal.matchedIndicators.length > 0) {
            signal.matchedIndicators.forEach(indicator => {
                message += `✅ ${indicator}\n`;
            });
        }
        
        return await this.sendMessage(message);
    }

    /**
     * إرسال تقرير أداء يومي
     * @param {Array} signals - مصفوفة من إشارات اليوم
     * @returns {Promise} - وعد بنتيجة الإرسال
     */
    async sendDailyReport(signals) {
        if (!this.isConfigured() || !signals || signals.length === 0) {
            return false;
        }

        const totalSignals = signals.length;
        const successfulSignals = signals.filter(s => s.result === 'profit').length;
        const successRate = ((successfulSignals / totalSignals) * 100).toFixed(1);
        
        let message = `<b>📊 تقرير الإشارات اليومي</b>\n\n`;
        message += `<b>إجمالي الإشارات:</b> ${totalSignals}\n`;
        message += `<b>الإشارات الناجحة:</b> ${successfulSignals}\n`;
        message += `<b>نسبة النجاح:</b> ${successRate}%\n\n`;
        message += `<b>توزيع الإشارات:</b>\n`;
        message += `🔼 شراء: ${signals.filter(s => s.type === 'buy').length}\n`;
        message += `🔽 بيع: ${signals.filter(s => s.type === 'sell').length}\n\n`;
        message += `<b>قوة الإشارات:</b>\n`;
        message += `🟢 قوية: ${signals.filter(s => s.strength === 'strong').length}\n`;
        message += `🟡 متوسطة: ${signals.filter(s => s.strength === 'medium').length}\n`;
        message += `🔴 ضعيفة: ${signals.filter(s => s.strength === 'weak').length}\n`;
        
        return await this.sendMessage(message);
    }
}

// تصدير الفئة للاستخدام في الملفات الأخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TelegramNotifier };
} else {
    // للاستخدام في المتصفح
    window.TelegramNotifier = TelegramNotifier;
}