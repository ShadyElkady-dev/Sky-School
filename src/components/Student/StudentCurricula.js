// src/components/Student/StudentCurricula.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Star, Clock, DollarSign, Users, CheckCircle, ChevronDown, ChevronUp, Award, Target, Play } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useFirestore';
import { where } from 'firebase/firestore';

const StudentCurricula = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedCurricula, setExpandedCurricula] = useState([]);
  
  const { data: curricula, loading } = useCollection('curricula');
  const { data: subscriptions } = useCollection('subscriptions', [where('studentId', '==', userProfile.id)]);

  const isCourseAvailableForStudent = useCallback((curriculum) => {
    if (!userProfile.age || !curriculum.ageRangeFrom || !curriculum.ageRangeTo) return false;
    return userProfile.age >= curriculum.ageRangeFrom && userProfile.age <= curriculum.ageRangeTo;
  }, [userProfile.age]);

  const getAvailableCurricula = useMemo(() => {
    return curricula.filter(curriculum => 
      curriculum.isActive &&
      isCourseAvailableForStudent(curriculum)
    );
  }, [curricula, isCourseAvailableForStudent]);

  const getAvailableCategories = useMemo(() => {
    const categories = new Set();
    getAvailableCurricula.forEach(curriculum => {
      if (curriculum.category) {
        categories.add(curriculum.category);
      }
    });
    return Array.from(categories);
  }, [getAvailableCurricula]);

  const getFilteredCurricula = useCallback((category) => {
    if (!category) return getAvailableCurricula;
    return getAvailableCurricula.filter(curriculum => curriculum.category === category);
  }, [getAvailableCurricula]);

  const toggleCurriculumExpansion = (id) => {
    setExpandedCurricula(prev => 
      prev.includes(id)
        ? prev.filter(currId => currId !== id)
        : [...prev, id]
    );
  };

  useEffect(() => {
    if (selectedCategory) {
      const categoryCurriculaIds = getFilteredCurricula(selectedCategory).map(c => c.id);
      setExpandedCurricula(categoryCurriculaIds);
    }
  }, [selectedCategory, getFilteredCurricula]);

  // --- تم نقل هذه الدوال للأعلى لحل خطأ ReferenceError ---
  const hasActiveSubscription = useCallback((curriculumId) => {
    return subscriptions.some(sub => 
      sub.curriculumId === curriculumId && 
      sub.status === 'active' &&
      sub.currentLevelAccessExpiresAt && new Date(sub.currentLevelAccessExpiresAt.toDate()) > new Date()
    );
  }, [subscriptions]);

  const hasPendingSubscription = useCallback((curriculumId) => {
    return subscriptions.some(sub => 
      sub.curriculumId === curriculumId && 
      sub.status === 'pending'
    );
  }, [subscriptions]);

  const getStudentSubscription = useCallback((curriculumId) => {
    return subscriptions.find(sub => 
      sub.curriculumId === curriculumId && 
      (sub.status === 'active' || sub.status === 'pending')
    );
  }, [subscriptions]);

  const getCategoryStats = useMemo(() => {
    const stats = {};
    getAvailableCategories.forEach(category => {
      const categoryCurricula = getFilteredCurricula(category);
      stats[category] = {
        total: categoryCurricula.length,
        enrolled: categoryCurricula.filter(c => hasActiveSubscription(c.id)).length
      };
    });
    return stats;
  }, [getAvailableCategories, getFilteredCurricula, hasActiveSubscription]);

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  const availableCategories = getAvailableCategories;
  const categoryStats = getCategoryStats;

  if (!selectedCategory) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">مناهج تعليمية شاملة 📚</h2>
          <p className="text-indigo-100 text-lg mb-6">
            تعلم بطريقة منظمة ومتدرجة مع مناهج مصممة خصيصاً لتطوير مهاراتك خطوة بخطوة
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-4">
              <Target className="mx-auto mb-2" size={32} />
              <h3 className="font-semibold">مسار واضح</h3>
              <p className="text-sm text-indigo-100">من المبتدئ إلى المحترف</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <Clock className="mx-auto mb-2" size={32} />
              <h3 className="font-semibold">اشتراك مرن</h3>
              <p className="text-sm text-indigo-100">خطط شهرية ونصف سنوية</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <Award className="mx-auto mb-2" size={32} />
              <h3 className="font-semibold">تطوير مستمر</h3>
              <p className="text-sm text-indigo-100">محتوى محدث باستمرار</p>
            </div>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
            <Users size={20} />
            <span>مناسب لعمرك: {userProfile.age} سنة</span>
          </div>
        </div>

        {availableCategories.length > 0 ? (
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-6">اختر المجال الذي تريد تعلمه</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableCategories.map((category, index) => {
                const stats = categoryStats[category];
                const categoryCurricula = getFilteredCurricula(category);
                const colors = [
                  'from-blue-500 to-blue-700', 'from-green-500 to-green-700',
                  'from-purple-500 to-purple-700', 'from-orange-500 to-orange-700',
                  'from-pink-500 to-pink-700', 'from-indigo-500 to-indigo-700'
                ];
                const colorClass = colors[index % colors.length];
                
                return (
                  <div
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`group bg-gradient-to-br ${colorClass} rounded-3xl p-8 cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/20 group-hover:from-white/20 group-hover:to-white/30 transition-all duration-300"></div>
                    
                    <div className="relative z-10 text-white text-center">
                      <BookOpen size={80} className="mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
                      <h3 className="text-2xl font-bold mb-3">{category}</h3>
                      <p className="text-white/80 mb-4">
                        {categoryCurricula.length} منهج متاح
                      </p>
                      
                      <div className="space-y-2">
                        {categoryCurricula.slice(0, 2).map(curriculum => (
                          <div key={curriculum.id} className="bg-white/20 rounded-lg p-2">
                            <p className="text-sm font-medium">{curriculum.title}</p>
                          </div>
                        ))}
                        {categoryCurricula.length > 2 && (
                          <p className="text-xs text-white/80">+{categoryCurricula.length - 2} منهج آخر</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              لا توجد مناهج متاحة لعمرك حالياً
            </h3>
            <p className="text-gray-600 mb-4">
              عذراً، لا توجد مناهج مناسبة لعمر {userProfile.age} سنة في الوقت الحالي
            </p>
            <button
              onClick={() => navigate('/courses')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              تصفح الكورسات الفردية
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">لماذا المناهج أفضل من الكورسات الفردية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-green-700">✅ المناهج التعليمية</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600" />
                  مسار تعليمي متكامل ومرتب
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600" />
                  تطور تدريجي من المبتدئ للمحترف
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600" />
                  اشتراك مرن بنظام رصيد الأيام
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600" />
                  محتوى محدث باستمرار
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">📖 الكورسات الفردية</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Star size={16} className="text-gray-600" />
                  كورسات منفصلة
                </li>
                <li className="flex items-center gap-2">
                  <Star size={16} className="text-gray-600" />
                  موضوع محدد
                </li>
                <li className="flex items-center gap-2">
                  <Star size={16} className="text-gray-600" />
                  دفعة واحدة
                </li>
                <li className="flex items-center gap-2">
                  <Star size={16} className="text-gray-600" />
                  مدة ثابتة
                </li>
              </ul>
              <button
                onClick={() => navigate('/courses')}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors mt-4"
              >
                تصفح الكورسات الفردية
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categoryFilteredCurricula = getFilteredCurricula(selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedCategory(null)}
          className="text-purple-600 hover:text-purple-700 font-medium"
        >
          ← العودة للفئات
        </button>
        <h2 className="text-3xl font-bold text-gray-800">مناهج {selectedCategory}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {categoryFilteredCurricula.map(curriculum => {
          const hasActive = hasActiveSubscription(curriculum.id);
          const hasPending = hasPendingSubscription(curriculum.id);
          const subscription = getStudentSubscription(curriculum.id);
          
          return (
            <div key={curriculum.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              {curriculum.image && (
                <div className="relative">
                  <img src={curriculum.image} alt={curriculum.title} className="w-full h-48 object-cover" />
                  <div className="absolute top-4 right-4 flex gap-2">
                    {hasActive && (
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        مشترك
                      </span>
                    )}
                    {hasPending && (
                      <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        قيد المراجعة
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-3">{curriculum.title}</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">{curriculum.description}</p>
                
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    للأعمار من {curriculum.ageRangeFrom} إلى {curriculum.ageRangeTo} سنة
                  </span>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold mb-3">خطط الاشتراك:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {curriculum.subscriptionPlans?.filter(plan => plan.price > 0).map(plan => (
                      <div key={plan.type} className="border rounded-lg p-3 text-center hover:border-purple-500 transition-colors">
                        <p className="font-semibold text-sm">{plan.label}</p>
                        <p className="text-purple-600 font-bold text-lg">{plan.price} جنيه</p>
                        <p className="text-xs text-gray-500">
                          {plan.type === 'monthly' && 'رصيد 30 يوم'}
                          {plan.type === 'quarterly' && 'رصيد 90 يوم'}
                          {plan.type === 'semiannual' && 'رصيد 180 يوم'}
                          {plan.type === 'annual' && 'رصيد 365 يوم'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <button
                    onClick={() => toggleCurriculumExpansion(curriculum.id)}
                    className="flex items-center justify-between w-full text-left font-semibold mb-3"
                  >
                    <span>المراحل التعليمية ({curriculum.levels?.length || 0})</span>
                    {expandedCurricula.includes(curriculum.id) ? 
                      <ChevronUp size={20} /> : <ChevronDown size={20} />
                    }
                  </button>
                  
                  {expandedCurricula.includes(curriculum.id) && (
                    <div className="space-y-3">
                      {curriculum.levels?.map((level, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </span>
                            <h5 className="font-semibold">{level.title}</h5>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{level.description}</p>
                          <div className="flex justify-between text-xs text-purple-800 bg-purple-100 px-2 py-1 rounded">
                            <span>المدة: {level.durationDays} يوم</span>
                            <span>الجلسات: {level.sessionsCount} جلسة</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {curriculum.learningOutcomes?.filter(outcome => outcome.trim()).length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-2">ماذا ستتعلم:</h4>
                    <ul className="space-y-1">
                      {curriculum.learningOutcomes.filter(outcome => outcome.trim()).slice(0, 3).map((outcome, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          {outcome}
                        </li>
                      ))}
                      {curriculum.learningOutcomes.filter(outcome => outcome.trim()).length > 3 && (
                        <li className="text-sm text-gray-500">
                          +{curriculum.learningOutcomes.filter(outcome => outcome.trim()).length - 3} مخرج تعليمي آخر
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {curriculum.prerequisites && (
                  <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-1">المتطلبات المسبقة:</h4>
                    <p className="text-yellow-700 text-sm">{curriculum.prerequisites}</p>
                  </div>
                )}

                {hasActive && subscription && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="text-green-600" size={20} />
                      <span className="font-semibold text-green-800">مشترك بالفعل</span>
                    </div>
                    <p className="text-green-700 text-sm">
                      رصيدك الحالي: {subscription.accessCreditDays || 0} يوم
                    </p>
                  </div>
                )}

                {hasPending && subscription && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="text-yellow-600" size={20} />
                      <span className="font-semibold text-yellow-800">في انتظار تأكيد الدفع</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {hasActive ? (
                    <button
                      onClick={() => navigate(`/my-curricula`)}
                      className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Play size={20} />
                      اذهب لمناهجي
                    </button>
                  ) : hasPending ? (
                    <div className="w-full bg-yellow-100 text-yellow-800 px-6 py-3 rounded-lg text-center">
                      في انتظار تأكيد الدفع
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate(`/curriculum/${curriculum.id}/subscribe`)}
                      className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Star size={20} />
                      اشترك الآن
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {categoryFilteredCurricula.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            لا توجد مناهج {selectedCategory} متاحة
          </h3>
          <p className="text-gray-600 mb-4">
            لم نجد مناهج {selectedCategory} مناسبة لعمرك ({userProfile.age} سنة) حالياً
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentCurricula;