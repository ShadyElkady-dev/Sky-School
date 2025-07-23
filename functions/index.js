// functions/index.js
// هذا الكود يتم رفعه على Firebase Functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Cloud Function لإعادة تعيين كلمة المرور
exports.resetUserPassword = functions.https.onCall(async (data, context) => {
  // التحقق من أن المستخدم أدمن
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'يجب تسجيل الدخول');
  }

  const callerUid = context.auth.uid;
  const callerData = await admin.firestore().collection('users').doc(callerUid).get();
  
  if (!callerData.exists || callerData.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'غير مصرح لك بهذا الإجراء');
  }

  // البيانات المطلوبة
  const { userId, newPassword } = data;

  if (!userId || !newPassword) {
    throw new functions.https.HttpsError('invalid-argument', 'البيانات غير كاملة');
  }

  try {
    // تحديث كلمة المرور
    await admin.auth().updateUser(userId, {
      password: newPassword
    });

    // تسجيل العملية
    await admin.firestore().collection('passwordResets').add({
      adminId: callerUid,
      userId: userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      adminName: callerData.data().firstName + ' ' + callerData.data().lastName
    });

    return { success: true, message: 'تم تغيير كلمة المرور بنجاح' };
  } catch (error) {
    console.error('Error updating password:', error);
    throw new functions.https.HttpsError('internal', 'حدث خطأ في تحديث كلمة المرور');
  }
});