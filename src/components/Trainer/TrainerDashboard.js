// src/components/Trainer/TrainerDashboard.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, MessageCircle, BookOpen, BarChart3, 
  Clock, User, Phone, Mail, TrendingUp, Award, CheckCircle,
  XCircle, Play, AlertCircle, Eye, Edit, Target, GraduationCap,
  FileText, Settings, Plus
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useFirestore';
import { where } from 'firebase/firestore';

const TrainerDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [viewMode, setViewMode] = useState('overview'); // overview, curricula, courses, students
  
  // جلب البيانات
  const { data: courses } = useCollection('courses', [where('trainerId', '==', userProfile.id)]);
  const { data: courseGroups } = useCollection('courseGroups', [where('trainerId', '==', userProfile.id)]);
  const { data: enrollments } = useCollection('enrollments');
  const { data: users } = useCollection('users');
  const { data: attendanceSessions } = useCollection('attendanceSessions', [where('trainerId', '==', userProfile.id)]);
  
  // البيانات الخاصة بالمناهج
  const { data: curricula } = useCollection('curricula');
  const { data: curriculumGroups } = useCollection('curriculumGroups', [where('trainerId', '==', userProfile.id)]);
  const { data: subscriptions } = useCollection('subscriptions');
  const { data: curriculumAttendanceSessions } = useCollection('curriculumAttendanceSessions', [where('trainerId', '==', userProfile.id)]);

  // جلب الطلاب المسجلين في كورسات المدرب
  const getMyStudents = () => {
    const myCourseIds = courses.map(c => c.id);
    const myEnrollments = enrollments.filter(e => myCourseIds.includes(e.courseId));
    const studentIds = myEnrollments.map(e => e.studentId);
    return users.filter(u => studentIds.includes(u.id));
  };

  // جلب طلاب المناهج
  const getCurriculumStudents = () => {
    const allStudentIds = new Set();
    curriculumGroups.forEach(group => {
      group.students?.forEach(studentId => allStudentIds.add(studentId));
    });
    return users.filter(u => allStudentIds.has(u.id));
  };

  // الإحصائيات العامة
  const getQuickStats = () => {
    const myStudents = getMyStudents();
    const totalSessions = attendanceSessions.length;
    
    // إحصائيات المناهج
    const myCurriculumGroups = curriculumGroups.length;
    const curriculumStudents = getCurriculumStudents().length;
    const totalCurriculumSessions = curriculumAttendanceSessions.length;
    
    // آخر جلسة (من الكورسات)
    const lastSession = attendanceSessions.sort((a, b) => {
      const dateA = a.sessionDate?.toDate() || new Date(0);
      const dateB = b.sessionDate?.toDate() || new Date(0);
      return dateB - dateA;
    })[0];

    // إحصائيات الحضور الإجمالية للكورسات
    const totalAttendances = attendanceSessions.reduce((sum, session) => 
      sum + (session.summary?.presentCount || 0), 0
    );
    
    const totalAbsences = attendanceSessions.reduce((sum, session) => 
      sum + (session.summary?.absentCount || 0), 0
    );

    const overallAttendanceRate = (totalAttendances + totalAbsences) > 0 
      ? (totalAttendances / (totalAttendances + totalAbsences)) * 100 
      : 0;

    return {
      // الكورسات
      totalCourses: courses.length,
      totalGroups: courseGroups.length,
      totalStudents: myStudents.length,
      totalSessions,
      lastSession,
      overallAttendanceRate,
      
      // المناهج
      myCurriculumGroups,
      curriculumStudents,
      totalCurriculumSessions,
      
      // المجموع
      totalTeachingUnits: courses.length + myCurriculumGroups,
      totalAllStudents: myStudents.length + curriculumStudents,
      totalAllSessions: totalSessions + totalCurriculumSessions
    };
  };

  const stats = getQuickStats();
  const myStudents = getMyStudents();
  const curriculumStudents = getCurriculumStudents();

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* ترحيب شخصي */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white p-6">
        <h2 className="text-2xl font-bold mb-2">
          مرحباً {userProfile.firstName} {userProfile.lastName}! 👨‍🏫
        </h2>
        <p className="text-purple-100">
          إليك ملخص سريع عن نشاطك التدريبي اليوم
        </p>
      </div>

      {/* الإحصائيات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-xl p-6 text-center">
          <BookOpen className="mx-auto text-blue-600 mb-3" size={32} />
          <p className="text-3xl font-bold text-blue-900">{stats.totalTeachingUnits}</p>
          <p className="text-gray-600">إجمالي وحدات التدريس</p>
          <p className="text-xs text-blue-600 mt-1">{stats.totalCourses} كورس + {stats.myCurriculumGroups} مجموعة منهج</p>
        </div>
        
        <div className="bg-purple-50 rounded-xl p-6 text-center">
          <Users className="mx-auto text-purple-600 mb-3" size={32} />
          <p className="text-3xl font-bold text-purple-900">{stats.totalAllStudents}</p>
          <p className="text-gray-600">إجمالي الطلاب</p>
          <p className="text-xs text-purple-600 mt-1">{stats.totalStudents} كورسات + {stats.curriculumStudents} مناهج</p>
        </div>
        
        <div className="bg-green-50 rounded-xl p-6 text-center">
          <Calendar className="mx-auto text-green-600 mb-3" size={32} />
          <p className="text-3xl font-bold text-green-900">{stats.totalAllSessions}</p>
          <p className="text-gray-600">الجلسات المنفذة</p>
          <p className="text-xs text-green-600 mt-1">{stats.totalSessions} كورسات + {stats.totalCurriculumSessions} مناهج</p>
        </div>
        
        <div className="bg-orange-50 rounded-xl p-6 text-center">
          <TrendingUp className="mx-auto text-orange-600 mb-3" size={32} />
          <p className="text-3xl font-bold text-orange-900">{stats.overallAttendanceRate.toFixed(1)}%</p>
          <p className="text-gray-600">معدل الحضور العام</p>
          <p className="text-xs text-orange-600 mt-1">للكورسات الفردية</p>
        </div>
      </div>

      {/* قسم المناهج التعليمية */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-r-4 border-purple-500">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <GraduationCap className="text-purple-600" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-purple-800">المناهج التعليمية</h3>
              <p className="text-purple-600 text-sm">مسارات تعليمية شاملة ومنظمة</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
              {stats.myCurriculumGroups} مجموعة منهج
            </div>
            <button
              onClick={() => setViewMode('curricula')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              عرض التفاصيل
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <Target className="mx-auto text-purple-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-purple-900">{stats.myCurriculumGroups}</p>
            <p className="text-sm text-gray-600">مجموعات المناهج</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <Users className="mx-auto text-indigo-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-indigo-900">{stats.curriculumStudents}</p>
            <p className="text-sm text-gray-600">طلاب المناهج</p>
          </div>
          <div className="bg-violet-50 rounded-lg p-4 text-center">
            <BarChart3 className="mx-auto text-violet-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-violet-900">{stats.totalCurriculumSessions}</p>
            <p className="text-sm text-gray-600">جلسات المناهج</p>
          </div>
        </div>

        {stats.myCurriculumGroups > 0 && (
          <div className="mt-4 space-y-2">
            {curriculumGroups.slice(0, 2).map(group => {
              const curriculum = curricula.find(c => c.id === group.curriculumId);
              return (
                <div key={group.id} className="bg-purple-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-purple-800">{group.name}</h4>
                    <p className="text-sm text-purple-600">{curriculum?.title}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      group.status === 'active' ? 'bg-green-100 text-green-800' :
                      group.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {group.status === 'active' ? 'مفعلة' :
                       group.status === 'pending' ? 'قيد الإنشاء' : 'غير مفعلة'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{group.students?.length || 0} طالب</p>
                  </div>
                </div>
              );
            })}
            {curriculumGroups.length > 2 && (
              <p className="text-center text-purple-600 text-sm">
                +{curriculumGroups.length - 2} مجموعة أخرى
              </p>
            )}
          </div>
        )}

        {stats.myCurriculumGroups === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Target className="mx-auto mb-2" size={32} />
            <p className="text-sm">لا توجد مجموعات مناهج مخصصة لك حتى الآن</p>
          </div>
        )}
      </div>

      {/* قسم الكورسات الفردية */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-r-4 border-blue-500">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpen className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-blue-800">الكورسات الفردية</h3>
              <p className="text-blue-600 text-sm">كورسات مستقلة ومحددة</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
              {stats.totalCourses} كورس
            </div>
            <button
              onClick={() => setViewMode('courses')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              عرض التفاصيل
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <BookOpen className="mx-auto text-blue-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-blue-900">{stats.totalCourses}</p>
            <p className="text-sm text-gray-600">الكورسات</p>
          </div>
          <div className="bg-cyan-50 rounded-lg p-4 text-center">
            <Users className="mx-auto text-cyan-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-cyan-900">{stats.totalStudents}</p>
            <p className="text-sm text-gray-600">طلاب الكورسات</p>
          </div>
          <div className="bg-sky-50 rounded-lg p-4 text-center">
            <Calendar className="mx-auto text-sky-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-sky-900">{stats.totalSessions}</p>
            <p className="text-sm text-gray-600">جلسات الكورسات</p>
          </div>
        </div>

        {stats.totalCourses > 0 && (
          <div className="mt-4 space-y-2">
            {courses.slice(0, 2).map(course => {
              const courseStudents = myStudents.filter(student => 
                enrollments.some(e => e.courseId === course.id && e.studentId === student.id)
              );
              
              return (
                <div key={course.id} className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-800">{course.title}</h4>
                    <p className="text-sm text-blue-600">{course.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-blue-800">{courseStudents.length} طالب</p>
                    <p className="text-xs text-gray-500">{attendanceSessions.filter(s => s.courseId === course.id).length} جلسة</p>
                  </div>
                </div>
              );
            })}
            {courses.length > 2 && (
              <p className="text-center text-blue-600 text-sm">
                +{courses.length - 2} كورس آخر
              </p>
            )}
          </div>
        )}

        {stats.totalCourses === 0 && (
          <div className="text-center py-6 text-gray-500">
            <BookOpen className="mx-auto mb-2" size={32} />
            <p className="text-sm">لا توجد كورسات مخصصة لك حتى الآن</p>
          </div>
        )}
      </div>

      {/* الإجراءات السريعة */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-6">الإجراءات السريعة</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/trainer/curriculum-attendance')}
            className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors flex flex-col items-center gap-3"
          >
            <Target size={32} />
            <div className="text-center">
              <p className="font-semibold">حضور المناهج</p>
              <p className="text-sm text-purple-100">تسجيل جلسات المناهج</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/trainer/attendance')}
            className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors flex flex-col items-center gap-3"
          >
            <Calendar size={32} />
            <div className="text-center">
              <p className="font-semibold">حضور الكورسات</p>
              <p className="text-sm text-blue-100">تسجيل جلسات الكورسات</p>
            </div>
          </button>
          
          <button
            onClick={() => setViewMode('students')}
            className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors flex flex-col items-center gap-3"
          >
            <Users size={32} />
            <div className="text-center">
              <p className="font-semibold">عرض الطلاب</p>
              <p className="text-sm text-green-100">جميع الطلاب</p>
            </div>
          </button>

          <button
            onClick={() => setViewMode('overview')}
            className="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 transition-colors flex flex-col items-center gap-3"
          >
            <BarChart3 size={32} />
            <div className="text-center">
              <p className="font-semibold">الإحصائيات</p>
              <p className="text-sm text-orange-100">تقارير شاملة</p>
            </div>
          </button>
        </div>
      </div>

      {/* آخر الجلسات */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock size={24} />
          آخر الجلسات
        </h3>
        
        <div className="space-y-4">
          {[...attendanceSessions, ...curriculumAttendanceSessions]
            .sort((a, b) => {
              const dateA = a.sessionDate?.toDate() || new Date(0);
              const dateB = b.sessionDate?.toDate() || new Date(0);
              return dateB - dateA;
            })
            .slice(0, 5)
            .map(session => (
              <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      {session.curriculumName ? (
                        <>
                          <GraduationCap size={16} className="text-purple-600" />
                          <span className="text-purple-800">{session.curriculumName || session.groupName}</span>
                        </>
                      ) : (
                        <>
                          <BookOpen size={16} className="text-blue-600" />
                          <span className="text-blue-800">{session.courseName}</span>
                        </>
                      )}
                      - الجلسة {session.sessionNumber}
                    </h4>
                    <p className="text-gray-600 text-sm">{session.topic}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">
                      {session.sessionDate?.toDate ? new Date(session.sessionDate.toDate()).toLocaleDateString('ar-EG') : ''}
                    </span>
                    <div className="flex gap-2 text-xs mt-1">
                      <span className="text-green-600">✓ {session.summary?.presentCount || 0}</span>
                      <span className="text-red-600">✗ {session.summary?.absentCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          
          {(attendanceSessions.length + curriculumAttendanceSessions.length) === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="mx-auto mb-4" size={48} />
              <p>لم يتم تسجيل أي جلسات حتى الآن</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const CurriculaTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <GraduationCap className="text-purple-600" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-purple-800">مجموعات المناهج</h3>
            <p className="text-purple-600">({curriculumGroups.length} مجموعة)</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/trainer/curriculum-attendance')}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          إدارة الحضور
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {curriculumGroups.map(group => {
          const curriculum = curricula.find(c => c.id === group.curriculumId);
          const groupSessions = curriculumAttendanceSessions.filter(s => s.groupId === group.id);
          
          return (
            <div key={group.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-r-4 border-purple-500">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">{group.name}</h4>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  group.status === 'active' ? 'bg-green-100 text-green-800' :
                  group.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {group.status === 'active' ? 'مفعلة' :
                   group.status === 'pending' ? 'قيد الإنشاء' : 'غير مفعلة'}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">المنهج:</p>
                  <p className="font-medium text-purple-600">{curriculum?.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-purple-600">{group.students?.length || 0}</p>
                    <p className="text-sm text-gray-600">طالب</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-indigo-600">{groupSessions.length}</p>
                    <p className="text-sm text-gray-600">جلسة</p>
                  </div>
                </div>

                {/* الجدولة */}
                {group.schedule && (group.schedule.days?.length > 0 || group.schedule.time) && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <h5 className="font-medium text-purple-800 mb-2">الجدولة:</h5>
                    <div className="text-purple-700 text-sm space-y-1">
                      {group.schedule.days?.length > 0 && (
                        <p><strong>الأيام:</strong> {group.schedule.days.map(day => {
                          const dayNames = {
                            saturday: 'السبت', sunday: 'الأحد', monday: 'الاثنين',
                            tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة'
                          };
                          return dayNames[day];
                        }).join(', ')}</p>
                      )}
                      {group.schedule.time && (
                        <p><strong>الوقت:</strong> {group.schedule.time}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {group.status === 'active' && (
                    <button
                      onClick={() => navigate('/trainer/curriculum-attendance')}
                      className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Calendar size={16} />
                      إدارة الحضور
                    </button>
                  )}
                  
                  <button
                    onClick={() => setViewMode('students')}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Users size={16} />
                    عرض الطلاب
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {curriculumGroups.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Target className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">لا توجد مجموعات مناهج مخصصة لك حتى الآن</p>
          <p className="text-gray-500 mt-2">ستظهر هنا المجموعات التي يتم تخصيصها لك من قبل الإدارة</p>
        </div>
      )}
    </div>
  );

  const CoursesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <BookOpen className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-blue-800">الكورسات الفردية</h3>
            <p className="text-blue-600">({courses.length} كورس)</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/trainer/attendance')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          إدارة الحضور
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => {
          const courseStudents = myStudents.filter(student => 
            enrollments.some(e => e.courseId === course.id && e.studentId === student.id)
          );
          const courseSessions = attendanceSessions.filter(s => s.courseId === course.id);
          
          return (
            <div key={course.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-r-4 border-blue-500">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">{course.title}</h4>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  {course.category}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">وصف الكورس:</p>
                  <p className="text-gray-700 text-sm line-clamp-2">{course.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-blue-600">{courseStudents.length}</p>
                    <p className="text-sm text-gray-600">طالب</p>
                  </div>
                  <div className="bg-cyan-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-cyan-600">{courseSessions.length}</p>
                    <p className="text-sm text-gray-600">جلسة</p>
                  </div>
                </div>

                {/* معلومات إضافية */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-blue-700 text-sm space-y-1">
                    <p><strong>المدة:</strong> {course.duration || 'غير محدد'}</p>
                    <p><strong>السعر:</strong> {course.price ? `${course.price} جنيه` : 'مجاني'}</p>
                    {course.maxStudents && (
                      <p><strong>الحد الأقصى:</strong> {course.maxStudents} طالب</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/trainer/attendance')}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Calendar size={16} />
                    إدارة الحضور
                  </button>
                  
                  <button
                    onClick={() => setViewMode('students')}
                    className="w-full bg-cyan-600 text-white py-2 rounded-lg hover:bg-cyan-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Users size={16} />
                    عرض الطلاب
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {courses.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">لا توجد كورسات مخصصة لك حتى الآن</p>
          <p className="text-gray-500 mt-2">ستظهر هنا الكورسات التي يتم تخصيصها لك من قبل الإدارة</p>
        </div>
      )}
    </div>
  );

  const StudentsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold">طلابي ({myStudents.length + curriculumStudents.length} طالب)</h3>
        <div className="flex gap-4">
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
            <span className="font-semibold">{myStudents.length}</span> طالب كورسات
          </div>
          <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">
            <span className="font-semibold">{curriculumStudents.length}</span> طالب مناهج
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800 text-sm">
          <strong>ملاحظة:</strong> المعلومات الشخصية للطلاب محمية. للتواصل مع أي طالب، يرجى مراسلة الإدارة.
        </p>
      </div>

      {/* طلاب المناهج */}
      {curriculumStudents.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <GraduationCap className="text-purple-600" size={16} />
            </div>
            <h4 className="text-lg font-semibold text-purple-600">طلاب المناهج ({curriculumStudents.length})</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {curriculumStudents.map(student => {
              // البحث عن المجموعات التي ينتمي إليها الطالب
              const studentGroups = curriculumGroups.filter(group => 
                group.students?.includes(student.id)
              );
              
              return (
                <div key={student.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-l-4 border-purple-500">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-purple-600">
                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{student.firstName} {student.lastName}</h4>
                      <p className="text-sm text-gray-600">{student.phone}</p>
                      {student.email && (
                        <p className="text-xs text-gray-500">{student.email}</p>
                      )}
                    </div>
                  </div>

                  {/* المجموعات المنتمي إليها */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">المجموعات:</p>
                      <div className="space-y-1">
                        {studentGroups.map(group => {
                          const curriculum = curricula.find(c => c.id === group.curriculumId);
                          return (
                            <div key={group.id} className="text-xs bg-purple-50 text-purple-800 px-2 py-1 rounded">
                              <div className="font-semibold">{group.name}</div>
                              <div className="text-purple-600">{curriculum?.title}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* أزرار التفاعل */}
                  <div className="space-y-2">
                    <div className="w-full bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-center flex items-center justify-center gap-2">
                      <MessageCircle size={16} />
                      للتواصل: راسل الإدارة
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500">المعلومات الشخصية محمية</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* طلاب الكورسات */}
      {myStudents.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpen className="text-blue-600" size={16} />
            </div>
            <h4 className="text-lg font-semibold text-blue-600">طلاب الكورسات ({myStudents.length})</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myStudents.map(student => {
              const studentCourses = courses.filter(course =>
                enrollments.some(e => e.courseId === course.id && e.studentId === student.id)
              );
              
              // حساب إحصائيات الحضور
              const studentSessions = attendanceSessions.filter(session => 
                session.attendance?.some(att => att.studentId === student.id)
              );
              
              const presentCount = studentSessions.filter(session =>
                session.attendance?.find(att => att.studentId === student.id)?.status === 'present'
              ).length;

              const totalSessions = studentSessions.length;
              const attendanceRate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;
              
              return (
                <div key={student.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-l-4 border-blue-500">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-blue-600">
                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{student.firstName} {student.lastName}</h4>
                      <p className="text-sm text-gray-600">{student.phone}</p>
                      {student.email && (
                        <p className="text-xs text-gray-500">{student.email}</p>
                      )}
                    </div>
                  </div>

                  {/* إحصائيات الطالب */}
                  <div className="space-y-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between text-sm">
                        <span>معدل الحضور:</span>
                        <span className={`font-semibold ${
                          attendanceRate >= 80 ? 'text-green-600' :
                          attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {attendanceRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>الجلسات:</span>
                        <span>{presentCount}/{totalSessions}</span>
                      </div>
                    </div>

                    {/* الكورسات المسجل فيها */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">الكورسات:</p>
                      <div className="space-y-1">
                        {studentCourses.map(course => (
                          <div key={course.id} className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded">
                            {course.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* أزرار التفاعل */}
                  <div className="space-y-2">
                    <div className="w-full bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-center flex items-center justify-center gap-2">
                      <MessageCircle size={16} />
                      للتواصل: راسل الإدارة
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500">المعلومات الشخصية محمية</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {myStudents.length === 0 && curriculumStudents.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">لا يوجد طلاب مسجلين في كورساتك أو مجموعاتك حتى الآن</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">لوحة تحكم المدرب</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'overview' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            نظرة عامة
          </button>
          
          <button
            onClick={() => setViewMode('curricula')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              viewMode === 'curricula' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <GraduationCap size={18} />
            المناهج
          </button>

          <button
            onClick={() => setViewMode('courses')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              viewMode === 'courses' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BookOpen size={18} />
            الكورسات
          </button>

          <button
            onClick={() => setViewMode('students')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'students' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            الطلاب
          </button>
        </div>
      </div>

      {/* المحتوى */}
      {viewMode === 'overview' && <OverviewTab />}
      {viewMode === 'curricula' && <CurriculaTab />}
      {viewMode === 'courses' && <CoursesTab />}
      {viewMode === 'students' && <StudentsTab />}
    </div>
  );
};

export default TrainerDashboard;