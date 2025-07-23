// src/components/Admin/AttendanceOverview.js
import React, { useState } from 'react';
import { 
  TrendingDown, TrendingUp, Users, Calendar, 
  Download, Search, CheckCircle, XCircle, Clock,
  BarChart3, AlertTriangle, Award, BookOpen, GraduationCap,
  Target, Filter, Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import { useCollection } from '../../hooks/useFirestore';
import { orderBy } from 'firebase/firestore';

const AttendanceOverview = () => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [selectedCurriculumGroup, setSelectedCurriculumGroup] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // overview, courses, curricula, statistics
  const [attendanceType, setAttendanceType] = useState('both'); // both, courses, curricula

  // جلب البيانات - الكورسات
  const { data: courses } = useCollection('courses');
  const { data: users } = useCollection('users');
  const { data: courseGroups } = useCollection('courseGroups');
  const { data: attendanceSessions } = useCollection('attendanceSessions', [orderBy('sessionDate', 'desc')]);

  // جلب البيانات - المناهج
  const { data: curricula } = useCollection('curricula');
  const { data: curriculumGroups } = useCollection('curriculumGroups');
  const { data: curriculumAttendanceSessions } = useCollection('curriculumAttendanceSessions', [orderBy('sessionDate', 'desc')]);

  const students = users.filter(u => u.role === 'student');

  // إحصائيات الكورسات
  const getCourseStats = () => {
    const totalCourseSessions = attendanceSessions.length;
    const totalCourseAttendances = attendanceSessions.reduce((sum, session) => 
      sum + (session.summary?.presentCount || 0), 0
    );
    const totalCourseAbsences = attendanceSessions.reduce((sum, session) => 
      sum + (session.summary?.absentCount || 0), 0
    );
    const overallCourseAttendanceRate = (totalCourseAttendances + totalCourseAbsences) > 0 
      ? (totalCourseAttendances / (totalCourseAttendances + totalCourseAbsences)) * 100 
      : 0;

    return {
      totalSessions: totalCourseSessions,
      totalAttendances: totalCourseAttendances,
      totalAbsences: totalCourseAbsences,
      attendanceRate: overallCourseAttendanceRate,
      activeCourses: courses.length,
      activeGroups: courseGroups.length
    };
  };

  // إحصائيات المناهج
  const getCurriculumStats = () => {
    const totalCurriculumSessions = curriculumAttendanceSessions.length;
    const totalCurriculumAttendances = curriculumAttendanceSessions.reduce((sum, session) => 
      sum + (session.summary?.presentCount || 0), 0
    );
    const totalCurriculumAbsences = curriculumAttendanceSessions.reduce((sum, session) => 
      sum + (session.summary?.absentCount || 0), 0
    );
    const overallCurriculumAttendanceRate = (totalCurriculumAttendances + totalCurriculumAbsences) > 0 
      ? (totalCurriculumAttendances / (totalCurriculumAttendances + totalCurriculumAbsences)) * 100 
      : 0;

    return {
      totalSessions: totalCurriculumSessions,
      totalAttendances: totalCurriculumAttendances,
      totalAbsences: totalCurriculumAbsences,
      attendanceRate: overallCurriculumAttendanceRate,
      activeCurricula: curricula.length,
      activeGroups: curriculumGroups.length
    };
  };

  // جلب الطلاب المجمعين لكورس معين مع إحصائياتهم
  const getCourseStudentsWithStats = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return [];

    const sessions = attendanceSessions.filter(s => s.courseId === courseId);
    const courseStudents = students.filter(s => 
      sessions.some(session => session.attendance?.some(att => att.studentId === s.id))
    );

    return courseStudents.map(student => {
      const studentAttendance = sessions.map(session => {
        const attendance = session.attendance?.find(att => att.studentId === student.id);
        return {
          sessionId: session.id,
          sessionNumber: session.sessionNumber,
          sessionDate: session.sessionDate,
          topic: session.topic,
          status: attendance?.status || 'absent'
        };
      });

      const presentCount = studentAttendance.filter(att => att.status === 'present').length;
      const lateCount = studentAttendance.filter(att => att.status === 'late').length;
      const absentCount = studentAttendance.filter(att => att.status === 'absent').length;
      const attendanceRate = sessions.length > 0 ? (presentCount / sessions.length) * 100 : 0;

      return {
        student,
        sessions: studentAttendance,
        stats: {
          presentCount,
          lateCount,
          absentCount,
          totalSessions: sessions.length,
          attendanceRate
        }
      };
    }).sort((a, b) => b.stats.attendanceRate - a.stats.attendanceRate);
  };

  // جلب طلاب المجموعة للمناهج مع إحصائياتهم
  const getCurriculumGroupStudentsWithStats = (groupId) => {
    const group = curriculumGroups.find(g => g.id === groupId);
    if (!group) return [];

    const sessions = curriculumAttendanceSessions.filter(s => s.groupId === groupId);
    const groupStudents = students.filter(s => group.students?.includes(s.id));

    return groupStudents.map(student => {
      const studentAttendance = sessions.map(session => {
        const attendance = session.attendance?.find(att => att.studentId === student.id);
        return {
          sessionId: session.id,
          sessionNumber: session.sessionNumber,
          sessionDate: session.sessionDate,
          topic: session.topic,
          status: attendance?.status || 'absent'
        };
      });

      const presentCount = studentAttendance.filter(att => att.status === 'present').length;
      const lateCount = studentAttendance.filter(att => att.status === 'late').length;
      const absentCount = studentAttendance.filter(att => att.status === 'absent').length;
      const attendanceRate = sessions.length > 0 ? (presentCount / sessions.length) * 100 : 0;

      return {
        student,
        sessions: studentAttendance,
        stats: {
          presentCount,
          lateCount,
          absentCount,
          totalSessions: sessions.length,
          attendanceRate
        }
      };
    }).sort((a, b) => b.stats.attendanceRate - a.stats.attendanceRate);
  };

  const courseStats = getCourseStats();
  const curriculumStats = getCurriculumStats();

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* الإحصائيات الإجمالية */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-indigo-50 rounded-xl p-4 text-center">
          <BarChart3 className="mx-auto text-indigo-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-indigo-900">
            {courseStats.totalSessions + curriculumStats.totalSessions}
          </p>
          <p className="text-gray-600 text-sm">إجمالي الجلسات</p>
        </div>
        
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <CheckCircle className="mx-auto text-green-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-green-900">
            {courseStats.totalAttendances + curriculumStats.totalAttendances}
          </p>
          <p className="text-gray-600 text-sm">إجمالي الحضور</p>
        </div>
        
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <XCircle className="mx-auto text-red-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-red-900">
            {courseStats.totalAbsences + curriculumStats.totalAbsences}
          </p>
          <p className="text-gray-600 text-sm">إجمالي الغياب</p>
        </div>
        
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <TrendingUp className="mx-auto text-blue-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-blue-900">
            {(((courseStats.totalAttendances + curriculumStats.totalAttendances) / 
              (courseStats.totalAttendances + curriculumStats.totalAttendances + 
               courseStats.totalAbsences + curriculumStats.totalAbsences)) * 100 || 0).toFixed(1)}%
          </p>
          <p className="text-gray-600 text-sm">معدل الحضور العام</p>
        </div>
        
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <Users className="mx-auto text-purple-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-purple-900">
            {courseStats.activeCourses + curriculumStats.activeCurricula}
          </p>
          <p className="text-gray-600 text-sm">وحدات التدريس</p>
        </div>
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
              <p className="text-blue-600 text-sm">نظام الحضور للكورسات المستقلة</p>
            </div>
          </div>
          <button
            onClick={() => setViewMode('courses')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            عرض التفاصيل
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <BookOpen className="mx-auto text-blue-600 mb-2" size={20} />
            <p className="text-2xl font-bold text-blue-900">{courseStats.activeCourses}</p>
            <p className="text-sm text-gray-600">كورس نشط</p>
          </div>
          <div className="bg-cyan-50 rounded-lg p-4 text-center">
            <Calendar className="mx-auto text-cyan-600 mb-2" size={20} />
            <p className="text-2xl font-bold text-cyan-900">{courseStats.totalSessions}</p>
            <p className="text-sm text-gray-600">جلسة</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4 text-center">
            <CheckCircle className="mx-auto text-emerald-600 mb-2" size={20} />
            <p className="text-2xl font-bold text-emerald-900">{courseStats.totalAttendances}</p>
            <p className="text-sm text-gray-600">حضور</p>
          </div>
          <div className="bg-sky-50 rounded-lg p-4 text-center">
            <TrendingUp className="mx-auto text-sky-600 mb-2" size={20} />
            <p className="text-2xl font-bold text-sky-900">{courseStats.attendanceRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-600">معدل الحضور</p>
          </div>
        </div>

        {/* آخر جلسات الكورسات */}
        <div className="mt-6">
          <h4 className="font-semibold mb-3 text-blue-800">آخر جلسات الكورسات</h4>
          <div className="space-y-2">
            {attendanceSessions.slice(0, 3).map(session => (
              <div key={session.id} className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-800">
                    {session.courseName} - الجلسة {session.sessionNumber}
                  </p>
                  <p className="text-sm text-blue-600">{session.topic}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-blue-800">
                    {session.sessionDate?.toDate ? 
                      new Date(session.sessionDate.toDate()).toLocaleDateString('ar-EG') : ''}
                  </p>
                  <p className="text-blue-600">
                    ✓ {session.summary?.presentCount || 0} | ✗ {session.summary?.absentCount || 0}
                  </p>
                </div>
              </div>
            ))}
            {attendanceSessions.length === 0 && (
              <p className="text-blue-600 text-sm text-center py-4">لا توجد جلسات كورسات حتى الآن</p>
            )}
          </div>
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
              <p className="text-purple-600 text-sm">نظام الحضور للمناهج الشاملة</p>
            </div>
          </div>
          <button
            onClick={() => setViewMode('curricula')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            عرض التفاصيل
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <GraduationCap className="mx-auto text-purple-600 mb-2" size={20} />
            <p className="text-2xl font-bold text-purple-900">{curriculumStats.activeCurricula}</p>
            <p className="text-sm text-gray-600">منهج نشط</p>
          </div>
          <div className="bg-violet-50 rounded-lg p-4 text-center">
            <Calendar className="mx-auto text-violet-600 mb-2" size={20} />
            <p className="text-2xl font-bold text-violet-900">{curriculumStats.totalSessions}</p>
            <p className="text-sm text-gray-600">جلسة</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <CheckCircle className="mx-auto text-indigo-600 mb-2" size={20} />
            <p className="text-2xl font-bold text-indigo-900">{curriculumStats.totalAttendances}</p>
            <p className="text-sm text-gray-600">حضور</p>
          </div>
          <div className="bg-fuchsia-50 rounded-lg p-4 text-center">
            <TrendingUp className="mx-auto text-fuchsia-600 mb-2" size={20} />
            <p className="text-2xl font-bold text-fuchsia-900">{curriculumStats.attendanceRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-600">معدل الحضور</p>
          </div>
        </div>

        {/* آخر جلسات المناهج */}
        <div className="mt-6">
          <h4 className="font-semibold mb-3 text-purple-800">آخر جلسات المناهج</h4>
          <div className="space-y-2">
            {curriculumAttendanceSessions.slice(0, 3).map(session => (
              <div key={session.id} className="bg-purple-50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-purple-800">
                    {session.groupName} - الجلسة {session.sessionNumber}
                  </p>
                  <p className="text-sm text-purple-600">{session.topic} (المرحلة {session.level})</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-purple-800">
                    {session.sessionDate?.toDate ? 
                      new Date(session.sessionDate.toDate()).toLocaleDateString('ar-EG') : ''}
                  </p>
                  <p className="text-purple-600">
                    ✓ {session.summary?.presentCount || 0} | ✗ {session.summary?.absentCount || 0}
                  </p>
                </div>
              </div>
            ))}
            {curriculumAttendanceSessions.length === 0 && (
              <p className="text-purple-600 text-sm text-center py-4">لا توجد جلسات مناهج حتى الآن</p>
            )}
          </div>
        </div>
      </div>

      {/* مقارنة سريعة */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">مقارنة سريعة</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* الكورسات */}
          <div className="border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="text-blue-600" size={20} />
              <h4 className="font-semibold text-blue-800">الكورسات الفردية</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">معدل الحضور:</span>
                <span className="font-semibold text-blue-600">{courseStats.attendanceRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">عدد الكورسات:</span>
                <span className="font-semibold">{courseStats.activeCourses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">إجمالي الجلسات:</span>
                <span className="font-semibold">{courseStats.totalSessions}</span>
              </div>
            </div>
          </div>

          {/* المناهج */}
          <div className="border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="text-purple-600" size={20} />
              <h4 className="font-semibold text-purple-800">المناهج التعليمية</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">معدل الحضور:</span>
                <span className="font-semibold text-purple-600">{curriculumStats.attendanceRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">عدد المناهج:</span>
                <span className="font-semibold">{curriculumStats.activeCurricula}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">إجمالي الجلسات:</span>
                <span className="font-semibold">{curriculumStats.totalSessions}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const CoursesView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <BookOpen className="text-blue-600" size={20} />
          </div>
          <h3 className="text-2xl font-semibold text-blue-800">حضور الكورسات الفردية</h3>
        </div>
        <button
          onClick={() => setViewMode('overview')}
          className="text-blue-600 hover:text-blue-700"
        >
          ← العودة للنظرة العامة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => {
          const courseSessions = attendanceSessions.filter(s => s.courseId === course.id);
          
          return (
            <div
              key={course.id}
              onClick={() => {
                setSelectedCourse(course);
                setViewMode('course-details');
              }}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow border-l-4 border-blue-500"
            >
              <h4 className="text-xl font-semibold mb-4">{course.title}</h4>
              
              <div className="grid grid-cols-2 gap-4 text-center mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-blue-600">{courseSessions.length}</p>
                  <p className="text-sm text-gray-600">جلسة</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-600">
                    {courseSessions.reduce((sum, s) => sum + (s.summary?.presentCount || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-600">حضور</p>
                </div>
              </div>
              
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                عرض التفاصيل
              </button>
            </div>
          );
        })}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <BookOpen className="mx-auto mb-4" size={48} />
          <p>لا توجد كورسات متاحة</p>
        </div>
      )}
    </div>
  );

  const CurriculaView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <GraduationCap className="text-purple-600" size={20} />
          </div>
          <h3 className="text-2xl font-semibold text-purple-800">حضور المناهج التعليمية</h3>
        </div>
        <button
          onClick={() => setViewMode('overview')}
          className="text-purple-600 hover:text-purple-700"
        >
          ← العودة للنظرة العامة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {curricula.map(curriculum => {
          const curriculumGroupsList = curriculumGroups.filter(g => g.curriculumId === curriculum.id);
          const curriculumSessionsList = curriculumAttendanceSessions.filter(s => s.curriculumId === curriculum.id);
          
          return (
            <div
              key={curriculum.id}
              onClick={() => {
                setSelectedCurriculum(curriculum);
                setViewMode('curriculum-details');
              }}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow border-l-4 border-purple-500"
            >
              <h4 className="text-xl font-semibold mb-4">{curriculum.title}</h4>
              
              <div className="grid grid-cols-2 gap-4 text-center mb-4">
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-purple-600">{curriculumGroupsList.length}</p>
                  <p className="text-sm text-gray-600">مجموعة</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-600">{curriculumSessionsList.length}</p>
                  <p className="text-sm text-gray-600">جلسة</p>
                </div>
              </div>
              
              <button className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors">
                عرض المجموعات
              </button>
            </div>
          );
        })}
      </div>

      {curricula.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <GraduationCap className="mx-auto mb-4" size={48} />
          <p>لا توجد مناهج متاحة</p>
        </div>
      )}
    </div>
  );

  const CourseDetailsView = () => {
    const studentsWithStats = getCourseStudentsWithStats(selectedCourse.id);
    const sessions = attendanceSessions.filter(s => s.courseId === selectedCourse.id);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="text-blue-600" size={24} />
            <h3 className="text-2xl font-semibold">
              كورس: {selectedCourse?.title}
            </h3>
          </div>
          <button
            onClick={() => {
              setSelectedCourse(null);
              setViewMode('courses');
            }}
            className="text-blue-600 hover:text-blue-700"
          >
            ← العودة للكورسات
          </button>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{sessions.length}</p>
            <p className="text-sm text-gray-600">إجمالي الجلسات</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{studentsWithStats.length}</p>
            <p className="text-sm text-gray-600">عدد الطلاب</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {studentsWithStats.filter(s => s.stats.attendanceRate >= 80).length}
            </p>
            <p className="text-sm text-gray-600">طلاب ممتازين</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {studentsWithStats.filter(s => s.stats.attendanceRate < 70).length}
            </p>
            <p className="text-sm text-gray-600">طلاب معرضين للخطر</p>
          </div>
        </div>

        {/* جدول الحضور والغياب */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h4 className="text-xl font-semibold">سجل الحضور والغياب - الكورس</h4>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">الطالب</th>
                  <th className="px-4 py-3 text-center font-semibold">معدل الحضور</th>
                  {sessions.slice(0, 10).map(session => (
                    <th key={session.id} className="px-2 py-3 text-center font-semibold min-w-16">
                      <div className="text-xs">
                        <div>ج{session.sessionNumber}</div>
                        <div className="text-gray-500">
                          {session.sessionDate?.toDate ? 
                            new Date(session.sessionDate.toDate()).toLocaleDateString('ar-EG', { 
                              month: 'numeric', 
                              day: 'numeric' 
                            }) : ''}
                        </div>
                      </div>
                    </th>
                  ))}
                  {sessions.length > 10 && (
                    <th className="px-2 py-3 text-center text-xs text-gray-500">
                      +{sessions.length - 10} جلسة
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {studentsWithStats.map(studentData => (
                  <tr key={studentData.student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">
                          {studentData.student.firstName} {studentData.student.lastName}
                        </p>
                        <p className="text-sm text-gray-600">{studentData.student.phone}</p>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-sm font-semibold ${
                        studentData.stats.attendanceRate >= 80 ? 'bg-green-100 text-green-800' :
                        studentData.stats.attendanceRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {studentData.stats.attendanceRate.toFixed(1)}%
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {studentData.stats.presentCount}ح/{studentData.stats.absentCount}غ
                      </div>
                    </td>
                    
                    {studentData.sessions.slice(0, 10).map(attendance => (
                      <td key={attendance.sessionId} className="px-2 py-3 text-center">
                        {attendance.status === 'present' && (
                          <CheckCircle className="mx-auto text-green-500" size={20} title="حاضر" />
                        )}
                        {attendance.status === 'late' && (
                          <Clock className="mx-auto text-yellow-500" size={20} title="متأخر" />
                        )}
                        {attendance.status === 'absent' && (
                          <XCircle className="mx-auto text-red-500" size={20} title="غائب" />
                        )}
                      </td>
                    ))}
                    
                    {sessions.length > 10 && (
                      <td className="px-2 py-3 text-center">
                        <button className="text-blue-600 hover:text-blue-700 text-xs">
                          عرض الكل
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* تفاصيل الجلسات */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h4 className="text-xl font-semibold mb-4">تفاصيل جلسات الكورس</h4>
          <div className="space-y-3">
            {sessions.slice(0, 5).map(session => (
              <div key={session.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-semibold">
                    الجلسة {session.sessionNumber}: {session.topic}
                  </h5>
                  <span className="text-sm text-gray-600">
                    {session.sessionDate?.toDate ? 
                      new Date(session.sessionDate.toDate()).toLocaleDateString('ar-EG') : ''}
                  </span>
                </div>
                
                <div className="flex gap-6 text-sm">
                  <span className="text-green-600">
                    ✓ حضر: {session.summary?.presentCount || 0}
                  </span>
                  <span className="text-yellow-600">
                    ⏰ تأخر: {session.summary?.lateCount || 0}
                  </span>
                  <span className="text-red-600">
                    ✗ غاب: {session.summary?.absentCount || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const CurriculumDetailsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="text-purple-600" size={24} />
          <h3 className="text-2xl font-semibold">
            منهج: {selectedCurriculum?.title}
          </h3>
        </div>
        <button
          onClick={() => {
            setSelectedCurriculum(null);
            setViewMode('curricula');
          }}
          className="text-purple-600 hover:text-purple-700"
        >
          ← العودة للمناهج
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {curriculumGroups.filter(g => g.curriculumId === selectedCurriculum.id).map(group => {
          const groupSessions = curriculumAttendanceSessions.filter(s => s.groupId === group.id);
          const studentsWithStats = getCurriculumGroupStudentsWithStats(group.id);
          const avgAttendanceRate = studentsWithStats.length > 0 
            ? studentsWithStats.reduce((sum, s) => sum + s.stats.attendanceRate, 0) / studentsWithStats.length 
            : 0;

          return (
            <div
              key={group.id}
              onClick={() => {
                setSelectedCurriculumGroup(group);
                setViewMode('curriculum-group-details');
              }}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow border-l-4 border-purple-500"
            >
              <h4 className="text-lg font-semibold mb-3">{group.name}</h4>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">عدد الطلاب:</span>
                  <span className="font-semibold">{group.students?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">عدد الجلسات:</span>
                  <span className="font-semibold">{groupSessions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">معدل الحضور:</span>
                  <span className={`font-semibold ${
                    avgAttendanceRate >= 80 ? 'text-green-600' :
                    avgAttendanceRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {avgAttendanceRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">المرحلة الحالية:</span>
                  <span className="font-semibold">{group.progress?.currentLevel || 1}</span>
                </div>
              </div>
              
              <button className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors">
                عرض التفاصيل
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const CurriculumGroupDetailsView = () => {
    const studentsWithStats = getCurriculumGroupStudentsWithStats(selectedCurriculumGroup.id);
    const sessions = curriculumAttendanceSessions.filter(s => s.groupId === selectedCurriculumGroup.id);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="text-purple-600" size={24} />
            <h3 className="text-2xl font-semibold">
              مجموعة: {selectedCurriculumGroup?.name}
            </h3>
          </div>
          <button
            onClick={() => {
              setSelectedCurriculumGroup(null);
              setViewMode('curriculum-details');
            }}
            className="text-purple-600 hover:text-purple-700"
          >
            ← العودة للمجموعات
          </button>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{sessions.length}</p>
            <p className="text-sm text-gray-600">إجمالي الجلسات</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{studentsWithStats.length}</p>
            <p className="text-sm text-gray-600">عدد الطلاب</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {studentsWithStats.filter(s => s.stats.attendanceRate >= 80).length}
            </p>
            <p className="text-sm text-gray-600">طلاب ممتازين</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {studentsWithStats.filter(s => s.stats.attendanceRate < 70).length}
            </p>
            <p className="text-sm text-gray-600">طلاب معرضين للخطر</p>
          </div>
        </div>

        {/* جدول الحضور والغياب للمناهج */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h4 className="text-xl font-semibold">سجل الحضور والغياب - المجموعة</h4>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">الطالب</th>
                  <th className="px-4 py-3 text-center font-semibold">معدل الحضور</th>
                  {sessions.slice(0, 10).map(session => (
                    <th key={session.id} className="px-2 py-3 text-center font-semibold min-w-16">
                      <div className="text-xs">
                        <div>ج{session.sessionNumber}</div>
                        <div className="text-gray-500">مرحلة {session.level}</div>
                        <div className="text-gray-500">
                          {session.sessionDate?.toDate ? 
                            new Date(session.sessionDate.toDate()).toLocaleDateString('ar-EG', { 
                              month: 'numeric', 
                              day: 'numeric' 
                            }) : ''}
                        </div>
                      </div>
                    </th>
                  ))}
                  {sessions.length > 10 && (
                    <th className="px-2 py-3 text-center text-xs text-gray-500">
                      +{sessions.length - 10} جلسة
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {studentsWithStats.map(studentData => (
                  <tr key={studentData.student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">
                          {studentData.student.firstName} {studentData.student.lastName}
                        </p>
                        <p className="text-sm text-gray-600">{studentData.student.phone}</p>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-sm font-semibold ${
                        studentData.stats.attendanceRate >= 80 ? 'bg-green-100 text-green-800' :
                        studentData.stats.attendanceRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {studentData.stats.attendanceRate.toFixed(1)}%
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {studentData.stats.presentCount}ح/{studentData.stats.absentCount}غ
                      </div>
                    </td>
                    
                    {studentData.sessions.slice(0, 10).map(attendance => (
                      <td key={attendance.sessionId} className="px-2 py-3 text-center">
                        {attendance.status === 'present' && (
                          <CheckCircle className="mx-auto text-green-500" size={20} title="حاضر" />
                        )}
                        {attendance.status === 'late' && (
                          <Clock className="mx-auto text-yellow-500" size={20} title="متأخر" />
                        )}
                        {attendance.status === 'absent' && (
                          <XCircle className="mx-auto text-red-500" size={20} title="غائب" />
                        )}
                      </td>
                    ))}
                    
                    {sessions.length > 10 && (
                      <td className="px-2 py-3 text-center">
                        <button className="text-purple-600 hover:text-purple-700 text-xs">
                          عرض الكل
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* تفاصيل جلسات المناهج */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h4 className="text-xl font-semibold mb-4">تفاصيل جلسات المجموعة</h4>
          <div className="space-y-3">
            {sessions.slice(0, 5).map(session => (
              <div key={session.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-semibold">
                    الجلسة {session.sessionNumber}: {session.topic}
                  </h5>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">
                      {session.sessionDate?.toDate ? 
                        new Date(session.sessionDate.toDate()).toLocaleDateString('ar-EG') : ''}
                    </span>
                    <div className="text-xs text-purple-600">المرحلة {session.level}</div>
                  </div>
                </div>
                
                <div className="flex gap-6 text-sm">
                  <span className="text-green-600">
                    ✓ حضر: {session.summary?.presentCount || 0}
                  </span>
                  <span className="text-yellow-600">
                    ⏰ تأخر: {session.summary?.lateCount || 0}
                  </span>
                  <span className="text-red-600">
                    ✗ غاب: {session.summary?.absentCount || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const StatisticsView = () => (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold">الإحصائيات الشاملة</h3>
      
      {/* إحصائيات مقارنة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* إحصائيات الكورسات */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="text-blue-600" size={24} />
            <h4 className="text-xl font-semibold text-blue-800">الكورسات الفردية</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-900">{courseStats.activeCourses}</p>
              <p className="text-sm text-gray-600">كورس نشط</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-900">{courseStats.totalSessions}</p>
              <p className="text-sm text-gray-600">جلسة</p>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-blue-800 font-medium">معدل الحضور</span>
              <span className="text-2xl font-bold text-blue-900">{courseStats.attendanceRate.toFixed(1)}%</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-green-600">✓ حضور: {courseStats.totalAttendances}</span>
              </div>
              <div>
                <span className="text-red-600">✗ غياب: {courseStats.totalAbsences}</span>
              </div>
            </div>
          </div>
        </div>

        {/* إحصائيات المناهج */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="text-purple-600" size={24} />
            <h4 className="text-xl font-semibold text-purple-800">المناهج التعليمية</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-900">{curriculumStats.activeCurricula}</p>
              <p className="text-sm text-gray-600">منهج نشط</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-900">{curriculumStats.totalSessions}</p>
              <p className="text-sm text-gray-600">جلسة</p>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-purple-800 font-medium">معدل الحضور</span>
              <span className="text-2xl font-bold text-purple-900">{curriculumStats.attendanceRate.toFixed(1)}%</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-green-600">✓ حضور: {curriculumStats.totalAttendances}</span>
              </div>
              <div>
                <span className="text-red-600">✗ غياب: {curriculumStats.totalAbsences}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* الإحصائيات العامة */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h4 className="text-xl font-semibold mb-4">الإحصائيات الإجمالية</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-indigo-50 rounded-xl p-6 text-center">
            <BarChart3 className="mx-auto text-indigo-600 mb-3" size={32} />
            <p className="text-3xl font-bold text-indigo-900">
              {courseStats.totalSessions + curriculumStats.totalSessions}
            </p>
            <p className="text-gray-600">إجمالي الجلسات</p>
          </div>
          
          <div className="bg-green-50 rounded-xl p-6 text-center">
            <TrendingUp className="mx-auto text-green-600 mb-3" size={32} />
            <p className="text-3xl font-bold text-green-900">
              {(((courseStats.totalAttendances + curriculumStats.totalAttendances) / 
                (courseStats.totalAttendances + curriculumStats.totalAttendances + 
                 courseStats.totalAbsences + curriculumStats.totalAbsences)) * 100 || 0).toFixed(1)}%
            </p>
            <p className="text-gray-600">معدل الحضور العام</p>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-6 text-center">
            <Users className="mx-auto text-purple-600 mb-3" size={32} />
            <p className="text-3xl font-bold text-purple-900">
              {courseStats.activeGroups + curriculumStats.activeGroups}
            </p>
            <p className="text-gray-600">مجموعة نشطة</p>
          </div>
          
          <div className="bg-orange-50 rounded-xl p-6 text-center">
            <Award className="mx-auto text-orange-600 mb-3" size={32} />
            <p className="text-3xl font-bold text-orange-900">
              {courseStats.activeCourses + curriculumStats.activeCurricula}
            </p>
            <p className="text-gray-600">وحدة تعليمية</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">نظام الحضور والغياب الشامل</h2>
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
            onClick={() => setViewMode('courses')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              viewMode.includes('course') 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BookOpen size={18} />
            الكورسات
          </button>
          
          <button
            onClick={() => setViewMode('curricula')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              viewMode.includes('curriculum') 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <GraduationCap size={18} />
            المناهج
          </button>
          
          <button
            onClick={() => setViewMode('statistics')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'statistics' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            الإحصائيات
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'overview' && <OverviewTab />}
      {viewMode === 'courses' && <CoursesView />}
      {viewMode === 'curricula' && <CurriculaView />}
      {viewMode === 'course-details' && <CourseDetailsView />}
      {viewMode === 'curriculum-details' && <CurriculumDetailsView />}
      {viewMode === 'curriculum-group-details' && <CurriculumGroupDetailsView />}
      {viewMode === 'statistics' && <StatisticsView />}
    </div>
  );
};

export default AttendanceOverview;