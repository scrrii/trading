/**
 * ملف اختبار لوظيفة showNotification
 */

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // تهيئة أحداث الاختبار
    initTestEvents();
    
    // عرض رسالة ترحيبية
    showNotification('مرحبًا بك في اختبار الإشعارات', 'success');
});

/**
 * تهيئة أحداث الاختبار
 */
function initTestEvents() {
    // إضافة مستمع الحدث لزر اختبار الإشعار
    const testButton = document.getElementById('test-notification');
    if (testButton) {
        testButton.addEventListener('click', () => {
            showNotification('هذا إشعار اختبار', 'success');
            console.log('تم النقر على زر اختبار الإشعار');
        });
    }
    
    // إضافة مستمع الحدث لزر اختبار حفظ معرف الجلسة
    const testSessionButton = document.getElementById('test-session');
    if (testSessionButton) {
        testSessionButton.addEventListener('click', () => {
            const sessionId = 'test-session-id-123';
            console.log('محاولة حفظ معرف الجلسة:', sessionId);
            
            try {
                // محاكاة حفظ معرف الجلسة
                localStorage.setItem('pocketOptionSessionId', sessionId);
                
                // عرض إشعار نجاح
                showNotification('تم حفظ معرف الجلسة بنجاح', 'success');
                console.log('تم حفظ معرف الجلسة بنجاح');
            } catch (error) {
                console.error('خطأ في حفظ معرف الجلسة:', error);
                showNotification('حدث خطأ أثناء حفظ معرف الجلسة', 'error');
            }
        });
    }
    
    // إضافة مستمع الحدث لزر اختبار فتح النافذة المنبثقة
    const testModalButton = document.getElementById('test-modal');
    if (testModalButton) {
        testModalButton.addEventListener('click', () => {
            console.log('محاولة فتح النافذة المنبثقة');
            showTestModal();
        });
    }
}

/**
 * عرض إشعار على الشاشة
 * @param {String} message - نص الإشعار
 * @param {String} type - نوع الإشعار (success, error, info)
 */
function showNotification(message, type = 'info') {
    console.log('عرض الإشعار:', message, type);
    
    const notification = document.getElementById('notification');
    if (!notification) {
        console.error('عنصر الإشعار غير موجود في الصفحة');
        return;
    }
    
    const notificationIcon = notification.querySelector('.notification-icon');
    const notificationMessage = notification.querySelector('.notification-message');
    
    if (!notificationIcon || !notificationMessage) {
        console.error('عناصر الإشعار الفرعية غير موجودة');
        return;
    }
    
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
    console.log('تم إضافة فئة show للإشعار');
    
    // إخفاء الإشعار بعد 5 ثوانٍ
    setTimeout(() => {
        notification.classList.remove('show');
        console.log('تم إزالة فئة show من الإشعار');
    }, 5000);
}

/**
 * عرض نافذة اختبار منبثقة
 */
function showTestModal() {
    // إنشاء عناصر النافذة
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'test-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // إضافة العنوان
    const title = document.createElement('h2');
    title.textContent = 'اختبار النافذة المنبثقة';
    modalContent.appendChild(title);
    
    // إضافة الوصف
    const description = document.createElement('p');
    description.textContent = 'هذه نافذة اختبار لمحاكاة نافذة تكوين Pocket Option.';
    modalContent.appendChild(description);
    
    // إضافة حقول الإدخال
    const form = document.createElement('form');
    form.id = 'test-form';
    
    // حقل معرف الجلسة
    const sessionIdGroup = document.createElement('div');
    sessionIdGroup.className = 'form-group';
    const sessionIdLabel = document.createElement('label');
    sessionIdLabel.textContent = 'معرف الجلسة:';
    sessionIdLabel.setAttribute('for', 'test-session-id');
    const sessionIdInput = document.createElement('input');
    sessionIdInput.type = 'text';
    sessionIdInput.id = 'test-session-id';
    sessionIdInput.required = true;
    sessionIdInput.value = 'test-session-id-123';
    sessionIdGroup.appendChild(sessionIdLabel);
    sessionIdGroup.appendChild(sessionIdInput);
    form.appendChild(sessionIdGroup);
    
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
        document.body.removeChild(modal);
    };
    
    actions.appendChild(saveButton);
    actions.appendChild(cancelButton);
    form.appendChild(actions);
    
    // معالجة تقديم النموذج
    form.onsubmit = (e) => {
        e.preventDefault();
        
        const sessionId = document.getElementById('test-session-id').value;
        console.log('تم إرسال النموذج مع معرف الجلسة:', sessionId);
        
        if (sessionId) {
            try {
                // محاكاة حفظ معرف الجلسة
                localStorage.setItem('testSessionId', sessionId);
                
                showNotification('تم حفظ معرف الجلسة بنجاح', 'success');
                console.log('تم حفظ معرف الجلسة بنجاح');
                document.body.removeChild(modal);
            } catch (error) {
                console.error('خطأ في حفظ معرف الجلسة:', error);
                showNotification('حدث خطأ أثناء حفظ معرف الجلسة', 'error');
            }
        } else {
            showNotification('يرجى إدخال معرف الجلسة', 'error');
        }
    };
    
    modalContent.appendChild(form);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    console.log('تم إضافة النافذة المنبثقة إلى الصفحة');
}