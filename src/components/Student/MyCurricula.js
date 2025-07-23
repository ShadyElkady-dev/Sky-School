// src/components/Student/MyCurricula.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, MessageCircle, User, Calendar, Clock, Award, 
  Settings, Lock, CheckCircle, Play, Star, Users, Target,
  AlertCircle, RefreshCw, TrendingUp
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useFirestore';
import { where } from 'firebase/firestore';
import ChatWindow from '../Chat/ChatWindow';

const MyCurricula = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [chatWithAdmin, setChatWithAdmin] = useState(false);
  
  const { data: subscriptions } = useCollection('subscriptions', [where('studentId', '==', userProfile.id)]);
  const { data: curricula } = useCollection('curricula');
  const { data: users } = useCollection('users');
  
  const admin = users.find(user => user.role === 'admin');
  
  // <-- التعديل الجديد: تحسين منطق جلب حالة الاشتراك -->
  const getCurriculaWithSubscriptionStatus = () => {
    const subscribedCurriculumIds = new Set(subscriptions.map(s => s.curriculumId));
    const subscribedCurricula = curricula.filter(c => subscribedCurriculumIds.has(c.id));
    
    return subscribedCurricula.map(curriculum => {
      // البحث عن الاشتراك الأنسب (نشط > قيد المراجعة > مرفوض)
      const curriculumSubscriptions = subscriptions.filter(s => s.curriculumId === curriculum.id);
      let mostRelevantSubscription = curriculumSubscriptions.find(s => s.status === 'active');
      if (!mostRelevantSubscription) {
        mostRelevantSubscription = curriculumSubscriptions.find(s => s.status === 'pending');
      }
      if (!mostRelevantSubscription) {
        mostRelevantSubscription = curriculumSubscriptions.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate())[0];
      }

      const isExpired = mostRelevantSubscription && mostRelevantSubscription.currentLevelAccessExpiresAt && new Date(mostRelevantSubscription.currentLevelAccessExpiresAt.toDate()) < new Date();
      
      return {
        ...curriculum,
        subscription: mostRelevantSubscription,
        isExpired,
        hasConfirmedSubscription: mostRelevantSubscription?.status === 'active',
        isPending: mostRelevantSubscription?.status === 'pending',
        isRejected: mostRelevantSubscription?.status === 'rejected'
      };
    });
  };
  
  const curriculaWithStatus = getCurriculaWithSubscriptionStatus();
  const confirmedCurricula = curriculaWithStatus.filter(c => c.hasConfirmedSubscription && !c.isExpired);
  const pendingCurricula = curriculaWithStatus.filter(c => c.isPending);
  const expiredCurricula = curriculaWithStatus.filter(c => c.isExpired);
  const hasAnyConfirmedSubscription = confirmedCurricula.length > 0;

  const calculateProgress = (curriculum) => {
    if (!curriculum.subscription || !curriculum.levels) return 0;
    
    const totalLevels = curriculum.levels.length;
    const completedLevels = curriculum.subscription.progress?.completedLevels?.length || 0;
    
    return totalLevels > 0 ? (completedLevels / totalLevels) * 100 : 0;
  };

  const getDaysLeft = (expiresAt) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt.toDate());
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (chatWithAdmin && admin && hasAnyConfirmedSubscription) {
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
        <h2 className="text-3xl font-bold text-gray-800">مناهجي</h2>
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">
            <span className="font-semibold">{curriculaWithStatus.length}</span> منهج مشترك
          </div>
          
          {hasAnyConfirmedSubscription ? (
            <button
              onClick={() => setChatWithAdmin(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <MessageCircle size={18} />
              تواصل مع الإدارة
            </button>
          ) : (
            <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg flex items-center gap-2" title="متاح بعد تأكيد الاشتراك">
              <Lock size={18} />
              تواصل مع الإدارة
            </div>
          )}
        </div>
      </div>

      {hasAnyConfirmedSubscription ? (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle size={24} className="text-green-600" />
                🎉 مرحباً بك في مناهجك التعليمية!
              </h3>
              <p className="text-green-800 mb-4">
                تم تأكيد اشتراكك وأصبح بإمكانك الآن متابعة رحلتك التعليمية والتواصل مع الإدارة والمدربين
              </p>
            </div>
            <button
              onClick={() => setChatWithAdmin(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <MessageCircle size={20} />
              محادثاتى
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
              سيكون بإمكانك التواصل مع الإدارة والمدربين بمجرد تأكيد اشتراك أحد المناهج
            </p>
            <div className="bg-yellow-100 rounded-lg p-4 text-sm text-yellow-800">
              <p className="font-medium mb-2">💡 لتفعيل ميزة التواصل:</p>
              <ol className="text-right space-y-1">
                <li>1. اشترك في أحد المناهج المتاحة</li>
                <li>2. ادفع رسوم الاشتراك</li>
                <li>3. انتظر تأكيد الدفع من الإدارة</li>
                <li>4. ستتمكن من التواصل معنا والوصول للمحتوى</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {curriculaWithStatus.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <CheckCircle className="mx-auto text-green-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-green-900">{confirmedCurricula.length}</p>
            <p className="text-gray-600 text-sm">منهج نشط</p>
          </div>
          
          <div className="bg-yellow-50 rounded-xl p-4 text-center">
            <Clock className="mx-auto text-yellow-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-yellow-900">{pendingCurricula.length}</p>
            <p className="text-gray-600 text-sm">في انتظار التأكيد</p>
          </div>
          
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <AlertCircle className="mx-auto text-orange-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-orange-900">{expiredCurricula.length}</p>
            <p className="text-gray-600 text-sm">منتهي الصلاحية</p>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <BookOpen className="mx-auto text-blue-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-blue-900">{curriculaWithStatus.length}</p>
            <p className="text-gray-600 text-sm">إجمالي المناهج</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {curriculaWithStatus.map(curriculum => {
          const progress = calculateProgress(curriculum);
          const daysLeft = curriculum.subscription ? getDaysLeft(curriculum.subscription.currentLevelAccessExpiresAt) : null;
          const currentLevel = curriculum.subscription?.currentLevel || 1;
          const totalLevels = curriculum.levels?.length || 0;
          
          return (
            <div key={curriculum.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              {curriculum.image && (
                <div className="relative">
                  <img src={curriculum.image} alt={curriculum.title} className="w-full h-48 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    {curriculum.hasConfirmedSubscription && !curriculum.isExpired && (
                      <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                        <CheckCircle size={14} />
                        نشط
                      </div>
                    )}
                    {curriculum.isPending && (
                      <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                        <Clock size={14} />
                        قيد المراجعة
                      </div>
                    )}
                    {curriculum.isExpired && (
                      <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        منتهي
                      </div>
                    )}
                    {curriculum.isRejected && (
                      <div className="bg-gray-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        مرفوض
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{curriculum.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{curriculum.description}</p>
                
                {curriculum.subscription && (
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p className="flex items-center gap-2">
                      <Star size={16} className="text-yellow-500" />
                      رصيد الأيام المتبقي: 
                      <span className="font-bold text-purple-600">{curriculum.subscription.accessCreditDays || 0} يوم</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock size={16} />
                      {curriculum.isExpired 
                        ? 'انتهى الوصول لهذه المرحلة' 
                        : daysLeft > 0 
                        ? `ينتهي الوصول للمرحلة الحالية بعد ${daysLeft} يوم`
                        : 'ينتهي الوصول للمرحلة اليوم'
                      }
                    </p>
                    {curriculum.hasConfirmedSubscription && !curriculum.isExpired && (
                      <p className="flex items-center gap-2">
                        <Target size={16} />
                        التقدم: {progress.toFixed(0)}%
                      </p>
                    )}
                  </div>
                )}

                {curriculum.hasConfirmedSubscription && !curriculum.isExpired && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>التقدم في المنهج</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>المرحلة {currentLevel} من {totalLevels}</span>
                      <span>{curriculum.subscription.progress?.completedLevels?.length || 0} مكتملة</span>
                    </div>
                  </div>
                )}
                
                <div className={`p-3 rounded-lg mb-4 text-center ${
                  curriculum.hasConfirmedSubscription && !curriculum.isExpired ? 'bg-green-50 border border-green-200' :
                  curriculum.isPending ? 'bg-yellow-50 border border-yellow-200' :
                  curriculum.isExpired ? 'bg-orange-50 border border-orange-200' :
                  curriculum.isRejected ? 'bg-red-50 border border-red-200' :
                  'bg-gray-50 border border-gray-200'
                }`}>
                  {curriculum.hasConfirmedSubscription && !curriculum.isExpired && (
                    <>
                      <CheckCircle className="mx-auto text-green-600 mb-1" size={24} />
                      <p className="font-medium text-green-800">اشتراك نشط</p>
                      <p className="text-sm text-green-600">
                        المرحلة الحالية: {currentLevel}
                      </p>
                    </>
                  )}
                  {curriculum.isPending && (
                    <>
                      <Clock className="mx-auto text-yellow-600 mb-1" size={24} />
                      <p className="font-medium text-yellow-800">في انتظار تأكيد الاشتراك</p>
                      <p className="text-sm text-yellow-600">سيتم المراجعة خلال 24 ساعة</p>
                    </>
                  )}
                  {curriculum.isExpired && (
                    <>
                      <AlertCircle className="mx-auto text-orange-600 mb-1" size={24} />
                      <p className="font-medium text-orange-800">انتهى الوصول للمرحلة</p>
                      <p className="text-sm text-orange-600">تواصل مع الإدارة للتجديد</p>
                    </>
                  )}
                  {curriculum.isRejected && (
                    <>
                      <p className="font-medium text-red-800">تم رفض الاشتراك</p>
                      <p className="text-sm text-red-600">يرجى التواصل مع الإدارة</p>
                    </>
                  )}
                </div>
                
                <div className="space-y-2">
                  {curriculum.hasConfirmedSubscription && !curriculum.isExpired ? (
                    <>
                      <button
                        onClick={() => navigate(`/curriculum/${curriculum.id}`)}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Play size={18} />
                        متابعة التعلم
                      </button>
                      <button
                        onClick={() => setChatWithAdmin(true)}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={18} />
                        تواصل مع الإدارة
                      </button>
                    </>
                  ) : curriculum.isExpired ? (
                    <>
                      <button
                        onClick={() => navigate(`/curriculum/${curriculum.id}/subscribe`)}
                        className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={18} />
                        إضافة رصيد أيام للاشتراك
                      </button>
                      <div className="text-center text-sm text-gray-500">
                        انتهى الوصول للمرحلة في: {new Date(curriculum.subscription.currentLevelAccessExpiresAt.toDate()).toLocaleDateString('ar-EG')}
                      </div>
                    </>
                  ) : curriculum.isPending ? (
                    <div className="w-full bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-center flex items-center justify-center gap-2">
                      <Clock size={18} />
                      في انتظار تأكيد الدفع
                    </div>
                  ) : (
                    <div className="w-full bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-center flex items-center justify-center gap-2">
                      <Lock size={18} />
                      التواصل متاح بعد تأكيد الاشتراك
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {curriculaWithStatus.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 text-lg">لم تشترك في أي منهج حتى الآن</p>
          <p className="text-gray-500 mt-2">ابدأ رحلتك التعليمية واشترك في المناهج المتاحة</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
            <button
              onClick={() => navigate('/curricula')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
            >
              <BookOpen size={20} />
              تصفح المناهج المتاحة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCurricula;