// src/hooks/useNotifications.js
import { useCollection } from './useFirestore';
import { serverTimestamp } from 'firebase/firestore';

/**
 * Hook مخصص لإدارة نظام الإشعارات بالكامل في المنصة
 */
export const useNotifications = () => {
  const { add: addNotification } = useCollection('notifications');

  /**
   * دالة أساسية لإنشاء إشعار جديد (للاستخدام الداخلي)
   * @param {string} userId - معرف المستخدم الذي سيتلقى الإشعار
   * @param {string} message - نص رسالة الإشعار
   * @param {string} link - الرابط الذي سينتقل إليه المستخدم عند النقر
   * @param {string} type - نوع الإشعار (info, success, warning, error)
   * @param {object} metadata - بيانات إضافية (اختياري)
   */
  const createNotification = async (userId, message, link, type = 'info', metadata = {}) => {
    try {
      if (!userId || !message || !link) {
        console.warn('Notification creation skipped: Missing required parameters.');
        return;
      }
      
      await addNotification({
        userId,
        message,
        link,
        type,
        isRead: false,
        createdAt: serverTimestamp(),
        metadata
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // --- دوال الإشعارات الجاهزة ---

  // إشعار ترحيبي عند التسجيل الجديد
  const sendWelcomeNotification = (userId, userName) => {
    createNotification(
      userId,
      `🎉 أهلاً بك يا ${userName} في Sky School ! نحن سعداء بانضمامك.`,
      '/profile',
      'success'
    );
  };

  // إشعارات الاشتراكات (المناهج)
  const sendSubscriptionStatusNotification = (userId, curriculumTitle, status) => {
    if (status === 'active') {
      createNotification(
        userId,
        `✅ تم تأكيد اشتراكك في منهج "${curriculumTitle}". يمكنك الآن بدء رحلتك التعليمية!`,
        '/my-curricula',
        'success'
      );
    } else if (status === 'rejected') {
      createNotification(
        userId,
        `⚠️ تم رفض طلب اشتراكك في منهج "${curriculumTitle}". يرجى مراجعة الإدارة.`,
        '/my-curricula',
        'error'
      );
    }
  };

  // إشعارات المدفوعات (الكورسات)
  const sendPaymentStatusNotification = (userId, courseName, status) => {
    if (status === 'confirmed') {
      createNotification(
        userId,
        `✅ تم تأكيد دفعك لكورس "${courseName}". يمكنك الآن الوصول لمحتوى الكورس.`,
        '/my-courses',
        'success'
      );
    } else if (status === 'rejected') {
      createNotification(
        userId,
        `⚠️ تم رفض طلب الدفع الخاص بكورس "${courseName}". يرجى التواصل مع الإدارة.`,
        '/my-courses',
        'error'
      );
    }
  };

  // إشعار للطالب عند إضافته لمجموعة
  const sendAddedToGroupNotification = (studentId, groupName, curriculumOrCourseName, link) => {
    createNotification(
      studentId,
      `👍 تم إضافتك إلى مجموعة "${groupName}" الخاصة بـ "${curriculumOrCourseName}".`,
      link,
      'info'
    );
  };
  
  // إشعار للمدرب عند تعيينه لمجموعة
  const sendAssignedToGroupNotification = (trainerId, groupName, curriculumOrCourseName, link) => {
    createNotification(
      trainerId,
      `👨‍🏫 تم تعيينك كمدرب لمجموعة "${groupName}" في "${curriculumOrCourseName}".`,
      link,
      'info'
    );
  };

  // إشعار للمدير عند وجود طلبات جديدة تحتاج مراجعة
  const sendAdminPendingReviewNotification = (adminId, count, type) => {
    const message = type === 'subscription' 
      ? `🔔 لديك ${count} طلب اشتراك جديد في انتظار المراجعة.`
      : `🔔 لديك ${count} طلب دفع جديد في انتظار المراجعة.`;
    const link = type === 'subscription' ? '/admin/subscriptions' : '/admin/payments';
    
    createNotification(adminId, message, link, 'warning');
  };


  return { 
    createNotification,
    sendWelcomeNotification,
    sendSubscriptionStatusNotification,
    sendPaymentStatusNotification,
    sendAddedToGroupNotification,
    sendAssignedToGroupNotification,
    sendAdminPendingReviewNotification
  };
};