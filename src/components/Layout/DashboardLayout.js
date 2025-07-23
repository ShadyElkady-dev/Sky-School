// src/components/Layout/DashboardLayout.js
import React, { useState, useEffect } from 'react';
import { LogOut, Menu, X, Globe, GraduationCap, Bell, Settings, User, ChevronDown, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import Sidebar from './Sidebar';
import { useCollection } from '../../hooks/useFirestore';
import { where, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const DashboardLayout = ({ children }) => {
  const { userProfile, logout } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    // أولاً، نقوم بتحديث حالة الإشعار في الخلفية
    if (!notification.isRead) {
      updateNotification(notification.id, { isRead: true }).catch(error => {
        console.error("Failed to mark notification as read:", error);
      });
    }
    // ثانياً، ننتقل إلى الرابط المطلوب
    navigate(notification.link);
    // ثالثاً، نغلق قائمة الإشعارات
    setNotificationsOpen(false);
  };

  const markAllAsRead = async () => {
    const promises = unreadNotifications.map(n => 
      updateNotification(n.id, { isRead: true })
    );
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
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
      case 'admin': return 'bg-red-500/20 text-red-100 border-red-300/30';
      case 'trainer': return 'bg-blue-500/20 text-blue-100 border-blue-300/30';
      case 'student': return 'bg-green-500/20 text-green-100 border-green-300/30';
      default: return 'bg-gray-500/20 text-gray-100 border-gray-300/30';
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
        return <CheckCircle className="text-green-500" size={18} />;
      case 'error':
        return <XCircle className="text-red-500" size={18} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={18} />;
      default:
        return <Info className="text-blue-500" size={18} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-gradient-to-r from-purple-900 via-purple-800 to-blue-900 text-white shadow-2xl relative z-50">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
        </div>

        <div className={`relative z-10 px-4 py-3 sm:py-4 flex items-center justify-between transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-[-20px] opacity-0'}`}>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-110"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300">
                <GraduationCap className="text-white" size={24} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  Sky School 
                </h1>
                <p className="text-xs text-white/70 -mt-1">سكاى سكول</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-110 group"
              >
                <Bell size={16} className="sm:hidden" />
                <Bell size={20} className="hidden sm:block" />
                {unreadNotifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 text-xs bg-red-500 rounded-full animate-pulse flex items-center justify-center">
                    {unreadNotifications.length}
                  </div>
                )}
              </button>
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl text-gray-800 z-[100] border border-white/20 max-w-[calc(100vw-2rem)]">
                    <div className="p-3 flex items-center justify-between border-b">
                      <h3 className="text-sm font-semibold">الإشعارات</h3>
                      {unreadNotifications.length > 0 && (
                        <button onClick={markAllAsRead} className="text-xs text-purple-600 hover:underline">
                          تحديد الكل كمقروء
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-3 border-b hover:bg-gray-100 cursor-pointer ${!notification.isRead ? 'bg-purple-50' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-1 flex-shrink-0">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(notification.createdAt)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-600 text-center py-8">لا توجد إشعارات</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={toggleLanguage}
              className="bg-white/10 hover:bg-white/20 px-2 sm:px-3 py-2 rounded-lg sm:rounded-xl flex items-center gap-1 sm:gap-2 transition-all duration-300 hover:scale-105 shadow-lg"
              title={language === 'ar' ? 'English' : 'عربي'}
            >
              <Globe size={14} className="sm:hidden" />
              <Globe size={18} className="hidden sm:block" />
              <span className="text-xs sm:text-sm font-medium">
                {language === 'ar' ? 'EN' : 'AR'}
              </span>
            </button>
            
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 sm:gap-3 bg-white/10 hover:bg-white/20 pl-2 sm:pl-3 pr-2 sm:pr-4 py-2 rounded-lg sm:rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-md sm:rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                  {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
                </div>
                <div className="hidden md:block text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {userProfile?.firstName} {userProfile?.lastName}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${getRoleColor(userProfile?.role)}`}>
                      {getRoleLabel(userProfile?.role)}
                    </span>
                  </div>
                  <p className="text-xs text-white/70 -mt-0.5">{userProfile?.phone}</p>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''} sm:hidden`} />
                <ChevronDown size={16} className={`transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''} hidden sm:block`} />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl text-gray-800 z-[100] border border-white/20 max-w-[calc(100vw-2rem)]">
                    <div className="p-4 border-b border-gray-200/50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-xl flex items-center justify-center text-white font-bold">
                          {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{userProfile?.firstName} {userProfile?.lastName}</p>
                          <p className="text-sm text-gray-600 truncate">{userProfile?.phone}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                         <button
                            onClick={() => {
                                navigate('/profile');
                                setUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                        >
                            <User size={16} />
                            <span className="text-sm">الملف الشخصي</span>
                        </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors duration-200"
                      >
                        <LogOut size={16} />
                        <span className="text-sm">تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </header>

      <div className="flex">
        <div className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className={`flex-1 transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}>
          <div className="p-3 sm:p-6 max-w-7xl mx-auto">
            <div className="min-h-[calc(100vh-120px)] sm:min-h-[calc(100vh-140px)]">
              {children}
            </div>
            <footer className="mt-4 sm:mt-8 py-4 sm:py-6 border-t border-gray-200/50 text-center text-gray-500 text-sm">
              <div className="flex items-center justify-center gap-2 mb-2">
                <GraduationCap size={14} className="sm:hidden" />
                <GraduationCap size={16} className="hidden sm:block" />
                <span className="font-medium text-xs sm:text-sm">Sky School</span>
              </div>
              <p className="text-xs sm:text-sm">سكاى سكول. جميع الحقوق محفوظة</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;