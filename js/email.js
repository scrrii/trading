/**
 * نظام إرسال التنبيهات عبر البريد الإلكتروني
 * يستخدم خدمة EmailJS لإرسال رسائل البريد الإلكتروني من جانب العميل
 * يتطلب إنشاء حساب على https://www.emailjs.com
 */

class EmailNotifier {
    constructor() {
        this.serviceId = ''; // معرف الخدمة من EmailJS
        this.templateId = ''; // معرف القالب من EmailJS
        this.userId = ''; // معرف المستخدم العام من EmailJS
        this.recipientEmail = ''; // عنوان البريد الإلكتروني للمستلم
        this.enabled = false;
        this.emailJsLoaded = false;
    }

    /**
     * تهيئة خدمة EmailJS
     * @returns {Promise} - وعد بنتيجة التهيئة
     */
    async init() {
        if (this.emailJsLoaded) {
            return true;
        }

        return new Promise((resolve) => {
            // التحقق مما إذا كان EmailJS موجودًا بالفعل
            if (typeof emailjs !== 'undefined') {
                this.emailJsLoaded = true;
                resolve(true);
                return;
            }

            // تحميل مكتبة EmailJS
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            script.async = true;
            script.onload = () => {
                this.emailJsLoaded = true;
                resolve(true);
            };
            script.onerror = () => {
                console.error('فشل في تحميل مكتبة EmailJS');
                resolve(false);
            };
            document.head.appendChild(script);
        });
    }

    /**
     * تكوين إعدادات خدمة البريد الإلكتروني
     * @param {Object} config - كائن التكوين
     * @param {string} config.serviceId - معرف الخدمة من EmailJS
     * @param {string} config.templateId - معرف القالب من EmailJS
     * @param {string} config.userId - معرف المستخدم العام من EmailJS
     * @param {string} config.recipientEmail - عنوان البريد الإلكتروني للمستلم
     * @returns {boolean} - نجاح التكوين
     */
    configure({ serviceId, templateId, userId, recipientEmail }) {
        this.serviceId = serviceId || '';
        this.templateId = templateId || '';
        this.userId = userId || '';
        this.recipientEmail = recipientEmail || '';
        
        this.enabled = !!(this.serviceId && this.templateId && this.userId && this.recipientEmail);
        
        // حفظ الإعدادات في التخزين المحلي
        if (this.enabled) {
            localStorage.setItem('emailServiceId', this.serviceId);
            localStorage.setItem('emailTemplateId', this.templateId);
            localStorage.setItem('emailUserId', this.userId);
            localStorage.setItem('emailRecipient', this.recipientEmail);
            localStorage.setItem('emailEnabled', 'true');
            return true;
        } else {
            localStorage.removeItem('emailServiceId');
            localStorage.removeItem('emailTemplateId');
            localStorage.removeItem('emailUserId');
            localStorage.removeItem('emailRecipient');
            localStorage.setItem('emailEnabled', 'false');
            return false;
        }
    }

    /**
     * تحميل الإعدادات المحفوظة
     * @returns {boolean} - نجاح تحميل الإعدادات
     */
    loadSavedConfig() {
        const savedServiceId = localStorage.getItem('emailServiceId');
        const savedTemplateId = localStorage.getItem('emailTemplateId');
        const savedUserId = localStorage.getItem('emailUserId');
        const savedRecipient = localStorage.getItem('emailRecipient');
        const savedEnabled = localStorage.getItem('emailEnabled') === 'true';
        
        if (savedServiceId && savedTemplateId && savedUserId && savedRecipient && savedEnabled) {
            this.serviceId = savedServiceId;
            this.templateId = savedTemplateId;
            this.userId = savedUserId;
            this.recipientEmail = savedRecipient;
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
        return this.enabled && this.serviceId && this.templateId && this.userId && this.recipientEmail;
    }

    /**
     * إرسال بريد إلكتروني
     * @param {Object} params - معلمات البريد الإلكتروني
     * @param {string} params.subject - موضوع البريد الإلكتروني
     * @param {string} params.message - نص الرسالة
     * @returns {Promise} - وعد بنتيجة الإرسال
     */
    async sendEmail({ subject, message }) {
        if (!this.isConfigured()) {
            console.warn('لم يتم تكوين إعدادات البريد الإلكتروني بشكل صحيح');
            return false;
        }

        // تأكد من تحميل EmailJS
        if (!this.emailJsLoaded) {
            const initialized = await this.init();
            if (!initialized) {
                return false;
            }
        }

        try {
            // تهيئة EmailJS بمعرف المستخدم
            emailjs.init(this.userId);
            
            // إعداد معلمات البريد الإلكتروني
            const templateParams = {
                to_email: this.recipientEmail,
                subject: subject,
                message: message
            };
            
            // إرسال البريد الإلكتروني
            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                templateParams
            );
            
            return response.status === 200;
        } catch (error) {
            console.error('خطأ في إرسال البريد الإلكتروني:', error);
            return false;
        }
    }

    /**
     * إرسال تنبيه إشارة عبر البريد الإلكتروني
     * @param {Object} signal - كائن الإشارة
     * @returns {Promise} - وعد بنتيجة الإرسال
     */
    async sendSignalAlert(signal) {
        if (!this.isConfigured() || !signal) {
            return false;
        }

        // تنسيق موضوع البريد الإلكتروني
        const signalTypeText = signal.type === 'buy' ? 'شراء' : 'بيع';
        const subject = `إشارة ${signalTypeText} جديدة: ${signal.asset} (${signal.timeframe})`;
        
        // تنسيق نص الرسالة
        const strengthText = {
            'weak': 'ضعيفة',
            'medium': 'متوسطة',
            'strong': 'قوية'
        }[signal.strength] || 'غير معروفة';
        
        let message = `تم اكتشاف إشارة ${signalTypeText} جديدة:\n\n`;
        message += `الأصل: ${signal.asset}\n`;
        message += `الفريم الزمني: ${signal.timeframe}\n`;
        message += `الوقت: ${signal.time}\n`;
        message += `قوة الإشارة: ${strengthText}\n\n`;
        message += `المؤشرات المتوافقة:\n`;
        
        // إضافة المؤشرات المتوافقة
        if (signal.matchedIndicators && signal.matchedIndicators.length > 0) {
            signal.matchedIndicators.forEach(indicator => {
                message += `- ${indicator}\n`;
            });
        }
        
        return await this.sendEmail({ subject, message });
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

        const date = new Date().toLocaleDateString();
        const subject = `تقرير إشارات التداول اليومي - ${date}`;
        
        const totalSignals = signals.length;
        const successfulSignals = signals.filter(s => s.result === 'profit').length;
        const successRate = ((successfulSignals / totalSignals) * 100).toFixed(1);
        
        let message = `تقرير الإشارات اليومي - ${date}\n\n`;
        message += `إجمالي الإشارات: ${totalSignals}\n`;
        message += `الإشارات الناجحة: ${successfulSignals}\n`;
        message += `نسبة النجاح: ${successRate}%\n\n`;
        message += `توزيع الإشارات:\n`;
        message += `شراء: ${signals.filter(s => s.type === 'buy').length}\n`;
        message += `بيع: ${signals.filter(s => s.type === 'sell').length}\n\n`;
        message += `قوة الإشارات:\n`;
        message += `قوية: ${signals.filter(s => s.strength === 'strong').length}\n`;
        message += `متوسطة: ${signals.filter(s => s.strength === 'medium').length}\n`;
        message += `ضعيفة: ${signals.filter(s => s.strength === 'weak').length}\n`;
        
        return await this.sendEmail({ subject, message });
    }
}

// تصدير الفئة للاستخدام في الملفات الأخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EmailNotifier };
} else {
    // للاستخدام في المتصفح
    window.EmailNotifier = EmailNotifier;
}