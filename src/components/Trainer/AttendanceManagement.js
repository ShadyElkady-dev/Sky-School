// src/components/Trainer/AttendanceManagement.js
import React, { useState } from 'react';
import { 
  Calendar, Users, Plus, Save, Eye, CheckCircle, XCircle, 
  Clock, BookOpen, TrendingUp, BarChart3, FileText, Download 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useFirestore';
import { where, orderBy } from 'firebase/firestore';

const AttendanceManagement = () => {
  const { userProfile } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [viewMode, setViewMode] = useState('sessions'); // sessions, statistics, reports
  
  // جلب البيانات
  const { data: courses } = useCollection('courses', [where('trainerId', '==', userProfile.id)]);
  const { data: enrollments } = useCollection('enrollments');
  const { data: users } = useCollection('users');
  const { data: attendanceSessions, add: addSession, update: updateSession } = useCollection('attendanceSessions', 
    selectedCourse ? [where('courseId', '==', selectedCourse.id), orderBy('sessionDate', 'desc')] : []
  );

  // جلب الطلاب المسجلين في الكورس المحدد
  const getCourseStudents = (courseId) => {
    const courseEnrollments = enrollments.filter(e => e.courseId === courseId);
    return users.filter(u => courseEnrollments.some(e => e.studentId === u.id));
  };

  // احصائيات الحضور للكورس
  const getCourseStats = (courseId) => {
    const students = getCourseStudents(courseId);
    const sessions = attendanceSessions.filter(s => s.courseId === courseId);
    
    const totalSessions = sessions.length;
    const totalStudents = students.length;
    
    // حساب معدل الحضور لكل طالب
    const studentStats = students.map(student => {
      const attendanceRecords = sessions.flatMap(session => 
        session.attendance.filter(att => att.studentId === student.id)
      );
      
      const presentCount = attendanceRecords.filter(att => att.status === 'present').length;
      const attendanceRate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;
      
      return {
        student,
        presentCount,
        absentCount: totalSessions - presentCount,
        attendanceRate,
        lastAttendance: attendanceRecords.length > 0 ? attendanceRecords[0].sessionDate : null
      };
    });

    // احصائيات عامة
    const averageAttendanceRate = studentStats.length > 0 
      ? studentStats.reduce((sum, s) => sum + s.attendanceRate, 0) / studentStats.length 
      : 0;
    
    const totalAttendances = sessions.reduce((sum, session) => 
      sum + session.attendance.filter(att => att.status === 'present').length, 0
    );

    return {
      totalSessions,
      totalStudents,
      studentStats,
      averageAttendanceRate,
      totalAttendances,
      lastSessionDate: sessions.length > 0 ? sessions[0].sessionDate : null
    };
  };

  const NewSessionForm = () => {
    const [sessionData, setSessionData] = useState({
      sessionNumber: attendanceSessions.length + 1,
      sessionDate: new Date().toISOString().split('T')[0],
      sessionTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
      topic: '',
      duration: 60,
      notes: ''
    });
    
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(false);

    const students = getCourseStudents(selectedCourse.id);

    // تهيئة قائمة الحضور
    React.useEffect(() => {
      if (students.length > 0 && attendance.length === 0) {
        setAttendance(students.map(student => ({
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          status: 'present', // افتراضياً حاضر
          notes: ''
        })));
      }
    }, [students]);

    const handleAttendanceChange = (studentId, status, notes = '') => {
      setAttendance(prev => prev.map(att => 
        att.studentId === studentId 
          ? { ...att, status, notes }
          : att
      ));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);

      try {
        await addSession({
          courseId: selectedCourse.id,
          courseName: selectedCourse.title,
          trainerId: userProfile.id,
          trainerName: `${userProfile.firstName} ${userProfile.lastName}`,
          sessionNumber: sessionData.sessionNumber,
          sessionDate: new Date(sessionData.sessionDate),
          sessionTime: sessionData.sessionTime,
          topic: sessionData.topic,
          duration: parseInt(sessionData.duration),
          notes: sessionData.notes,
          attendance: attendance,
          summary: {
            totalStudents: students.length,
            presentCount: attendance.filter(att => att.status === 'present').length,
            absentCount: attendance.filter(att => att.status === 'absent').length,
            lateCount: attendance.filter(att => att.status === 'late').length
          }
        });

        alert('تم حفظ جلسة الحضور بنجاح!');
        setShowNewSession(false);
        
        // إعادة تعيين النموذج
        setSessionData({
          sessionNumber: attendanceSessions.length + 2,
          sessionDate: new Date().toISOString().split('T')[0],
          sessionTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
          topic: '',
          duration: 60,
          notes: ''
        });
        setAttendance([]);
        
      } catch (error) {
        console.error('Error saving session:', error);
        alert('خطأ في حفظ الجلسة');
      }
      setLoading(false);
    };

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-6">تسجيل جلسة جديدة - {selectedCourse.title}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* معلومات الجلسة */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium mb-2">رقم الجلسة</label>
              <input
                type="number"
                value={sessionData.sessionNumber}
                onChange={(e) => setSessionData({...sessionData, sessionNumber: parseInt(e.target.value)})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            
            <div>
              <label className="block font-medium mb-2">تاريخ الجلسة</label>
              <input
                type="date"
                value={sessionData.sessionDate}
                onChange={(e) => setSessionData({...sessionData, sessionDate: e.target.value})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            
            <div>
              <label className="block font-medium mb-2">وقت الجلسة</label>
              <input
                type="time"
                value={sessionData.sessionTime}
                onChange={(e) => setSessionData({...sessionData, sessionTime: e.target.value})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-2">موضوع الجلسة</label>
              <input
                type="text"
                value={sessionData.topic}
                onChange={(e) => setSessionData({...sessionData, topic: e.target.value})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                placeholder="مثال: الفصل الأول - مقدمة في البرمجة"
                required
              />
            </div>
            
            <div>
              <label className="block font-medium mb-2">مدة الجلسة (دقيقة)</label>
              <input
                type="number"
                value={sessionData.duration}
                onChange={(e) => setSessionData({...sessionData, duration: parseInt(e.target.value)})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                min="15"
                max="300"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">ملاحظات الجلسة</label>
            <textarea
              value={sessionData.notes}
              onChange={(e) => setSessionData({...sessionData, notes: e.target.value})}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              rows="3"
              placeholder="أي ملاحظات إضافية عن الجلسة..."
            />
          </div>

          {/* قائمة الحضور */}
          <div>
            <h4 className="text-lg font-semibold mb-4">تسجيل الحضور ({students.length} طالب)</h4>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 gap-3">
                {students.map(student => {
                  const studentAttendance = attendance.find(att => att.studentId === student.id);
                  
                  return (
                    <div key={student.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-purple-600">
                            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{student.firstName} {student.lastName}</p>
                          <p className="text-sm text-gray-600">{student.phone}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAttendanceChange(student.id, 'present')}
                          className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                            studentAttendance?.status === 'present'
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                          }`}
                        >
                          <CheckCircle size={14} />
                          حاضر
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleAttendanceChange(student.id, 'late')}
                          className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                            studentAttendance?.status === 'late'
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-yellow-50'
                          }`}
                        >
                          <Clock size={14} />
                          متأخر
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleAttendanceChange(student.id, 'absent')}
                          className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                            studentAttendance?.status === 'absent'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                          }`}
                        >
                          <XCircle size={14} />
                          غائب
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ملخص الحضور */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h5 className="font-semibold mb-2">ملخص الحضور:</h5>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <span className="block text-green-600 font-bold text-lg">
                  {attendance.filter(att => att.status === 'present').length}
                </span>
                <span className="text-gray-600">حاضر</span>
              </div>
              <div className="text-center">
                <span className="block text-yellow-600 font-bold text-lg">
                  {attendance.filter(att => att.status === 'late').length}
                </span>
                <span className="text-gray-600">متأخر</span>
              </div>
              <div className="text-center">
                <span className="block text-red-600 font-bold text-lg">
                  {attendance.filter(att => att.status === 'absent').length}
                </span>
                <span className="text-gray-600">غائب</span>
              </div>
            </div>
          </div>

          {/* أزرار الحفظ */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? 'جاري الحفظ...' : 'حفظ الجلسة'}
            </button>
            
            <button
              type="button"
              onClick={() => setShowNewSession(false)}
              className="bg-gray-400 text-white px-6 py-3 rounded-lg hover:bg-gray-500 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    );
  };

  const SessionsList = () => {
    const sessions = attendanceSessions.filter(s => s.courseId === selectedCourse.id);
    
    return (
      <div className="space-y-4">
        {sessions.map(session => (
          <div key={session.id} className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold">
                  الجلسة {session.sessionNumber}: {session.topic}
                </h4>
                <p className="text-gray-600">
                  {new Date(session.sessionDate.toDate()).toLocaleDateString('ar-EG')} - {session.sessionTime}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">مدة الجلسة: {session.duration} دقيقة</p>
              </div>
            </div>

            {/* ملخص الحضور */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <span className="block text-blue-600 font-bold text-lg">
                  {session.summary.totalStudents}
                </span>
                <span className="text-sm text-gray-600">إجمالي الطلاب</span>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <span className="block text-green-600 font-bold text-lg">
                  {session.summary.presentCount}
                </span>
                <span className="text-sm text-gray-600">حاضر</span>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <span className="block text-yellow-600 font-bold text-lg">
                  {session.summary.lateCount}
                </span>
                <span className="text-sm text-gray-600">متأخر</span>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <span className="block text-red-600 font-bold text-lg">
                  {session.summary.absentCount}
                </span>
                <span className="text-sm text-gray-600">غائب</span>
              </div>
            </div>

            {/* تفاصيل الحضور */}
            <details className="group">
              <summary className="cursor-pointer text-purple-600 hover:text-purple-700 font-medium">
                عرض تفاصيل الحضور
              </summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {session.attendance.map(att => (
                  <div key={att.studentId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium">{att.studentName}</span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      att.status === 'present' ? 'bg-green-100 text-green-800' :
                      att.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {att.status === 'present' ? 'حاضر' :
                       att.status === 'late' ? 'متأخر' : 'غائب'}
                    </span>
                  </div>
                ))}
              </div>
            </details>

            {session.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm"><strong>ملاحظات:</strong> {session.notes}</p>
              </div>
            )}
          </div>
        ))}
        
        {sessions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="mx-auto mb-4" size={48} />
            <p>لم يتم تسجيل أي جلسات لهذا الكورس حتى الآن</p>
          </div>
        )}
      </div>
    );
  };

  const StatisticsView = () => {
    const stats = getCourseStats(selectedCourse.id);
    
    return (
      <div className="space-y-6">
        {/* احصائيات عامة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-xl p-6 text-center">
            <BookOpen className="mx-auto text-blue-600 mb-2" size={32} />
            <p className="text-3xl font-bold text-blue-900">{stats.totalSessions}</p>
            <p className="text-gray-600">إجمالي الجلسات</p>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-6 text-center">
            <Users className="mx-auto text-purple-600 mb-2" size={32} />
            <p className="text-3xl font-bold text-purple-900">{stats.totalStudents}</p>
            <p className="text-gray-600">إجمالي الطلاب</p>
          </div>
          
          <div className="bg-green-50 rounded-xl p-6 text-center">
            <TrendingUp className="mx-auto text-green-600 mb-2" size={32} />
            <p className="text-3xl font-bold text-green-900">{stats.averageAttendanceRate.toFixed(1)}%</p>
            <p className="text-gray-600">متوسط الحضور</p>
          </div>
          
          <div className="bg-orange-50 rounded-xl p-6 text-center">
            <BarChart3 className="mx-auto text-orange-600 mb-2" size={32} />
            <p className="text-3xl font-bold text-orange-900">{stats.totalAttendances}</p>
            <p className="text-gray-600">إجمالي الحضور</p>
          </div>
        </div>

        {/* احصائيات الطلاب */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h4 className="text-lg font-semibold mb-4">احصائيات الطلاب</h4>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right">الطالب</th>
                  <th className="px-4 py-3 text-right">حضر</th>
                  <th className="px-4 py-3 text-right">غاب</th>
                  <th className="px-4 py-3 text-right">معدل الحضور</th>
                  <th className="px-4 py-3 text-right">آخر حضور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.studentStats.map(studentStat => (
                  <tr key={studentStat.student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {studentStat.student.firstName} {studentStat.student.lastName}
                    </td>
                    <td className="px-4 py-3 text-green-600">{studentStat.presentCount}</td>
                    <td className="px-4 py-3 text-red-600">{studentStat.absentCount}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        studentStat.attendanceRate >= 80 ? 'bg-green-100 text-green-800' :
                        studentStat.attendanceRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {studentStat.attendanceRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {studentStat.lastAttendance 
                        ? new Date(studentStat.lastAttendance).toLocaleDateString('ar-EG')
                        : 'لم يحضر بعد'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">إدارة الحضور والغياب</h2>
      </div>

      {/* اختيار الكورس */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">اختر الكورس</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => (
            <div
              key={course.id}
              onClick={() => setSelectedCourse(course)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedCourse?.id === course.id 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h4 className="font-semibold">{course.title}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {getCourseStudents(course.id).length} طالب • 
                {attendanceSessions.filter(s => s.courseId === course.id).length} جلسة
              </p>
            </div>
          ))}
        </div>
        
        {courses.length === 0 && (
          <p className="text-gray-600 text-center py-4">لا توجد كورسات مخصصة لك</p>
        )}
      </div>

      {selectedCourse && (
        <>
          {/* أزرار التنقل */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setViewMode('sessions')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  viewMode === 'sessions' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Calendar size={18} />
                الجلسات
              </button>
              
              <button
                onClick={() => setViewMode('statistics')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  viewMode === 'statistics' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <BarChart3 size={18} />
                الإحصائيات
              </button>
              
              <button
                onClick={() => setShowNewSession(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 mr-auto"
              >
                <Plus size={18} />
                جلسة جديدة
              </button>
            </div>
          </div>

          {/* المحتوى */}
          {showNewSession ? (
            <NewSessionForm />
          ) : viewMode === 'sessions' ? (
            <SessionsList />
          ) : (
            <StatisticsView />
          )}
        </>
      )}
    </div>
  );
};

export default AttendanceManagement;