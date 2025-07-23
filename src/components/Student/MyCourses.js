// src/components/Student/MyCourses.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, MessageCircle, User, Calendar, Clock, Award, Settings, Lock, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useFirestore';
import { where } from 'firebase/firestore';
import ChatWindow from '../Chat/ChatWindow';

const MyCourses = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [chatWithAdmin, setChatWithAdmin] = useState(false);
  
  const { data: enrollments } = useCollection('enrollments', [where('studentId', '==', userProfile.id)]);
  const { data: courses } = useCollection('courses');
  const { data: users } = useCollection('users');
  // <-- التعديل: جلب كل المدفوعات للطالب لضمان الحصول على أحدث حالة -->
  const { data: payments } = useCollection('payments', [where('studentId', '==', userProfile.id)]);
  
  // Get admin user
  const admin = users.find(user => user.role === 'admin');
  
  // <-- التعديل الجديد: تحسين منطق جلب حالة الدفع -->
  const getCoursesWithPaymentStatus = () => {
    // جلب ID كل الكورسات التي حاول الطالب الدفع لها
    const paymentCourseIds = new Set(payments.map(p => p.courseId));
    const enrolledCourseIds = new Set(enrollments.map(e => e.courseId));
    const allRelevantCourseIds = Array.from(new Set([...paymentCourseIds, ...enrolledCourseIds]));
    
    const relevantCourses = courses.filter(c => allRelevantCourseIds.includes(c.id));
    
    return relevantCourses.map(course => {
      // البحث عن الدفعة الأنسب (نشطة > قيد المراجعة > مرفوضة)
      const coursePayments = payments.filter(p => p.courseId === course.id);
      let mostRelevantPayment = coursePayments.find(p => p.status === 'confirmed');
      if (!mostRelevantPayment) {
        mostRelevantPayment = coursePayments.find(p => p.status === 'pending');
      }
      if (!mostRelevantPayment) {
        mostRelevantPayment = coursePayments.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate())[0];
      }

      const enrollment = enrollments.find(e => e.courseId === course.id);
      
      return {
        ...course,
        enrollmentDate: enrollment?.enrolledAt || enrollment?.createdAt,
        paymentStatus: mostRelevantPayment?.status || 'unknown',
        hasConfirmedPayment: mostRelevantPayment?.status === 'confirmed'
      };
    });
  };
  
  const coursesWithStatus = getCoursesWithPaymentStatus();
  const confirmedCourses = coursesWithStatus.filter(c => c.hasConfirmedPayment);
  const pendingCourses = coursesWithStatus.filter(c => c.paymentStatus === 'pending');
  const hasAnyConfirmedPayment = confirmedCourses.length > 0;
  
  const getTrainer = (trainerId) => {
    return users.find(u => u.id === trainerId);
  };

  if (chatWithAdmin && admin && hasAnyConfirmedPayment) {
    return (
      <div className="space-y-6">
        <ChatWindow 
          otherUser={admin} 
          onClose={() => setChatWithAdmin(false)} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">كورساتي</h2>
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">
            <span className="font-semibold">{coursesWithStatus.length}</span> كورس مسجل
          </div>
          
          {hasAnyConfirmedPayment ? (
            <button
              onClick={() => setChatWithAdmin(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <MessageCircle size={18} />
              تواصل مع الإدارة
            </button>
          ) : (
            <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg flex items-center gap-2" title="متاح بعد تأكيد الدفع">
              <Lock size={18} />
              تواصل مع الإدارة
            </div>
          )}
        </div>
      </div>

      {hasAnyConfirmedPayment ? (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle size={24} className="text-green-600" />
                🎉 مرحباً بك في منصة الكورسات!
              </h3>
              <p className="text-green-800 mb-4">
                تم تأكيد دفعك وأصبح بإمكانك الآن التواصل مع الإدارة والمدربين للحصول على الدعم والمساعدة
              </p>
            </div>
            <button
              onClick={() => setChatWithAdmin(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <MessageCircle size={20} />
              ابدأ المحادثة
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
          <div className="text-center">
            <Lock className="mx-auto text-yellow-600 mb-3" size={48} />
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              التواصل مع الإدارة غير متاح حالياً
            </h3>
            <p className="text-yellow-800 mb-4">
              سيكون بإمكانك التواصل مع الإدارة والمدربين بمجرد تأكيد دفع أحد الكورسات
            </p>
            <div className="bg-yellow-100 rounded-lg p-4 text-sm text-yellow-800">
              <p className="font-medium mb-2">💡 لتفعيل ميزة التواصل:</p>
              <ol className="text-right space-y-1">
                <li>1. سجل في أحد الكورسات المتاحة</li>
                <li>2. ادفع رسوم الكورس</li>
                <li>3. انتظر تأكيد الدفع من الإدارة</li>
                <li>4. ستتمكن من التواصل معنا مباشرة</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {coursesWithStatus.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <CheckCircle className="mx-auto text-green-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-green-900">{confirmedCourses.length}</p>
            <p className="text-gray-600 text-sm">كورس مؤكد</p>
          </div>
          
          <div className="bg-yellow-50 rounded-xl p-4 text-center">
            <Clock className="mx-auto text-yellow-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-yellow-900">{pendingCourses.length}</p>
            <p className="text-gray-600 text-sm">في انتظار التأكيد</p>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <BookOpen className="mx-auto text-blue-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-blue-900">{coursesWithStatus.length}</p>
            <p className="text-gray-600 text-sm">إجمالي الكورسات</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coursesWithStatus.map(course => {
          const trainer = getTrainer(course.trainerId);
          
          return (
            <div key={course.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              {course.image && (
                <div className="relative">
                  <img src={course.image} alt={course.title} className="w-full h-48 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    {course.paymentStatus === 'confirmed' && (
                      <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                        <CheckCircle size={14} />
                        مؤكد
                      </div>
                    )}
                    {course.paymentStatus === 'pending' && (
                      <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                        <Clock size={14} />
                        قيد المراجعة
                      </div>
                    )}
                    {course.paymentStatus === 'rejected' && (
                      <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        مرفوض
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p className="flex items-center gap-2">
                    <Clock size={16} />
                    {course.duration}
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar size={16} />
                    يبدأ: {new Date(course.startDate).toLocaleDateString('ar-EG')}
                  </p>
                  {course.enrollmentDate && (
                    <p className="flex items-center gap-2">
                      <Award size={16} />
                      تاريخ التسجيل: {course.enrollmentDate.toDate ? new Date(course.enrollmentDate.toDate()).toLocaleDateString('ar-EG') : '-'}
                    </p>
                  )}
                </div>
                
                <div className={`p-3 rounded-lg mb-4 text-center ${
                  course.paymentStatus === 'confirmed' ? 'bg-green-50 border border-green-200' :
                  course.paymentStatus === 'pending' ? 'bg-yellow-50 border border-yellow-200' :
                  course.paymentStatus === 'rejected' ? 'bg-red-50 border border-red-200' :
                  'bg-gray-50 border border-gray-200'
                }`}>
                  {course.paymentStatus === 'confirmed' && (
                    <>
                      <CheckCircle className="mx-auto text-green-600 mb-1" size={24} />
                      <p className="font-medium text-green-800">تم تأكيد الدفع</p>
                      <p className="text-sm text-green-600">يمكنك الآن التواصل مع الإدارة</p>
                    </>
                  )}
                  {course.paymentStatus === 'pending' && (
                    <>
                      <Clock className="mx-auto text-yellow-600 mb-1" size={24} />
                      <p className="font-medium text-yellow-800">في انتظار تأكيد الدفع</p>
                      <p className="text-sm text-yellow-600">سيتم المراجعة خلال 24 ساعة</p>
                    </>
                  )}
                  {course.paymentStatus === 'rejected' && (
                    <>
                      <p className="font-medium text-red-800">تم رفض الدفع</p>
                      <p className="text-sm text-red-600">يرجى التواصل مع الإدارة</p>
                    </>
                  )}
                </div>
                
                {trainer ? (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-1">المدرب المسؤول</p>
                    <p className="font-semibold flex items-center gap-2">
                      <User size={16} />
                      {trainer.firstName} {trainer.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{trainer.phone}</p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">لم يتم تحديد مدرب بعد</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  {course.hasConfirmedPayment ? (
                    <button
                      onClick={() => setChatWithAdmin(true)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={18} />
                      تواصل مع الإدارة
                    </button>
                  ) : (
                    <div className="w-full bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-center flex items-center justify-center gap-2">
                      <Lock size={18} />
                      التواصل متاح بعد تأكيد الدفع
                    </div>
                  )}
                  
                  {trainer && course.hasConfirmedPayment && (
                    <div className="text-center text-sm text-gray-500 bg-gray-50 rounded-lg p-2">
                      <Settings size={14} className="inline mr-1" />
                      للتواصل مع المدرب: راسل الإدارة
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {coursesWithStatus.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 text-lg">لم تسجل في أي كورس حتى الآن</p>
          <p className="text-gray-500 mt-2">ابدأ رحلتك التعليمية وسجل في الكورسات المتاحة</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
            <button
              onClick={() => navigate('/courses')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
            >
              <BookOpen size={20} />
              تصفح الكورسات المتاحة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCourses;