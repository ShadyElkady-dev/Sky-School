// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LanguageProvider } from './contexts/LanguageContext';
import { useCollection } from './hooks/useFirestore'; // <-- إضافة
import { where } from 'firebase/firestore'; // <-- إضافة

// Auth Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

// Layout
import DashboardLayout from './components/Layout/DashboardLayout';

// Admin Components
import CoursesManagement from './components/Admin/CoursesManagement';
import GroupsManagement from './components/Admin/GroupsManagement';
import PaymentsManagement from './components/Admin/PaymentsManagement';
import UsersManagement from './components/Admin/UsersManagement';
import AdminChat from './components/Admin/AdminChat';
import AttendanceOverview from './components/Admin/AttendanceOverview';
import CurriculaManagement from './components/Admin/CurriculaManagement';
import SubscriptionsManagement from './components/Admin/SubscriptionsManagement';

// المكونات الجديدة للمناهج
import CurriculumGroupsManagement from './components/Admin/CurriculumGroupsManagement';
import CurriculumProgressManagement from './components/Admin/CurriculumProgressManagement';

// Trainer Components
import TrainerDashboard from './components/Trainer/TrainerDashboard';
import AttendanceManagement from './components/Trainer/AttendanceManagement';
import CurriculumAttendanceManagement from './components/Trainer/CurriculumAttendanceManagement';

// Student Components
import AvailableCourses from './components/Student/AvailableCourses';
import CourseDetails from './components/Student/CourseDetails';
import MyCourses from './components/Student/MyCourses';
import StudentCurricula from './components/Student/StudentCurricula';
import CurriculumSubscription from './components/Student/CurriculumSubscription';
import StudentCurriculumPage from './components/Student/StudentCurriculumPage';
import MyCurricula from './components/Student/MyCurricula';
import ProfileSettings from './components/Student/ProfileSettings'; // <-- أضف هذا السطر

// Simple Error Boundary
class SimpleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">خطأ في التطبيق</h2>
            <p className="text-gray-600 mb-4">حدث خطأ غير متوقع</p>
            <div className="bg-gray-100 p-4 rounded mb-4 text-sm text-left">
              {this.state.error?.message || 'Unknown error'}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              إعادة تحميل
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { userProfile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">جاري التحميل...</div>
        </div>
      </div>
    );
  }
  
  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/" replace />;
  }
  
  return <DashboardLayout>{children}</DashboardLayout>;
};

// Auth Container Component
const AuthContainer = () => {
  const [authView, setAuthView] = useState('login');
  const { userProfile } = useAuth();
  
  if (userProfile) {
    // <-- التعديل: توجيه كل الأدوار إلى مسار مخصص بعد تسجيل الدخول -->
    const redirectPath = {
      admin: '/admin/curricula',
      trainer: '/trainer/dashboard',
      student: '/student/home' // <-- توجيه الطالب إلى صفحة التحقق
    };
    return <Navigate to={redirectPath[userProfile.role] || '/'} replace />;
  }
  
  return authView === 'login' ? (
    <Login onSwitchToRegister={() => setAuthView('register')} />
  ) : (
    <Register onSwitchToLogin={() => setAuthView('login')} />
  );
};

// <-- التعديل الجديد: مكون لتوجيه الطالب بذكاء -->
const StudentHomeRedirect = () => {
  const { userProfile } = useAuth();
  
  // جلب الاشتراكات والكورسات لتحديد الوجهة
  const { data: subscriptions, loading: subscriptionsLoading } = useCollection('subscriptions', [where('studentId', '==', userProfile.id), where('status', '==', 'active')]);
  const { data: enrollments, loading: enrollmentsLoading } = useCollection('enrollments', [where('studentId', '==', userProfile.id)]);

  if (subscriptionsLoading || enrollmentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">جاري التحقق من اشتراكاتك...</div>
        </div>
      </div>
    );
  }

  // إذا كان لدى الطالب أي اشتراك نشط أو تسجيل في كورس، يتم توجيهه إلى "مناهجي"
  if (subscriptions.length > 0 || enrollments.length > 0) {
    return <Navigate to="/my-curricula" replace />;
  }
  
  // إذا لم يكن لديه شيء، يتم توجيهه لصفحة التصفح
  return <Navigate to="/curricula" replace />;
};

function App() {
  return (
    <SimpleErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={<AuthContainer />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* Admin Routes - المناهج */}
              <Route
                path="/admin/curricula"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <CurriculaManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/curriculum-groups"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <CurriculumGroupsManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/curriculum-progress"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <CurriculumProgressManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/subscriptions"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SubscriptionsManagement />
                  </ProtectedRoute>
                }
              />
              
              {/* Admin Routes - الكورسات */}
              <Route
                path="/admin/courses"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <CoursesManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/groups"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <GroupsManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/payments"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <PaymentsManagement />
                  </ProtectedRoute>
                }
              />
              
              {/* Admin Routes - عام */}
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <UsersManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/chat"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminChat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/attendance"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AttendanceOverview />
                  </ProtectedRoute>
                }
              />
              
              {/* Trainer Routes */}
              <Route
                path="/trainer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['trainer']}>
                    <TrainerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trainer/attendance"
                element={
                  <ProtectedRoute allowedRoles={['trainer']}>
                    <AttendanceManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trainer/curriculum-attendance"
                element={
                  <ProtectedRoute allowedRoles={['trainer']}>
                    <CurriculumAttendanceManagement />
                  </ProtectedRoute>
                }
              />
              
              {/* Student Routes - المناهج */}
              <Route
                path="/curricula"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentCurricula />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-curricula"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <MyCurricula />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/curriculum/:id"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentCurriculumPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/curriculum/:id/subscribe"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <CurriculumSubscription />
                  </ProtectedRoute>
                }
              />
              
              {/* Student Routes - الكورسات */}
              <Route
                path="/courses"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <AvailableCourses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/:id"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <CourseDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-courses"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <MyCourses />
                  </ProtectedRoute>
                }
              />
              {/* <-- الكود الجديد لإضافته --> */}
<Route
    path="/profile"
    element={
        <ProtectedRoute allowedRoles={['student', 'admin', 'trainer']}>
        <ProfileSettings />
        </ProtectedRoute>
    }
/>

              {/* <-- التعديل الجديد: مسار مخصص للطالب --> */}
              <Route
                path="/student/home"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentHomeRedirect />
                  </ProtectedRoute>
                }
              />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </SimpleErrorBoundary>
  );
}

export default App;