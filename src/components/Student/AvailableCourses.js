// src/components/Student/AvailableCourses.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Clock, BookOpen, Star, CheckCircle, Users, Award, ArrowRight, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useFirestore';
import { where } from 'firebase/firestore';

const AvailableCourses = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(null); // null للصفحة الرئيسية
  const [showFilters, setShowFilters] = useState(false);
  
  const { data: courses, loading } = useCollection('courses');
  const { data: enrollments } = useCollection('enrollments', [where('studentId', '==', userProfile.id)]);
  const { data: payments } = useCollection('payments', [where('studentId', '==', userProfile.id)]);

  const levelLabels = {
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم'
  };

  // الحصول على الفئات الموجودة
  const getAvailableCategories = () => {
    const categories = new Set();
    courses.forEach(course => {
      if (course.category && isCourseAvailableForStudent(course)) {
        categories.add(course.category);
      }
    });
    return Array.from(categories);
  };

  // التحقق من أن الكورس متاح للطالب حسب العمر
  const isCourseAvailableForStudent = (course) => {
    if (!userProfile.age || !course.ageRangeFrom || !course.ageRangeTo) return false;
    return userProfile.age >= course.ageRangeFrom && userProfile.age <= course.ageRangeTo;
  };

  // فلترة الكورسات المناسبة للطالب حسب الفئة
  const getFilteredCourses = (category) => {
    if (!userProfile || !category) return [];
    
    return courses.filter(course => {
      // فلترة حسب الفئة
      const matchesCategory = course.category === category;
      if (!matchesCategory) return false;
      
      // فلترة حسب العمر
      const matchesAge = isCourseAvailableForStudent(course);
      if (!matchesAge) return false;
      
      return true;
    });
  };

  // إحصائيات الكورسات حسب الفئة
  const getCategoryStats = () => {
    const categories = getAvailableCategories();
    const stats = {};
    
    categories.forEach(category => {
      const categoryCourses = getFilteredCourses(category);
      stats[category] = {
        total: categoryCourses.length,
        enrolled: categoryCourses.filter(c => isEnrolled(c.id)).length
      };
    });
    
    return stats;
  };

  const isEnrolled = (courseId) => {
    return enrollments.some(e => e.courseId === courseId);
  };

  const isPending = (courseId) => {
    return payments.some(p => p.courseId === courseId && p.status === 'pending');
  };

  const handleCourseClick = (course) => {
    if (!isEnrolled(course.id) && !isPending(course.id)) {
      navigate(`/courses/${course.id}`);
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  const availableCategories = getAvailableCategories();
  const categoryStats = getCategoryStats();

  // صفحة اختيار الفئة (الرئيسية)
  if (!selectedCategory) {
    return (
      <div className="space-y-6">
        {/* ترحيب شخصي */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white p-6 text-center">
          <h2 className="text-3xl font-bold mb-2">
            أهلاً {userProfile.firstName}! 👋
          </h2>
          <p className="text-purple-100 mb-4">
            اختر المجال الذي تريد تعلمه من الخيارات أدناه
          </p>
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
            <Users size={20} />
            <span>عمرك: {userProfile.age} سنة</span>
          </div>
        </div>

        {/* عرض الفئات المتاحة */}
        {availableCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCategories.map((category, index) => {
              const stats = categoryStats[category];
              const colors = [
                'from-blue-500 to-blue-700',
                'from-green-500 to-green-700',
                'from-purple-500 to-purple-700',
                'from-orange-500 to-orange-700',
                'from-pink-500 to-pink-700',
                'from-indigo-500 to-indigo-700'
              ];
              const colorClass = colors[index % colors.length];
              
              return (
                <div
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`group bg-gradient-to-br ${colorClass} rounded-3xl p-8 cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden`}
                >
                  {/* خلفية متحركة */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/20 group-hover:from-white/20 group-hover:to-white/30 transition-all duration-300"></div>
                  
                  <div className="relative z-10 text-white text-center h-full flex flex-col justify-center">
                    <div className="mb-6">
                      <BookOpen size={80} className="mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
                      <h3 className="text-3xl font-bold mb-3">{category}</h3>
                      <p className="text-white/80 text-lg mb-6">
                        استكشف كورسات {category}
                      </p>
                    </div>
                    
                    {/* إحصائيات */}
                    <div className="space-y-3 mb-6">
                      <div className="bg-white/20 rounded-lg p-3">
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-white/80 text-sm">كورس متاح</p>
                      </div>
                      {stats.enrolled > 0 && (
                        <div className="bg-green-500/30 rounded-lg p-3">
                          <p className="text-xl font-bold">{stats.enrolled}</p>
                          <p className="text-green-100 text-sm">مسجل فيه</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 group-hover:gap-4 transition-all duration-300">
                      <span className="text-lg font-semibold">استكشف {category}</span>
                      <ChevronLeft size={24} className="group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Star className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              لا توجد كورسات متاحة لعمرك حالياً
            </h3>
            <p className="text-gray-600 mb-4">
              عذراً، لا توجد كورسات مناسبة لعمر {userProfile.age} سنة في الوقت الحالي
            </p>
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-2">💡 نصائح:</p>
              <ul className="text-right space-y-1">
                <li>• تحقق من الصفحة لاحقاً للكورسات الجديدة</li>
                <li>• تواصل مع الإدارة لمعرفة الكورسات القادمة</li>
                <li>• تأكد من صحة عمرك في ملفك الشخصي</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  // صفحة الكورسات للفئة المحددة
  const categoryFilteredCourses = getFilteredCourses(selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header مع زر العودة */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedCategory(null)}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors"
        >
          <ArrowRight size={20} />
          العودة للصفحة الرئيسية
        </button>
        
        <div className="flex items-center gap-3">
          <BookOpen className="text-blue-600" size={28} />
          <h2 className="text-3xl font-bold text-gray-800">
            كورسات {selectedCategory}
          </h2>
        </div>
      </div>

      {/* إحصائيات */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {categoryFilteredCourses.length}
            </p>
            <p className="text-gray-600 text-sm">كورس متاح</p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {categoryFilteredCourses.filter(c => isEnrolled(c.id)).length}
            </p>
            <p className="text-gray-600 text-sm">مسجل فيه</p>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {categoryFilteredCourses.filter(c => isPending(c.id)).length}
            </p>
            <p className="text-gray-600 text-sm">قيد المراجعة</p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <Users className="mx-auto text-purple-600 mb-1" size={24} />
            <p className="text-purple-600 text-sm font-medium">
              عمرك: {userProfile.age} سنة
            </p>
          </div>
        </div>
      </div>

      {/* قائمة الكورسات */}
      {categoryFilteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryFilteredCourses.map(course => {
            const enrolled = isEnrolled(course.id);
            const pending = isPending(course.id);
            
            return (
              <div 
                key={course.id} 
                className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:scale-105 ${
                  (enrolled || pending) ? 'cursor-default' : 'cursor-pointer'
                }`}
                onClick={() => handleCourseClick(course)}
              >
                {course.image && (
                  <div className="relative">
                    <img src={course.image} alt={course.title} className="w-full h-48 object-cover" />
                    
                    {/* شارات الحالة */}
                    <div className="absolute top-2 right-2 flex gap-2">
                      {enrolled && (
                        <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          مسجل
                        </div>
                      )}
                      {pending && (
                        <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          قيد المراجعة
                        </div>
                      )}
                      
                      {/* مستوى الصعوبة */}
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        course.level === 'beginner' ? 'bg-green-100 text-green-800' :
                        course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {levelLabels[course.level]}
                      </div>
                    </div>

                    {/* أيقونة الفئة */}
                    <div className="absolute bottom-2 right-2">
                      <div className="bg-blue-500 text-white p-2 rounded-full">
                        <BookOpen size={20} />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                  
                  {/* الفئة العمرية */}
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      من {course.ageRangeFrom} إلى {course.ageRangeTo} سنة
                    </span>
                  </div>
                  
                  {/* المتطلبات المسبقة */}
                  {course.prerequisites && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs font-medium text-yellow-800 mb-1">متطلبات مسبقة:</p>
                      <p className="text-xs text-yellow-700">{course.prerequisites}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2 text-sm text-gray-500 mb-4">
                    <p className="flex items-center gap-2">
                      <DollarSign size={16} className="text-purple-600" />
                      <span className="font-semibold text-gray-800">{course.price} جنيه</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock size={16} className="text-blue-600" />
                      {course.duration}
                    </p>
                    {course.sessionsCount && (
                      <p className="flex items-center gap-2">
                        <BookOpen size={16} className="text-green-600" />
                        {course.sessionsCount} حصة
                      </p>
                    )}
                  </div>
                  
                  {enrolled ? (
                    <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2" disabled>
                      <CheckCircle size={18} />
                      مسجل في الكورس
                    </button>
                  ) : pending ? (
                    <button className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2" disabled>
                      <Clock size={18} />
                      في انتظار تأكيد الدفع
                    </button>
                  ) : (
                    <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                      <Star size={18} />
                      عرض التفاصيل والتسجيل
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <BookOpen className="mx-auto text-blue-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            لا توجد كورسات {selectedCategory} متاحة حالياً
          </h3>
          <p className="text-gray-600 mb-4">
            لم نجد كورسات {selectedCategory} مناسبة لعمرك ({userProfile.age} سنة) في الوقت الحالي
          </p>
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-2">💡 نصائح:</p>
            <ul className="text-right space-y-1">
              <li>• تحقق من الصفحة لاحقاً للكورسات الجديدة</li>
              <li>• جرب فئة أخرى إذا كانت متاحة</li>
              <li>• تواصل مع الإدارة للاستفسار عن الكورسات القادمة</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableCourses;