/**
 * التطبيق الرئيسي لنظام الإشارات الذكية
 * هذا الملف يربط بين واجهة المستخدم ومحرك الإشارات
 */

// تهيئة المتغيرات العامة
let signalEngine;
let analysisInterval;
let isAnalyzing = false;
let mockDataGenerator;
let telegramNotifier;
let emailNotifier;

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // تهيئة محرك الإشارات
    signalEngine = new SignalEngine();
    
    // تهيئة مولد البيانات الوهمية (للعرض التوضيحي فقط)
    mockDataGenerator = new MockDataGenerator();
    
    // تهيئة خدمات التنبيه
    initNotificationServices();
    
    // تهيئة أحداث واجهة المستخدم
    initUIEvents();
    
    // تحديث حالة الواجهة
    updateUIState();
    
    // عرض رسالة ترحيبية
    showNotification('مرحبًا بك في نظام الإشارات الذكية', 'success');
});

/**
 * تهيئة خدمات التنبيه
 */
function initNotificationServices() {
    // تهيئة خدمة Telegram
    telegramNotifier = new TelegramNotifier();
    telegramNotifier.loadSavedConfig();
    
    // تهيئة خدمة البريد الإلكتروني
    emailNotifier = new EmailNotifier();
    emailNotifier.loadSavedConfig();
    
    // إضافة أزرار تكوين خدمات التنبيه إلى واجهة المستخدم
    document.getElementById('email-alert').addEventListener('change', function() {
        if (this.checked && !emailNotifier.isConfigured()) {
            showEmailConfigModal();
        }
    });
    
    document.getElementById('telegram-alert').addEventListener('change', function() {
        if (this.checked && !telegramNotifier.isConfigured()) {
            showTelegramConfigModal();
        }
    });
}

/**
 * تهيئة أحداث واجهة المستخدم
 */
function initUIEvents() {
    // زر بدء التحليل
    document.getElementById('start-analysis').addEventListener('click', startAnalysis);
    
    // زر إيقاف التحليل
    document.getElementById('stop-analysis').addEventListener('click', stopAnalysis);
    
    // زر مسح السجل
    document.getElementById('clear-log').addEventListener('click', clearSignalLog);
    
    // زر تصدير السجل
    document.getElementById('export-log').addEventListener('click', exportSignalLog);
    
    // تحديث الإعدادات عند تغييرها
    document.querySelectorAll('.setting-group select, .setting-group input').forEach(element => {
        element.addEventListener('change', updateSettings);
    });
}

/**
 * بدء عملية التحليل
 */
function startAnalysis() {
    if (isAnalyzing) return;
    
    // تحديث الإعدادات قبل البدء
    updateSettings();
    
    // تحديث حالة التحليل
    isAnalyzing = true;
    updateUIState();
    
    // تحديث مؤشر الحالة
    const statusIndicator = document.getElementById('status-indicator');
    statusIndicator.className = 'status-indicator analyzing';
    statusIndicator.querySelector('.status-text').textContent = 'جاري التحليل...';
    
    // عرض إشعار
    showNotification('تم بدء التحليل', 'success');
    
    // بدء التحليل الدوري
    startPeriodicAnalysis();
}

/**
 * إيقاف عملية التحليل
 */
function stopAnalysis() {
    if (!isAnalyzing) return;
    
    // إيقاف التحليل الدوري
    clearInterval(analysisInterval);
    
    // تحديث حالة التحليل
    isAnalyzing = false;
    updateUIState();
    
    // تحديث مؤشر الحالة
    const statusIndicator = document.getElementById('status-indicator');
    statusIndicator.className = 'status-indicator inactive';
    statusIndicator.querySelector('.status-text').textContent = 'غير نشط';
    
    // عرض إشعار
    showNotification('تم إيقاف التحليل', 'info');
}

/**
 * بدء التحليل الدوري
 */
function startPeriodicAnalysis() {
    // تحديد الفاصل الزمني بناءً على الإطار الزمني المحدد
    const timeframeInMs = getTimeframeInMilliseconds();
    
    // تنفيذ التحليل الأول فورًا
    performAnalysis();
    
    // إعداد التحليل الدوري
    analysisInterval = setInterval(performAnalysis, timeframeInMs);
}

/**
 * تنفيذ عملية التحليل
 */
function performAnalysis() {
    // الحصول على بيانات السوق (في هذا المثال، نستخدم بيانات وهمية)
    const marketData = mockDataGenerator.generateMarketData();
    
    // تحديث السعر الحالي للعرض
    window.currentPrice = marketData.prices[marketData.prices.length - 1];
    
    // تحليل البيانات وتوليد إشارة إذا تم استيفاء الشروط
    const signal = signalEngine.analyzeMarket(marketData);
    
    // إذا تم توليد إشارة، قم بعرضها وتسجيلها
    if (signal) {
        displaySignal(signal);
        logSignal(signal);
        triggerAlerts(signal);
    }
}

/**
 * عرض الإشارة في واجهة المستخدم
 * @param {Object} signal - كائن الإشارة
 */
function displaySignal(signal) {
    const signalContainer = document.getElementById('signal-container');
    const signalAsset = document.getElementById('signal-asset');
    const signalTime = document.getElementById('signal-time');
    const signalType = document.getElementById('signal-type');
    const strengthIndicator = document.getElementById('strength-indicator');
    const matchedIndicators = document.getElementById('matched-indicators');
    
    // إزالة فئة empty
    signalContainer.classList.remove('empty');
    
    // إضافة فئة نوع الإشارة
    signalContainer.className = 'signal-container ' + signal.type;
    
    // تعيين الأصل والوقت
    signalAsset.textContent = signal.asset;
    signalTime.textContent = formatTimestamp(signal.timestamp);
    
    // تعيين نوع الإشارة
    signalType.className = 'signal-type ' + signal.type;
    signalType.innerHTML = signal.type === 'buy' ? 
        '<i class="fas fa-arrow-up"></i> شراء' : 
        '<i class="fas fa-arrow-down"></i> بيع';
    
    // تعيين قوة الإشارة
    strengthIndicator.className = 'strength-indicator ' + signal.strength;
    
    // عرض المؤشرات المتوافقة
    matchedIndicators.innerHTML = '';
    signal.conditions.forEach(condition => {
        const li = document.createElement('li');
        li.textContent = condition.description;
        matchedIndicators.appendChild(li);
    });
    
    // تحديث مؤشر الحالة
    const statusIndicator = document.getElementById('status-indicator');
    statusIndicator.className = 'status-indicator active';
    statusIndicator.querySelector('.status-text').textContent = 'تم العثور على إشارة!';
}

/**
 * تسجيل الإشارة في جدول السجل
 * @param {Object} signal - كائن الإشارة
 */
function logSignal(signal) {
    const logBody = document.getElementById('signal-log-body');
    
    // إنشاء صف جديد
    const row = document.createElement('tr');
    
    // إضافة خلايا البيانات
    row.innerHTML = `
        <td>${formatTimestamp(signal.timestamp)}</td>
        <td>${signal.asset}</td>
        <td>${signal.timeframe}</td>
        <td class="${signal.type}">${signal.type === 'buy' ? 'شراء' : 'بيع'}</td>
        <td>${getStrengthText(signal.strength)}</td>
        <td class="result-pending">قيد الانتظار</td>
    `;
    
    // إضافة معرف الإشارة كسمة
    row.setAttribute('data-signal-id', signal.id);
    
    // إضافة الصف إلى الجدول
    logBody.prepend(row);
    
    // جدولة تحديث النتيجة بعد فترة
    setTimeout(() => updateSignalResult(signal.id), 60000); // بعد دقيقة واحدة
}

/**
 * تحديث نتيجة الإشارة في السجل
 * @param {String} signalId - معرف الإشارة
 */
function updateSignalResult(signalId) {
    // الحصول على الصف المقابل للإشارة
    const row = document.querySelector(`tr[data-signal-id="${signalId}"]`);
    if (!row) return;
    
    // محاكاة نتيجة عشوائية (للعرض التوضيحي فقط)
    const isProfit = Math.random() > 0.4; // 60% فرصة للربح
    const result = isProfit ? 'ربح' : 'خسارة';
    const resultClass = isProfit ? 'result-profit' : 'result-loss';
    
    // تحديث خلية النتيجة
    const resultCell = row.querySelector('td:last-child');
    resultCell.textContent = result;
    resultCell.className = resultClass;
    
    // تحديث نتيجة الإشارة في المحرك
    signalEngine.updateSignalResult(signalId, result, isProfit ? 1 : -1);
}

/**
 * تشغيل التنبيهات المناسبة للإشارة
 * @param {Object} signal - كائن الإشارة
 */
function triggerAlerts(signal) {
    const settings = signalEngine.settings;
    
    // تنبيه صوتي
    if (settings.alerts.sound) {
        playAlertSound();
    }
    
    // إشعار على الشاشة
    if (settings.alerts.notification) {
        const message = `${signal.type === 'buy' ? 'إشارة شراء' : 'إشارة بيع'} ${getStrengthText(signal.strength)} على ${signal.asset}`;
        showNotification(message, 'success');
    }
    
    // إعداد كائن الإشارة للتنبيهات الخارجية
    const alertSignal = {
        asset: signal.asset,
        timeframe: signalEngine.settings.timeframe,
        time: formatTimestamp(signal.timestamp),
        type: signal.type,
        strength: signal.strength,
        matchedIndicators: signal.conditions.map(c => c.description)
    };
    
    // بريد إلكتروني
    if (settings.alerts.email && emailNotifier && emailNotifier.isConfigured()) {
        emailNotifier.sendSignalAlert(alertSignal)
            .then(success => {
                if (!success) {
                    console.warn('فشل في إرسال تنبيه البريد الإلكتروني');
                }
            })
            .catch(error => {
                console.error('خطأ في إرسال تنبيه البريد الإلكتروني:', error);
            });
    } else if (settings.alerts.email) {
        showNotification('لم يتم تكوين خدمة البريد الإلكتروني بشكل صحيح', 'error');
    }
    
    // تيليجرام
    if (settings.alerts.telegram && telegramNotifier && telegramNotifier.isConfigured()) {
        telegramNotifier.sendSignalAlert(alertSignal)
            .then(success => {
                if (!success) {
                    console.warn('فشل في إرسال تنبيه Telegram');
                }
            })
            .catch(error => {
                console.error('خطأ في إرسال تنبيه Telegram:', error);
            });
    } else if (settings.alerts.telegram) {
        showNotification('لم يتم تكوين خدمة Telegram بشكل صحيح', 'error');
    }
}

/**
 * تشغيل صوت التنبيه
 */
function playAlertSound() {
    const alertSound = document.getElementById('alert-sound');
    alertSound.currentTime = 0;
    alertSound.play().catch(error => {
        console.warn('فشل تشغيل الصوت:', error);
    });
}

/**
 * عرض إشعار على الشاشة
 * @param {String} message - نص الإشعار
 * @param {String} type - نوع الإشعار (success, error, info)
 */
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationIcon = notification.querySelector('.notification-icon');
    const notificationMessage = notification.querySelector('.notification-message');
    
    // تعيين نوع الإشعار
    notification.className = 'notification ' + type;
    
    // تعيين الأيقونة المناسبة
    let iconClass = 'fas ';
    switch (type) {
        case 'success':
            iconClass += 'fa-check-circle';
            break;
        case 'error':
            iconClass += 'fa-exclamation-circle';
            break;
        default:
            iconClass += 'fa-info-circle';
    }
    notificationIcon.className = iconClass;
    
    // تعيين الرسالة
    notificationMessage.textContent = message;
    
    // عرض الإشعار
    notification.classList.add('show');
    
    // إخفاء الإشعار بعد 5 ثوانٍ
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

/**
 * تحديث إعدادات محرك الإشارات من واجهة المستخدم
 */
function updateSettings() {
    const settings = {
        timeframe: document.getElementById('timeframe').value,
        asset: document.getElementById('asset').value,
        candles: parseInt(document.getElementById('candles').value),
        signalTiming: document.getElementById('signal-timing').value,
        minStrength: document.getElementById('min-strength').value,
        activeIndicators: {
            rsi: document.getElementById('rsi').checked,
            ema: document.getElementById('ema').checked,
            bollinger: document.getElementById('bollinger').checked,
            macd: document.getElementById('macd').checked,
            volume: document.getElementById('volume').checked
        },
        alerts: {
            sound: document.getElementById('sound-alert').checked,
            notification: document.getElementById('notification-alert').checked,
            email: document.getElementById('email-alert').checked,
            telegram: document.getElementById('telegram-alert').checked
        }
    };
    
    // تحديث إعدادات المحرك
    signalEngine.updateSettings(settings);
    
    // إذا كان التحليل جاريًا، أعد تشغيله بالإعدادات الجديدة
    if (isAnalyzing) {
        clearInterval(analysisInterval);
        startPeriodicAnalysis();
    }
}

/**
 * مسح سجل الإشارات
 */
function clearSignalLog() {
    // مسح جدول السجل
    document.getElementById('signal-log-body').innerHTML = '';
    
    // مسح الإشارات من المحرك
    signalEngine.clearSignals();
    
    // عرض إشعار
    showNotification('تم مسح سجل الإشارات', 'info');
}

/**
 * تصدير سجل الإشارات بتنسيق CSV
 */
function exportSignalLog() {
    const signals = signalEngine.getAllSignals();
    
    if (signals.length === 0) {
        showNotification('لا توجد إشارات للتصدير', 'error');
        return;
    }
    
    // إنشاء محتوى CSV
    let csvContent = 'الوقت,الأصل,الفريم,النوع,القوة,النتيجة\n';
    
    signals.forEach(signal => {
        const row = [
            formatTimestamp(signal.timestamp),
            signal.asset,
            signal.timeframe,
            signal.type === 'buy' ? 'شراء' : 'بيع',
            getStrengthText(signal.strength),
            signal.result || 'قيد الانتظار'
        ];
        
        csvContent += row.join(',') + '\n';
    });
    
    // إنشاء رابط التنزيل
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `signal_log_${formatDateForFilename(new Date())}.csv`);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // عرض إشعار
    showNotification('تم تصدير سجل الإشارات بنجاح', 'success');
}

/**
 * تحديث حالة واجهة المستخدم بناءً على حالة التحليل
 */
function updateUIState() {
    const startButton = document.getElementById('start-analysis');
    const stopButton = document.getElementById('stop-analysis');
    
    if (isAnalyzing) {
        startButton.disabled = true;
        stopButton.disabled = false;
    } else {
        startButton.disabled = false;
        stopButton.disabled = true;
    }
}

/**
 * الحصول على الفاصل الزمني بالمللي ثانية بناءً على الإطار الزمني المحدد
 * @returns {Number} الفاصل الزمني بالمللي ثانية
 */
function getTimeframeInMilliseconds() {
    const timeframe = document.getElementById('timeframe').value;
    
    switch (timeframe) {
        case '15s': return 15 * 1000;
        case '30s': return 30 * 1000;
        case '1m': return 60 * 1000;
        case '2m': return 2 * 60 * 1000;
        case '5m': return 5 * 60 * 1000;
        case '15m': return 15 * 60 * 1000;
        case '30m': return 30 * 60 * 1000;
        case '1h': return 60 * 60 * 1000;
        case '4h': return 4 * 60 * 60 * 1000;
        default: return 60 * 1000; // افتراضي: 1 دقيقة
    }
}

