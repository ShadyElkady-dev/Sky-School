// src/components/Layout/Sidebar.js
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, DollarSign, Users, Award, UserCheck, MessageCircle, 
  Calendar, BarChart3, UsersIcon, GraduationCap, CreditCard, 
  Star, FileText, TrendingUp, Target, Settings
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCollection } from '../../hooks/useFirestore';
import { where } from 'firebase/firestore';

const Sidebar = ({ isOpen, onClose }) => {
  const { userProfile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // جلب الاشتراكات للطالب لتحديد ترتيب القائمة
  const { data: userSubscriptions } = useCollection('subscriptions', 
    userProfile?.role === 'student' ? [where('studentId', '==', userProfile.id)] : []
  );
  const { data: userEnrollments } = useCollection('enrollments', 
    userProfile?.role === 'student' ? [where('studentId', '==', userProfile.id)] : []
  );

  // التحقق من وجود اشتراكات نشطة
  const hasActiveSubscriptions = userProfile?.role === 'student' && 
    userSubscriptions?.some(sub => 
      sub.status === 'active' && 
      new Date(sub.expiresAt?.toDate()) > new Date()
    );

  // التحقق من وجود تسجيلات في كورسات
  const hasActiveCourseEnrollments = userProfile?.role === 'student' && 
    userEnrollments?.length > 0;

  // التحقق من وجود أي اشتراك أو تسجيل
  const hasAnyActiveContent = hasActiveSubscriptions || hasActiveCourseEnrollments;

  const menuItems = {
    admin: [
      // قسم المناهج
      { 
        section: 'المناهج التعليمية',
        items: [
          { path: '/admin/curricula', label: 'إدارة المناهج', icon: GraduationCap },
          { path: '/admin/curriculum-groups', label: 'مجموعات المناهج', icon: UsersIcon },
          { path: '/admin/curriculum-progress', label: 'تقدم الطلاب', icon: TrendingUp },
          { path: '/admin/subscriptions', label: 'إدارة الاشتراكات', icon: CreditCard },
        ]
      },
      // قسم الكورسات
      { 
        section: 'الكورسات الفردية',
        items: [
          { path: '/admin/courses', label: 'إدارة الكورسات', icon: BookOpen },
          { path: '/admin/groups', label: 'مجموعات الكورسات', icon: Users },
          { path: '/admin/payments', label: 'المدفوعات', icon: DollarSign },
        ]
      },
      // قسم عام
      { 
        section: 'الإدارة العامة',
        items: [
          { path: '/admin/users', label: 'المستخدمين', icon: UserCheck },
          { path: '/admin/attendance', label: 'نظرة عامة على الحضور', icon: BarChart3 },
          { path: '/admin/chat', label: 'المحادثات', icon: MessageCircle },
        ]
      }
    ],
    trainer: [
      { path: '/trainer/dashboard', label: 'لوحة التحكم', icon: Users },
      { path: '/trainer/attendance', label: 'إدارة الحضور', icon: Calendar }
    ],
    student: hasAnyActiveContent ? [
      // إذا كان لديه اشتراكات أو تسجيلات - يظهر المحتوى الخاص به أولاً
      { path: '/my-curricula', label: 'مناهجي', icon: Star },
      { path: '/my-courses', label: 'كورساتي', icon: Award },
      { path: '/curricula', label: 'المناهج التعليمية', icon: GraduationCap },
      { path: '/courses', label: 'الكورسات الفردية', icon: BookOpen },
    ] : [
      // إذا لم يكن لديه اشتراكات - يظهر المحتوى العام أولاً
      { path: '/curricula', label: 'المناهج التعليمية', icon: GraduationCap },
      { path: '/courses', label: 'الكورسات الفردية', icon: BookOpen },
      { path: '/my-curricula', label: 'مناهجي', icon: Star },
      { path: '/my-courses', label: 'كورساتي', icon: Award },
    ]
  };

  const items = menuItems[userProfile?.role] || [];

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const renderAdminMenu = () => {
    return items.map((section, sectionIndex) => (
      <div key={sectionIndex} className="mb-4 sm:mb-6">
        <div className="px-3 sm:px-4 py-1 sm:py-2 mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {section.section}
          </h3>
        </div>
        <div className="space-y-1">
          {section.items.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full text-right px-3 sm:px-4 py-2 sm:py-3 rounded-lg flex items-center gap-2 sm:gap-3 transition-colors text-sm sm:text-base ${
                  isActive ? 'bg-purple-100 text-purple-900' : 'hover:bg-gray-100'
                }`}
              >
                <Icon size={18} className="flex-shrink-0 sm:hidden" />
                <Icon size={20} className="flex-shrink-0 hidden sm:block" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    ));
  };

  const renderStudentMenu = () => {
    return (
      <>
        <div className="space-y-1 sm:space-y-2">
          {items.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full text-right px-3 sm:px-4 py-2 sm:py-3 rounded-lg flex items-center gap-2 sm:gap-3 transition-colors text-sm sm:text-base ${
                  isActive ? 'bg-purple-100 text-purple-900' : 'hover:bg-gray-100'
                }`}
              >
                <Icon size={18} className="flex-shrink-0 sm:hidden" />
                <Icon size={20} className="flex-shrink-0 hidden sm:block" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* قسم المناهج مقابل الكورسات للطلاب */}
        <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-gray-200">
          <div className="px-3 sm:px-4 py-1 sm:py-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">طرق التعلم</p>
          </div>
          <div className="space-y-1 text-sm">
            <div className={`px-3 sm:px-4 py-2 rounded-lg ${location.pathname === '/curricula' ? 'bg-green-50 text-green-800' : 'text-gray-600'}`}>
              <div className="flex items-center gap-2">
                <GraduationCap size={14} className="flex-shrink-0 sm:hidden" />
                <GraduationCap size={16} className="flex-shrink-0 hidden sm:block" />
                <span className="font-medium">المناهج</span>
              </div>
              <p className="text-xs mt-1 pr-5 sm:pr-6">مسار تعليمي شامل ومنظم</p>
            </div>
            <div className={`px-3 sm:px-4 py-2 rounded-lg ${location.pathname === '/courses' ? 'bg-blue-50 text-blue-800' : 'text-gray-600'}`}>
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="flex-shrink-0 sm:hidden" />
                <BookOpen size={16} className="flex-shrink-0 hidden sm:block" />
                <span className="font-medium">الكورسات</span>
              </div>
              <p className="text-xs mt-1 pr-5 sm:pr-6">كورسات محددة ومنفصلة</p>
            </div>
          </div>

          {/* عرض حالة الاشتراكات */}
          {hasAnyActiveContent && (
            <div className="mt-3 sm:mt-4 px-3 sm:px-4 py-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="text-green-600 flex-shrink-0" size={14} />
                  <span className="text-green-800 font-medium text-xs sm:text-sm">المحتوى النشط</span>
                </div>
                <div className="text-xs text-green-700 space-y-1">
                  {hasActiveSubscriptions && (
                    <p>✓ لديك اشتراكات نشطة في المناهج</p>
                  )}
                  {hasActiveCourseEnrollments && (
                    <p>✓ مسجل في كورسات فردية</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* رسالة للطلاب الجدد */}
          {!hasAnyActiveContent && (
            <div className="mt-3 sm:mt-4 px-3 sm:px-4 py-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="text-blue-600 flex-shrink-0" size={14} />
                  <span className="text-blue-800 font-medium text-xs sm:text-sm">ابدأ رحلتك التعليمية</span>
                </div>
                <p className="text-xs text-blue-700">
                  اختر من المناهج الشاملة أو الكورسات الفردية لبدء التعلم
                </p>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderTrainerMenu = () => {
    return (
      <div className="space-y-1 sm:space-y-2">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
                              className={`w-full text-right px-3 sm:px-4 py-2 sm:py-3 rounded-lg flex items-center gap-2 sm:gap-3 transition-colors text-sm sm:text-base ${
                isActive ? 'bg-purple-100 text-purple-900' : 'hover:bg-gray-100'
              }`}
            >
              <Icon size={18} className="flex-shrink-0 sm:hidden" />
              <Icon size={20} className="flex-shrink-0 hidden sm:block" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <aside className={`
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
      lg:translate-x-0 
      fixed lg:relative 
      top-0 lg:top-auto 
      left-0 lg:left-auto 
      w-64 sm:w-72 lg:w-64 
      bg-white 
      shadow-xl 
      h-screen lg:h-[calc(100vh-64px)] 
      overflow-y-auto 
      transition-transform duration-300 ease-in-out
      z-50 lg:z-auto
      pt-16 lg:pt-0
    `}>
      <nav className="p-3 sm:p-4">
        {userProfile?.role === 'admin' && renderAdminMenu()}
        {userProfile?.role === 'student' && renderStudentMenu()}
        {userProfile?.role === 'trainer' && renderTrainerMenu()}
      </nav>
    </aside>
  );
};

export default Sidebar;