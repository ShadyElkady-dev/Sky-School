// src/components/Layout/DashboardLayout.js
import React, { useState, useEffect, useRef } from 'react';
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
  
  // مراجع للنوافذ المنبثقة
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const [notificationPosition, setNotificationPosition] = useState('right');
  const [userMenuPosition, setUserMenuPosition] = useState('right');

  // جلب الإشعارات الخاصة بالمستخدم الحالي
  const { data: notifications, update: updateNotification } = useCollection(
    'notifications',
    userProfile ? [where('userId', '==', userProfile.id), orderBy('createdAt', 'desc')] : []
  );

  const unreadNotifications = notifications.filter(n => !n.isRead);

  useEffect(() => {
    setMounted(true);
  }, []);

  // تحديد موضع النوافذ المنبثقة بناءً على حجم الشاشة
  useEffect(() => {
    const updatePopupPositions = () => {
      if (notificationRef.current && notificationsOpen) {
        const rect = notificationRef.current.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const popupWidth = 320; // عرض نافذة الإشعارات
        
        // حساب المساحة المتاحة من اليمين واليسار
        const spaceOnRight = windowWidth - rect.right;
        const spaceOnLeft = rect.left;
        
        // إذا لم تكن هناك مساحة كافية على اليمين
        if (spaceOnRight < popupWidth + 10) {
          // التحقق من وجود مساحة كافية على اليسار
          if (spaceOnLeft >= popupWidth + 10) {
            setNotificationPosition('left');
          } else {
            // إذا لم تكن هناك مساحة كافية على الجانبين، وضعها في المنتصف
            setNotificationPosition('center');
          }
        } else {
          setNotificationPosition('right');
        }
      }

      if (userMenuRef.current && userMenuOpen) {
        const rect = userMenuRef.current.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const popupWidth = 288; // عرض قائمة المستخدم
        
        // حساب المساحة المتاحة من اليمين واليسار
        const spaceOnRight = windowWidth - rect.right;
        const spaceOnLeft = rect.left;
        
        // إذا لم تكن هناك مساحة كافية على اليمين
        if (spaceOnRight < popupWidth + 10) {
          // التحقق من وجود مساحة كافية على اليسار
          if (spaceOnLeft >= popupWidth + 10) {
            setUserMenuPosition('left');
          } else {
            // إذا لم تكن هناك مساحة كافية على الجانبين، وضعها في المنتصف
            setUserMenuPosition('center');
          }
        } else {
          setUserMenuPosition('right');
        }
      }
    };

    updatePopupPositions();
    window.addEventListener('resize', updatePopupPositions);
    window.addEventListener('scroll', updatePopupPositions);
    return () => {
      window.removeEventListener('resize', updatePopupPositions);
      window.removeEventListener('scroll', updatePopupPositions);
    };
  }, [notificationsOpen, userMenuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      updateNotification(notification.id, { isRead: true }).catch(error => {
        console.error("Failed to mark notification as read:", error);
      });
    }
    navigate(notification.link);
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
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
        </div>

        <div className={`relative z-10 px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-[-20px] opacity-0'}`}>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-110"
            >
              {sidebarOpen ? <X size={18} className="sm:w-5 sm:h-5" /> : <Menu size={18} className="sm:w-5 sm:h-5" />}
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300">
                <GraduationCap size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div className="hidden xs:block">
                <h1 className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  Sky School 
                </h1>
                <p className="text-[10px] sm:text-xs text-white/70 -mt-1">سكاى سكول</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-110"
              >
                <Bell size={16} className="sm:w-[18px] sm:h-[18px]" />
                {unreadNotifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[10px] sm:text-xs bg-red-500 rounded-full animate-pulse flex items-center justify-center font-medium">
                    {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                  </div>
                )}
              </button>
              
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setNotificationsOpen(false)} />
                  <div className={`fixed sm:absolute top-[60px] sm:top-full mt-0 sm:mt-2 
                    ${notificationPosition === 'right' ? 'right-2 sm:right-0' : notificationPosition === 'left' ? 'left-2 sm:left-0' : 'left-1/2 sm:left-auto sm:right-0 -translate-x-1/2 sm:translate-x-0'}
                    w-[calc(100vw-16px)] xs:w-80 max-w-[250px] bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl text-gray-800 z-[100] border border-gray-200/50 max-h-[calc(100vh-80px)] sm:max-h-[65vh] flex flex-col
                    ${notificationPosition === 'left' ? 'sm:right-auto' : ''}`}>
                    <div className="p-3 sm:p-4 flex items-center justify-between border-b border-gray-200/50 flex-shrink-0">
                      <h3 className="text-sm sm:text-base font-semibold">الإشعارات</h3>
                      {unreadNotifications.length > 0 && (
                        <button onClick={markAllAsRead} className="text-xs sm:text-sm text-purple-600 hover:text-purple-800 hover:underline transition-colors px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                          تحديد الكل كمقروء
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto flex-1 overscroll-contain">
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.isRead ? 'bg-purple-50' : ''}`}
                          >
                            <div className="flex items-start gap-2 sm:gap-3">
                              <div className="mt-0.5 sm:mt-1 flex-shrink-0">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm sm:text-base leading-relaxed break-words">{notification.message}</p>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">{formatTimeAgo(notification.createdAt)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 sm:py-10">
                          <Bell className="mx-auto text-gray-300 mb-2 sm:mb-3" size={24} />
                          <p className="text-sm sm:text-base text-gray-600">لا توجد إشعارات</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={toggleLanguage}
              className="bg-white/10 hover:bg-white/20 px-2 py-1.5 sm:py-2 rounded-lg flex items-center gap-1 transition-all duration-300 hover:scale-105 shadow-lg"
            >
              <Globe size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium">
                {language === 'ar' ? 'EN' : 'AR'}
              </span>
            </button>
            
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 pl-1 pr-2 py-1.5 sm:py-2 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-purple-400 to-blue-400 rounded-md flex items-center justify-center text-white font-bold text-[10px] sm:text-xs flex-shrink-0">
                  {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
                </div>
                <div className="hidden md:block text-right min-w-0 ml-1">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-xs sm:text-sm font-medium truncate max-w-[80px] lg:max-w-[100px]">
                      {userProfile?.firstName}
                    </span>
                    <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs border whitespace-nowrap ${getRoleColor(userProfile?.role)}`}>
                      {getRoleLabel(userProfile?.role)}
                    </span>
                  </div>
                </div>
                <ChevronDown size={12} className={`sm:w-[14px] sm:h-[14px] transition-transform duration-300 flex-shrink-0 ml-0.5 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setUserMenuOpen(false)} />
                  <div className={`fixed sm:absolute top-[60px] sm:top-full mt-0 sm:mt-2 
                    ${userMenuPosition === 'right' ? 'right-2 sm:right-0' : userMenuPosition === 'left' ? 'left-2 sm:left-0' : 'left-1/2 sm:left-auto sm:right-0 -translate-x-1/2 sm:translate-x-0'}
                    w-[calc(100vw-16px)] xs:w-72 max-w-[288px] bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl text-gray-800 z-[100] border border-gray-200/50
                    ${userMenuPosition === 'left' ? 'sm:right-auto' : ''}`}>
                    <div className="p-3 sm:p-4 border-b border-gray-200/50">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
                          {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm sm:text-base truncate">{userProfile?.firstName} {userProfile?.lastName}</p>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">{userProfile?.phone}</p>
                          <div className="mt-1.5 sm:mt-2">
                            <span className={`px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border ${getRoleColor(userProfile?.role)}`}>
                              {getRoleLabel(userProfile?.role)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 sm:p-3">
                      <button
                        onClick={() => {
                          navigate('/profile');
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-sm sm:text-base"
                      >
                        <User size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                        <span>الملف الشخصي</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors duration-200 text-sm sm:text-base"
                      >
                        <LogOut size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                        <span>تسجيل الخروج</span>
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
        <main className="flex-1 transition-transform duration-300 lg:mr-64 rtl:lg:mr-0 rtl:lg:ml-64">
          <div className="p-2 sm:p-4 md:p-6">
            <div className="min-h-[calc(100vh-100px)] sm:min-h-[calc(100vh-120px)] md:min-h-[calc(100vh-140px)]">
              {children}
            </div>
            <footer className="mt-4 sm:mt-6 md:mt-8 py-3 sm:py-4 md:py-6 border-t border-gray-200/50 text-center text-gray-500">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <GraduationCap size={14} className="sm:w-4 sm:h-4" />
                <span className="font-medium text-xs sm:text-sm">Sky School</span>
              </div>
              <p className="text-[10px] sm:text-xs">سكاى سكول. جميع الحقوق محفوظة</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;