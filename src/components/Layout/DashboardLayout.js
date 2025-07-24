// src/components/Layout/DashboardLayout.js
import React, { useState, useEffect } from 'react';
import { LogOut, Menu, X, Globe, GraduationCap, Bell, User, ChevronDown, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import Sidebar from './Sidebar';
import { useCollection } from '../../hooks/useFirestore';
import { where, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const DashboardLayout = ({ children }) => {
  const { userProfile, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // جلب الإشعارات الخاصة بالمستخدم الحالي
  const { data: notifications, update: updateNotification } = useCollection(
    'notifications',
    userProfile ? [where('userId', '==', userProfile.id), orderBy('createdAt', 'desc')] : []
  );

  const unreadNotifications = notifications.filter(n => !n.isRead);

  useEffect(() => {
    setMounted(true);
  }, []);

  // إغلاق جميع النوافذ المنبثقة
  const closeAllPopups = () => {
    setNotificationsOpen(false);
    setUserMenuOpen(false);
  };

  // إغلاق النوافذ المنبثقة عند تغيير حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      closeAllPopups();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // منع التمرير في الخلفية عند فتح النوافذ المنبثقة
  useEffect(() => {
    if (notificationsOpen || userMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [notificationsOpen, userMenuOpen]);

  const handleLogout = async () => {
    closeAllPopups();
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await updateNotification(notification.id, { isRead: true });
      }
      closeAllPopups();
      if (notification.link) {
        navigate(notification.link);
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const promises = unreadNotifications.map(n => 
        updateNotification(n.id, { isRead: true })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleProfileNavigation = () => {
    closeAllPopups();
    navigate('/profile');
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'مدير';
      case 'trainer': return 'مدرب';
      case 'student': return 'طالب';
      default: return 'مستخدم';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-600 border-red-300/30';
      case 'trainer': return 'bg-blue-500/20 text-blue-600 border-blue-300/30';
      case 'student': return 'bg-green-500/20 text-green-600 border-green-300/30';
      default: return 'bg-gray-500/20 text-gray-600 border-gray-300/30';
    }
  };
  
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return `منذ ${Math.floor(interval)} سنة`;
    interval = seconds / 2592000;
    if (interval > 1) return `منذ ${Math.floor(interval)} شهر`;
    interval = seconds / 86400;
    if (interval > 1) return `منذ ${Math.floor(interval)} يوم`;
    interval = seconds / 3600;
    if (interval > 1) return `منذ ${Math.floor(interval)} ساعة`;
    interval = seconds / 60;
    if (interval > 1) return `منذ ${Math.floor(interval)} دقيقة`;
    return 'الآن';
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'error':
        return <XCircle className="text-red-500" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={16} />;
      default:
        return <Info className="text-blue-500" size={16} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-x-hidden">
      <header className="bg-gradient-to-r from-purple-900 via-purple-800 to-blue-900 text-white shadow-2xl relative z-50">
        {/* خلفية متحركة */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
        </div>

        <div className={`relative z-10 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-[-20px] opacity-0'}`}>
          <div className="flex items-center justify-between max-w-full">
            
            {/* الجانب الأيسر - Logo و Menu */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-110 flex-shrink-0"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <GraduationCap size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 hidden xs:block">
                  <h1 className="text-sm sm:text-lg md:text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent whitespace-nowrap">
                    Sky School 
                  </h1>
                  <p className="text-xs text-white/70 -mt-1 whitespace-nowrap">سكاى سكول</p>
                </div>
              </div>
            </div>
            
            {/* الجانب الأيمن - الأدوات */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              
              {/* الإشعارات */}
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setUserMenuOpen(false);
                }}
                className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-110 flex-shrink-0"
              >
                <Bell size={18} />
                {unreadNotifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-xs bg-red-500 rounded-full animate-pulse flex items-center justify-center font-medium px-1">
                    {unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}
                  </div>
                )}
              </button>
              
              {/* تبديل اللغة */}
              <button
                onClick={toggleLanguage}
                className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 hover:scale-105 shadow-lg flex-shrink-0"
              >
                <Globe size={16} />
                <span className="text-xs font-medium hidden sm:inline">
                  {language === 'ar' ? 'EN' : 'AR'}
                </span>
              </button>
              
              {/* قائمة المستخدم */}
              <button
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 pl-2 pr-3 py-2 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg min-w-0"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
                </div>
                
                {/* معلومات المستخدم - مخفية على الشاشات الصغيرة */}
                <div className="hidden md:flex items-center gap-2 min-w-0 max-w-[120px] lg:max-w-[160px]">
                  <div className="min-w-0">
                    <span className="text-sm font-medium truncate block">
                      {userProfile?.firstName}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border whitespace-nowrap ${getRoleColor(userProfile?.role)}`}>
                      {getRoleLabel(userProfile?.role)}
                    </span>
                  </div>
                </div>
                
                <ChevronDown size={14} className={`transition-transform duration-300 flex-shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        
        {/* خط مضيء في الأسفل */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </header>

      {/* نافذة الإشعارات المنبثقة */}
      {notificationsOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]" 
            onClick={closeAllPopups}
          />
          
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[9999] transform transition-transform duration-300 ease-out animate-slide-in-right">
            {/* رأس النافذة */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <div className="flex items-center gap-3">
                <Bell size={20} />
                <h3 className="font-semibold text-lg">الإشعارات</h3>
                {unreadNotifications.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {unreadNotifications.length}
                  </span>
                )}
              </div>
              <button 
                onClick={closeAllPopups}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* شريط الأدوات */}
            {unreadNotifications.length > 0 && (
              <div className="p-4 bg-gray-50 border-b">
                <button 
                  onClick={markAllAsRead}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"
                >
                  تحديد الكل كمقروء ({unreadNotifications.length})
                </button>
              </div>
            )}

            {/* محتوى الإشعارات */}
            <div className="flex-1 overflow-y-auto h-[calc(100vh-120px)]">
              {notifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.isRead ? 'bg-purple-50 border-r-4 border-purple-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 leading-relaxed mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                            {!notification.isRead && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                جديد
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Bell className="text-gray-400" size={32} />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">لا توجد إشعارات</h4>
                  <p className="text-gray-600">ستظهر الإشعارات الجديدة هنا</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* نافذة قائمة المستخدم المنبثقة */}
      {userMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]" 
            onClick={closeAllPopups}
          />
          
          <div className="fixed top-0 right-0 h-full w-full max-w-xs bg-white shadow-2xl z-[9999] transform transition-transform duration-300 ease-out animate-slide-in-right">
            {/* رأس النافذة - معلومات المستخدم */}
            <div className="p-6 bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">الملف الشخصي</h3>
                <button 
                  onClick={closeAllPopups}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-white/20 to-white/10 rounded-2xl flex items-center justify-center text-white font-bold text-xl border-2 border-white/20">
                  {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-lg truncate">
                    {userProfile?.firstName} {userProfile?.lastName}
                  </h4>
                  <p className="text-white/80 text-sm truncate">
                    {userProfile?.phone}
                  </p>
                  <div className="mt-2">
                    <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-medium border border-white/30">
                      {getRoleLabel(userProfile?.role)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* قائمة الخيارات */}
            <div className="p-4 space-y-2">
              <button
                onClick={handleProfileNavigation}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <User className="text-blue-600" size={20} />
                </div>
                <div className="text-right flex-1">
                  <div className="font-medium text-gray-900">الملف الشخصي</div>
                  <div className="text-sm text-gray-500">عرض وتعديل البيانات</div>
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <LogOut className="text-red-600" size={20} />
                </div>
                <div className="text-right flex-1">
                  <div className="font-medium text-red-600">تسجيل الخروج</div>
                  <div className="text-sm text-red-400">إنهاء الجلسة الحالية</div>
                </div>
              </button>
            </div>

            {/* معلومات إضافية */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <GraduationCap size={16} className="text-purple-600" />
                  <span className="font-medium text-sm text-gray-700">Sky School</span>
                </div>
                <p className="text-xs text-gray-500">سكاى سكول - منصة التعليم الذكية</p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex">
        {/* خلفية الـ Sidebar على الموبايل */}
        <div 
          className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
            sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`} 
          onClick={() => setSidebarOpen(false)} 
        />
        
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 transition-transform duration-300 lg:mr-64 rtl:lg:mr-0 rtl:lg:ml-64">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="min-h-[calc(100vh-120px)] sm:min-h-[calc(100vh-140px)] lg:min-h-[calc(100vh-160px)]">
              {children}
            </div>
            
            {/* Footer */}
            <footer className="mt-8 py-6 border-t border-gray-200/50 text-center text-gray-500">
              <div className="flex items-center justify-center gap-2 mb-2">
                <GraduationCap size={16} />
                <span className="font-medium">Sky School</span>
              </div>
              <p className="text-sm">سكاى سكول. جميع الحقوق محفوظة</p>
            </footer>
          </div>
        </main>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;