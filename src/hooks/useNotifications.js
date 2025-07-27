// src/hooks/useNotifications.js
import { useCollection } from './useFirestore';

export const useNotifications = () => {
  const { add: addNotification } = useCollection('notifications');

  // إشعار إضافة رصيد أيام - جديد
  const sendCreditAddedNotification = async (studentId, addedDays, curriculumTitle, newCredit) => {
    try {
      await addNotification({
        userId: studentId,
        type: 'credit_added',
        title: 'تم إضافة رصيد أيام جديد 💰',
        message: `تم إضافة ${addedDays} يوماً لرصيدك في منهج "${curriculumTitle}". رصيدك الجديد: ${newCredit} يوم`,
        data: {
          addedDays,
          curriculumTitle,
          newCredit,
          action: 'credit_added'
        },
        isRead: false,
        createdAt: new Date(),
        priority: 'high'
      });
    } catch (error) {
      console.error('Error sending credit added notification:', error);
    }
  };

  // إشعار انتهاء رصيد الأيام - جديد
  const sendCreditLowNotification = async (studentId, remainingDays, curriculumTitle) => {
    try {
      const priorityLevel = remainingDays <= 3 ? 'urgent' : remainingDays <= 7 ? 'high' : 'medium';
      const title = remainingDays <= 3 ? 'تحذير: رصيد الأيام ينتهي قريباً! ⚠️' : 'تنبيه: رصيدك منخفض 📉';
      
      await addNotification({
        userId: studentId,
        type: 'credit_low',
        title,
        message: `رصيدك في منهج "${curriculumTitle}" أصبح ${remainingDays} ${remainingDays === 1 ? 'يوم' : 'أيام'} فقط. يرجى التواصل مع الإدارة لإضافة المزيد.`,
        data: {
          remainingDays,
          curriculumTitle,
          action: 'credit_low'
        },
        isRead: false,
        createdAt: new Date(),
        priority: priorityLevel
      });
    } catch (error) {
      console.error('Error sending credit low notification:', error);
    }
  };

  // إشعار انتهاء رصيد الأيام تماماً - جديد
  const sendCreditExpiredNotification = async (studentId, curriculumTitle) => {
    try {
      await addNotification({
        userId: studentId,
        type: 'credit_expired',
        title: 'انتهى رصيد الأيام! 🚫',
        message: `انتهى رصيدك في منهج "${curriculumTitle}". لا يمكنك الوصول للمحتوى حالياً. يرجى التواصل مع الإدارة لإضافة رصيد جديد.`,
        data: {
          curriculumTitle,
          action: 'credit_expired'
        },
        isRead: false,
        createdAt: new Date(),
        priority: 'urgent'
      });
    } catch (error) {
      console.error('Error sending credit expired notification:', error);
    }
  };

  // إشعار ترقية المرحلة مع خصم الرصيد - محدث
  const sendLevelPromotionNotification = async (studentId, fromLevel, toLevel, curriculumTitle, creditsDeducted, remainingCredit) => {
    try {
      await addNotification({
        userId: studentId,
        type: 'level_promotion',
        title: 'تهانينا! تم ترقيتك للمرحلة التالية 🎉',
        message: `تم ترقيتك من المرحلة ${fromLevel} إلى المرحلة ${toLevel} في منهج "${curriculumTitle}". تم خصم ${creditsDeducted} يوماً من رصيدك. الرصيد المتبقي: ${remainingCredit} يوم.`,
        data: {
          fromLevel,
          toLevel,
          curriculumTitle,
          creditsDeducted,
          remainingCredit,
          action: 'view_curriculum'
        },
        isRead: false,
        createdAt: new Date(),
        priority: 'high'
      });
    } catch (error) {
      console.error('Error sending level promotion notification:', error);
    }
  };

  // إشعارات الاشتراك الموجودة مسبقاً
  const sendSubscriptionStatusNotification = async (studentId, curriculumTitle, status) => {
    try {
      let title, message, priority = 'medium';
      
      switch (status) {
        case 'active':
          title = 'تم تفعيل اشتراكك! 🎉';
          message = `تم تفعيل اشتراكك في منهج "${curriculumTitle}" بنجاح. يمكنك الآن بدء رحلتك التعليمية!`;
          priority = 'high';
          break;
        case 'rejected':
          title = 'تم رفض طلب الاشتراك ❌';
          message = `تم رفض طلب اشتراكك في منهج "${curriculumTitle}". يرجى التواصل مع الإدارة للمزيد من التفاصيل.`;
          priority = 'high';
          break;
        case 'expired':
          title = 'انتهى اشتراكك 📅';
          message = `انتهى اشتراكك في منهج "${curriculumTitle}". يمكنك تجديد الاشتراك للمتابعة.`;
          priority = 'medium';
          break;
        default:
          return;
      }

      await addNotification({
        userId: studentId,
        type: 'subscription_status',
        title,
        message,
        data: {
          curriculumTitle,
          status,
          action: status === 'active' ? 'view_curriculum' : 'contact_support'
        },
        isRead: false,
        createdAt: new Date(),
        priority
      });
    } catch (error) {
      console.error('Error sending subscription status notification:', error);
    }
  };

  // إشعارات المدربين والإدارة
  const sendTrainerAssignedNotification = async (trainerId, courseName) => {
    try {
      await addNotification({
        userId: trainerId,
        type: 'trainer_assigned',
        title: 'تم تخصيص كورس جديد لك 👨‍🏫',
        message: `تم تخصيصك كمدرب لكورس "${courseName}". يمكنك الآن إدارة الكورس والطلاب المسجلين.`,
        data: {
          courseName,
          action: 'view_course'
        },
        isRead: false,
        createdAt: new Date(),
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error sending trainer assigned notification:', error);
    }
  };

  const sendAssignedToGroupNotification = async (trainerId, groupName, curriculumName, redirectUrl) => {
    try {
      await addNotification({
        userId: trainerId,
        type: 'group_assigned',
        title: 'تم تخصيص مجموعة جديدة لك 👥',
        message: `تم تخصيصك كمدرب لمجموعة "${groupName}" في منهج "${curriculumName}". يمكنك الآن إدارة المجموعة وتسجيل الحضور.`,
        data: {
          groupName,
          curriculumName,
          action: 'view_group',
          redirectUrl
        },
        isRead: false,
        createdAt: new Date(),
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error sending group assigned notification:', error);
    }
  };

  const sendAddedToGroupNotification = async (studentId, groupName, curriculumName, redirectUrl) => {
    try {
      await addNotification({
        userId: studentId,
        type: 'added_to_group',
        title: 'تم إضافتك لمجموعة تعليمية! 👥',
        message: `تم إضافتك لمجموعة "${groupName}" في منهج "${curriculumName}". ستتمكن من التفاعل مع زملائك ومدربك.`,
        data: {
          groupName,
          curriculumName,
          action: 'view_group',
          redirectUrl
        },
        isRead: false,
        createdAt: new Date(),
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error sending added to group notification:', error);
    }
  };

  const sendAdminPendingReviewNotification = async (adminId, pendingCount, type) => {
    try {
      let title, message;
      
      switch (type) {
        case 'subscription':
          title = 'طلبات اشتراك جديدة تحتاج مراجعة 📋';
          message = `يوجد ${pendingCount} طلب اشتراك جديد في انتظار المراجعة والموافقة.`;
          break;
        case 'payment':
          title = 'مدفوعات جديدة تحتاج تأكيد 💳';
          message = `يوجد ${pendingCount} دفعة جديدة تحتاج تأكيد من الإدارة.`;
          break;
        default:
          title = 'عناصر جديدة تحتاج مراجعة';
          message = `يوجد ${pendingCount} عنصر جديد يحتاج مراجعة إدارية.`;
      }

      await addNotification({
        userId: adminId,
        type: 'admin_pending_review',
        title,
        message,
        data: {
          pendingCount,
          type,
          action: 'review_pending'
        },
        isRead: false,
        createdAt: new Date(),
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error sending admin pending review notification:', error);
    }
  };

  // إشعار تذكير بالجلسة - جديد
  const sendSessionReminderNotification = async (studentId, sessionInfo) => {
    try {
      await addNotification({
        userId: studentId,
        type: 'session_reminder',
        title: 'تذكير: لديك جلسة قريباً 🔔',
        message: `لديك جلسة "${sessionInfo.topic}" في "${sessionInfo.courseName}" غداً في تمام الساعة ${sessionInfo.time}. لا تنس الحضور!`,
        data: {
          sessionInfo,
          action: 'view_schedule'
        },
        isRead: false,
        createdAt: new Date(),
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error sending session reminder notification:', error);
    }
  };

  // إشعار إتمام المنهج - جديد
  const sendCurriculumCompletionNotification = async (studentId, curriculumTitle) => {
    try {
      await addNotification({
        userId: studentId,
        type: 'curriculum_completed',
        title: 'تهانينا! أكملت المنهج بنجاح! 🎓',
        message: `أنجزت جميع مراحل منهج "${curriculumTitle}" بنجاح. يمكنك الآن الحصول على شهادة الإتمام!`,
        data: {
          curriculumTitle,
          action: 'download_certificate'
        },
        isRead: false,
        createdAt: new Date(),
        priority: 'high'
      });
    } catch (error) {
      console.error('Error sending curriculum completion notification:', error);
    }
  };

  // إشعار تحديث النظام - جديد
  const sendSystemUpdateNotification = async (userId, updateInfo) => {
    try {
      await addNotification({
        userId,
        type: 'system_update',
        title: `تحديث جديد: ${updateInfo.title} 🆕`,
        message: updateInfo.description,
        data: {
          updateInfo,
          action: 'view_updates'
        },
        isRead: false,
        createdAt: new Date(),
        priority: 'low'
      });
    } catch (error) {
      console.error('Error sending system update notification:', error);
    }
  };

  // إشعار جماعي - جديد
  const sendBulkNotification = async (userIds, notification) => {
    try {
      const promises = userIds.map(userId => 
        addNotification({
          ...notification,
          userId,
          isRead: false,
          createdAt: new Date()
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error sending bulk notification:', error);
    }
  };

  return {
    // إشعارات الرصيد - جديدة
    sendCreditAddedNotification,
    sendCreditLowNotification,
    sendCreditExpiredNotification,
    sendLevelPromotionNotification, // محدث

    // إشعارات الاشتراكات
    sendSubscriptionStatusNotification,

    // إشعارات المدربين والمجموعات
    sendTrainerAssignedNotification,
    sendAssignedToGroupNotification,
    sendAddedToGroupNotification,

    // إشعارات الإدارة
    sendAdminPendingReviewNotification,

    // إشعارات أخرى جديدة
    sendSessionReminderNotification,
    sendCurriculumCompletionNotification,
    sendSystemUpdateNotification,
    sendBulkNotification
  };
};