/**
 * تنسيق الطابع الزمني إلى تنسيق قابل للقراءة
 * @param {Number} timestamp - الطابع الزمني
 * @returns {String} التاريخ والوقت المنسقين
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * تنسيق التاريخ لاستخدامه في اسم الملف
 * @param {Date} date - كائن التاريخ
 * @returns {String} التاريخ المنسق
 */
function formatDateForFilename(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}`;
}

/**
 * الحصول على النص المقابل لقوة الإشارة
 * @param {String} strength - قوة الإشارة (weak, medium, strong)
 * @returns {String} النص المقابل بالعربية
 */
function getStrengthText(strength) {
    switch (strength) {
        case 'weak': return 'ضعيفة';
        case 'medium': return 'متوسطة';
        case 'strong': return 'قوية';
        default: return strength;
    }
}

/**
 * فئة لتوليد بيانات السوق الوهمية للعرض التوضيحي
 */
class MockDataGenerator {
    constructor() {
        this.basePrice = 1.1000; // سعر أساسي
        this.volatility = 0.0005; // تقلب السعر
        this.trend = 0; // اتجاه السعر (0: محايد، 1: صاعد، -1: هابط)
        this.trendDuration = 0; // مدة الاتجاه الحالي
        this.maxTrendDuration = 20; // الحد الأقصى لمدة الاتجاه
        
        // تغيير الاتجاه بشكل عشوائي كل فترة
        setInterval(() => this.changeTrend(), 10000);
    }
    
    /**
     * توليد بيانات السوق
     * @returns {Object} بيانات السوق
     */
    generateMarketData() {
        // توليد أسعار وأحجام وهمية
        const candles = parseInt(document.getElementById('candles').value) || 5;
        const prices = [];
        const volumes = [];
        
        // توليد بيانات للشمعات السابقة
        for (let i = 0; i < candles; i++) {
            prices.push(this.generatePrice());
            volumes.push(this.generateVolume());
        }
        
        return {
            prices,
            volumes,
            timestamp: Date.now(),
            asset: document.getElementById('asset').value
        };
    }
    
    /**
     * توليد سعر وهمي
     * @returns {Number} السعر
     */
    generatePrice() {
        // زيادة مدة الاتجاه الحالي
        this.trendDuration++;
        
        // تغيير الاتجاه إذا تجاوزت المدة الحد الأقصى
        if (this.trendDuration >= this.maxTrendDuration) {
            this.changeTrend();
        }
        
        // توليد تغير عشوائي في السعر
        const randomChange = (Math.random() - 0.5) * this.volatility;
        const trendChange = this.trend * (this.volatility / 2);
        const totalChange = randomChange + trendChange;
        
        // تحديث السعر الأساسي
        this.basePrice += totalChange;
        
        // تقريب السعر إلى 5 منازل عشرية
        return parseFloat(this.basePrice.toFixed(5));
    }
    
    /**
     * توليد حجم تداول وهمي
     * @returns {Number} حجم التداول
     */
    generateVolume() {
        // توليد حجم أساسي بين 10 و 100
        const baseVolume = 10 + Math.random() * 90;
        
        // زيادة الحجم في حالة وجود اتجاه قوي
        const trendMultiplier = 1 + (Math.abs(this.trend) * Math.random());
        
        return Math.floor(baseVolume * trendMultiplier);
    }
    
    /**
     * تغيير اتجاه السعر بشكل عشوائي
     */
    changeTrend() {
        // اختيار اتجاه عشوائي (-1، 0، 1)
        this.trend = Math.floor(Math.random() * 3) - 1;
        this.trendDuration = 0;
        this.maxTrendDuration = 10 + Math.floor(Math.random() * 20); // بين 10 و 30
    }
}

/**
 * عرض نافذة تكوين خدمة البريد الإلكتروني
 */
function showEmailConfigModal() {
    // إنشاء عناصر النافذة
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'email-config-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // إضافة العنوان
    const title = document.createElement('h2');
    title.textContent = 'تكوين خدمة البريد الإلكتروني';
    modalContent.appendChild(title);
    
    // إضافة الوصف
    const description = document.createElement('p');
    description.textContent = 'يرجى إدخال معلومات خدمة EmailJS لإرسال التنبيهات عبر البريد الإلكتروني.';
    modalContent.appendChild(description);
    
    // إضافة حقول الإدخال
    const form = document.createElement('form');
    form.id = 'email-config-form';
    
    // حقل معرف الخدمة
    const serviceIdGroup = document.createElement('div');
    serviceIdGroup.className = 'form-group';
    const serviceIdLabel = document.createElement('label');
    serviceIdLabel.textContent = 'معرف الخدمة:';
    serviceIdLabel.setAttribute('for', 'email-service-id');
    const serviceIdInput = document.createElement('input');
    serviceIdInput.type = 'text';
    serviceIdInput.id = 'email-service-id';
    serviceIdInput.required = true;
    serviceIdInput.value = emailNotifier.serviceId || '';
    serviceIdGroup.appendChild(serviceIdLabel);
    serviceIdGroup.appendChild(serviceIdInput);
    form.appendChild(serviceIdGroup);
    
    // حقل معرف القالب
    const templateIdGroup = document.createElement('div');
    templateIdGroup.className = 'form-group';
    const templateIdLabel = document.createElement('label');
    templateIdLabel.textContent = 'معرف القالب:';
    templateIdLabel.setAttribute('for', 'email-template-id');
    const templateIdInput = document.createElement('input');
    templateIdInput.type = 'text';
    templateIdInput.id = 'email-template-id';
    templateIdInput.required = true;
    templateIdInput.value = emailNotifier.templateId || '';
    templateIdGroup.appendChild(templateIdLabel);
    templateIdGroup.appendChild(templateIdInput);
    form.appendChild(templateIdGroup);
    
    // حقل معرف المستخدم
    const userIdGroup = document.createElement('div');
    userIdGroup.className = 'form-group';
    const userIdLabel = document.createElement('label');
    userIdLabel.textContent = 'معرف المستخدم:';
    userIdLabel.setAttribute('for', 'email-user-id');
    const userIdInput = document.createElement('input');
    userIdInput.type = 'text';
    userIdInput.id = 'email-user-id';
    userIdInput.required = true;
    userIdInput.value = emailNotifier.userId || '';
    userIdGroup.appendChild(userIdLabel);
    userIdGroup.appendChild(userIdInput);
    form.appendChild(userIdGroup);
    
    // حقل البريد الإلكتروني للمستلم
    const recipientGroup = document.createElement('div');
    recipientGroup.className = 'form-group';
    const recipientLabel = document.createElement('label');
    recipientLabel.textContent = 'البريد الإلكتروني للمستلم:';
    recipientLabel.setAttribute('for', 'email-recipient');
    const recipientInput = document.createElement('input');
    recipientInput.type = 'email';
    recipientInput.id = 'email-recipient';
    recipientInput.required = true;
    recipientInput.value = emailNotifier.recipientEmail || '';
    recipientGroup.appendChild(recipientLabel);
    recipientGroup.appendChild(recipientInput);
    form.appendChild(recipientGroup);
    
    // أزرار الإجراءات
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    
    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.className = 'btn btn-primary';
    saveButton.textContent = 'حفظ';
    
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = 'إلغاء';
    cancelButton.onclick = () => {
        document.getElementById('email-alert').checked = emailNotifier.isConfigured();
        document.body.removeChild(modal);
    };
    
    actions.appendChild(saveButton);
    actions.appendChild(cancelButton);
    form.appendChild(actions);
    
    // معالجة تقديم النموذج
    form.onsubmit = (e) => {
        e.preventDefault();
        
        const config = {
            serviceId: document.getElementById('email-service-id').value,
            templateId: document.getElementById('email-template-id').value,
            userId: document.getElementById('email-user-id').value,
            recipientEmail: document.getElementById('email-recipient').value
        };
        
        const success = emailNotifier.configure(config);
        
        if (success) {
            showNotification('تم تكوين خدمة البريد الإلكتروني بنجاح', 'success');
            document.body.removeChild(modal);
        } else {
            showNotification('فشل في تكوين خدمة البريد الإلكتروني', 'error');
            document.getElementById('email-alert').checked = false;
        }
    };
    
    modalContent.appendChild(form);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

/**
 * عرض نافذة تكوين خدمة Telegram
 */
function showTelegramConfigModal() {
    // إنشاء عناصر النافذة
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'telegram-config-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // إضافة العنوان
    const title = document.createElement('h2');
    title.textContent = 'تكوين خدمة Telegram';
    modalContent.appendChild(title);
    
    // إضافة الوصف
    const description = document.createElement('p');
    description.textContent = 'يرجى إدخال معلومات بوت Telegram لإرسال التنبيهات.';
    modalContent.appendChild(description);
    
    // إضافة حقول الإدخال
    const form = document.createElement('form');
    form.id = 'telegram-config-form';
    
    // حقل رمز البوت
    const botTokenGroup = document.createElement('div');
    botTokenGroup.className = 'form-group';
    const botTokenLabel = document.createElement('label');
    botTokenLabel.textContent = 'رمز البوت:';
    botTokenLabel.setAttribute('for', 'telegram-bot-token');
    const botTokenInput = document.createElement('input');
    botTokenInput.type = 'text';
    botTokenInput.id = 'telegram-bot-token';
    botTokenInput.required = true;
    botTokenInput.value = telegramNotifier.botToken || '';
    botTokenGroup.appendChild(botTokenLabel);
    botTokenGroup.appendChild(botTokenInput);
    form.appendChild(botTokenGroup);
    
    // حقل معرف الدردشة
    const chatIdGroup = document.createElement('div');
    chatIdGroup.className = 'form-group';
    const chatIdLabel = document.createElement('label');
    chatIdLabel.textContent = 'معرف الدردشة أو القناة:';
    chatIdLabel.setAttribute('for', 'telegram-chat-id');
    const chatIdInput = document.createElement('input');
    chatIdInput.type = 'text';
    chatIdInput.id = 'telegram-chat-id';
    chatIdInput.required = true;
    chatIdInput.value = telegramNotifier.chatId || '';
    chatIdGroup.appendChild(chatIdLabel);
    chatIdGroup.appendChild(chatIdInput);
    form.appendChild(chatIdGroup);
    
    // أزرار الإجراءات
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    
    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.className = 'btn btn-primary';
    saveButton.textContent = 'حفظ';
    
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = 'إلغاء';
    cancelButton.onclick = () => {
        document.getElementById('telegram-alert').checked = telegramNotifier.isConfigured();
        document.body.removeChild(modal);
    };
    
    actions.appendChild(saveButton);
    actions.appendChild(cancelButton);
    form.appendChild(actions);
    
    // معالجة تقديم النموذج
    form.onsubmit = (e) => {
        e.preventDefault();
        
        const botToken = document.getElementById('telegram-bot-token').value;
        const chatId = document.getElementById('telegram-chat-id').value;
        
        const success = telegramNotifier.configure(botToken, chatId);
        
        if (success) {
            showNotification('تم تكوين خدمة Telegram بنجاح', 'success');
            document.body.removeChild(modal);
        } else {
            showNotification('فشل في تكوين خدمة Telegram', 'error');
            document.getElementById('telegram-alert').checked = false;
        }
    };
    
    modalContent.appendChild(form);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}