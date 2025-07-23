// src/components/Trainer/CurriculumAttendanceManagement.js
import React, { useState } from 'react';
import { 
  Calendar, Users, Plus, Save, CheckCircle, XCircle, 
  Clock, Target, TrendingUp, BarChart3 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useFirestore';
import { where, orderBy } from 'firebase/firestore';

const CurriculumAttendanceManagement = () => {
  const { userProfile } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showNewSession, setShowNewSession] = useState(false);
  
  // جلب البيانات بشكل صحيح
  const { data: curriculumGroups } = useCollection('curriculumGroups', [where('trainerId', '==', userProfile?.id || '')]);
  const { data: curricula } = useCollection('curricula');
  const { data: users } = useCollection('users');
  const { data: subscriptions } = useCollection('subscriptions');
  
  // إصلاح جلب جلسات الحضور
  const attendanceQuery = selectedGroup ? [
    where('groupId', '==', selectedGroup.id), 
    orderBy('sessionDate', 'desc')
  ] : [];
  
  const { data: attendanceSessions, add: addSession } = useCollection(
    'curriculumAttendanceSessions', 
    attendanceQuery
  );

  // جلب طلاب المجموعة بشكل صحيح
  const getGroupStudents = (groupId) => {
    const group = curriculumGroups.find(g => g.id === groupId);
    if (!group || !group.students) return [];
    
    return users.filter(u => group.students.includes(u.id));
  };

  // إحصائيات الحضور للمجموعة
  const getGroupStats = (groupId) => {
    const students = getGroupStudents(groupId);
    const sessions = attendanceSessions.filter(s => s.groupId === groupId);
    
    const totalSessions = sessions.length;
    const totalStudents = students.length;
    
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
        attendanceRate
      };
    });

    const averageAttendanceRate = studentStats.length > 0 
      ? studentStats.reduce((sum, s) => sum + s.attendanceRate, 0) / studentStats.length 
      : 0;

    return {
      totalSessions,
      totalStudents,
      studentStats,
      averageAttendanceRate
    };
  };

  const NewSessionForm = () => {
    const [sessionData, setSessionData] = useState({
      sessionNumber: (attendanceSessions?.length || 0) + 1,
      sessionDate: new Date().toISOString().split('T')[0],
      sessionTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
      topic: '',
      level: selectedGroup?.progress?.currentLevel || 1,
      notes: ''
    });
    
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(false);

    const students = getGroupStudents(selectedGroup?.id);
    const curriculum = curricula.find(c => c.id === selectedGroup?.curriculumId);

    // تهيئة قائمة الحضور
    React.useEffect(() => {
      if (students.length > 0 && attendance.length === 0) {
        setAttendance(students.map(student => ({
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          status: 'present',
          notes: ''
        })));
      }
    }, [students, attendance.length]);

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
        const sessionPayload = {
          groupId: selectedGroup.id,
          groupName: selectedGroup.name,
          curriculumId: selectedGroup.curriculumId,
          curriculumName: selectedGroup.curriculumName || curriculum?.title,
          trainerId: userProfile.id,
          trainerName: `${userProfile.firstName} ${userProfile.lastName}`,
          sessionNumber: sessionData.sessionNumber,
          sessionDate: new Date(sessionData.sessionDate),
          sessionTime: sessionData.sessionTime,
          topic: sessionData.topic,
          level: sessionData.level,
          notes: sessionData.notes,
          attendance: attendance,
          summary: {
            totalStudents: students.length,
            presentCount: attendance.filter(att => att.status === 'present').length,
            absentCount: attendance.filter(att => att.status === 'absent').length,
            lateCount: attendance.filter(att => att.status === 'late').length
          },
          createdAt: new Date()
        };

        await addSession(sessionPayload);

        alert('تم حفظ جلسة الحضور للمنهج بنجاح!');
        setShowNewSession(false);
        
        // إعادة تعيين البيانات
        setSessionData({
          sessionNumber: (attendanceSessions?.length || 0) + 2,
          sessionDate: new Date().toISOString().split('T')[0],
          sessionTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
          topic: '',
          level: selectedGroup?.progress?.currentLevel || 1,
          notes: ''
        });
        setAttendance([]);
        
      } catch (error) {
        console.error('Error saving session:', error);
        alert('خطأ في حفظ الجلسة: ' + error.message);
      }
      setLoading(false);
    };

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-6">تسجيل جلسة جديدة - {selectedGroup?.name}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium mb-2">رقم الجلسة</label>
              <input
                type="number"
                value={sessionData.sessionNumber}
                onChange={(e) => setSessionData({...sessionData, sessionNumber: parseInt(e.target.value)})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                required
                min="1"
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
                placeholder="موضوع الدرس"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2">المرحلة</label>
              <select
                value={sessionData.level}
                onChange={(e) => setSessionData({...sessionData, level: parseInt(e.target.value)})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                required
              >
                {curriculum?.levels?.map((level, index) => (
                  <option key={index + 1} value={index + 1}>
                    المرحلة {index + 1}: {level.title}
                  </option>
                )) || (
                  <option value={1}>المرحلة 1</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">ملاحظات الجلسة</label>
            <textarea
              value={sessionData.notes}
              onChange={(e) => setSessionData({...sessionData, notes: e.target.value})}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              rows="3"
              placeholder="أي ملاحظات إضافية..."
            />
          </div>

          {/* قائمة الحضور */}
          <div>
            <h4 className="text-lg font-semibold mb-4">تسجيل الحضور ({students.length} طالب)</h4>
            
            {students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="mx-auto mb-2" size={32} />
                <p>لا يوجد طلاب في هذه المجموعة</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 gap-3">
                  {students.map(student => {
                    const studentAttendance = attendance.find(att => att.studentId === student.id);
                    
                    return (
                      <div key={student.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="font-semibold text-purple-600">
                              {student.firstName?.charAt(0) || ''}{student.lastName?.charAt(0) || ''}
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
            )}
          </div>

          {/* ملخص الحضور */}
          {attendance.length > 0 && (
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
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || students.length === 0}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

  // التأكد من وجود البيانات قبل العرض
  if (!userProfile) {
    return <div className="text-center py-8">جاري تحميل بيانات المستخدم...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">حضور مجموعات المناهج</h2>
      </div>

      {/* اختيار المجموعة */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">اختر المجموعة</h3>
        
        {curriculumGroups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="mx-auto mb-4" size={48} />
            <p>لا توجد مجموعات مناهج مخصصة لك حتى الآن</p>
            <p className="text-sm mt-2">ستظهر هنا المجموعات التي يتم تخصيصها لك من قبل الإدارة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {curriculumGroups.filter(g => g.status === 'active').map(group => {
              const curriculum = curricula.find(c => c.id === group.curriculumId);
              const sessionsCount = attendanceSessions.filter(s => s.groupId === group.id).length;
              
              return (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedGroup?.id === group.id 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h4 className="font-semibold">{group.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{curriculum?.title}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {group.students?.length || 0} طالب
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {sessionsCount} جلسة
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {curriculumGroups.filter(g => g.status === 'active').length === 0 && curriculumGroups.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>لا توجد مجموعات مناهج مفعلة مخصصة لك</p>
            <p className="text-sm mt-2">يوجد {curriculumGroups.length} مجموعة غير مفعلة</p>
          </div>
        )}
      </div>

      {selectedGroup && (
        <>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                مجموعة: {selectedGroup.name}
              </h3>
              <button
                onClick={() => setShowNewSession(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                جلسة جديدة
              </button>
            </div>

            {/* إحصائيات المجموعة */}
            {(() => {
              const stats = getGroupStats(selectedGroup.id);
              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.totalSessions}</p>
                    <p className="text-sm text-gray-600">إجمالي الجلسات</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{stats.totalStudents}</p>
                    <p className="text-sm text-gray-600">عدد الطلاب</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.averageAttendanceRate.toFixed(1)}%</p>
                    <p className="text-sm text-gray-600">متوسط الحضور</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{selectedGroup.progress?.currentLevel || 1}</p>
                    <p className="text-sm text-gray-600">المرحلة الحالية</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* قائمة الجلسات */}
          {showNewSession ? (
            <NewSessionForm />
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">جلسات الحضور</h3>
              {attendanceSessions.filter(s => s.groupId === selectedGroup.id).length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-600">لم يتم تسجيل أي جلسات لهذه المجموعة حتى الآن</p>
                  <button
                    onClick={() => setShowNewSession(true)}
                    className="mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    تسجيل أول جلسة
                  </button>
                </div>
              ) : (
                attendanceSessions.filter(s => s.groupId === selectedGroup.id).map(session => (
                  <div key={session.id} className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold">
                          الجلسة {session.sessionNumber}: {session.topic}
                        </h4>
                        <p className="text-gray-600">
                          {session.sessionDate?.toDate ? 
                            new Date(session.sessionDate.toDate()).toLocaleDateString('ar-EG') :
                            'تاريخ غير محدد'} - 
                          المرحلة {session.level || 1}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <span className="block text-blue-600 font-bold text-lg">
                          {session.summary?.totalStudents || 0}
                        </span>
                        <span className="text-sm text-gray-600">إجمالي</span>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <span className="block text-green-600 font-bold text-lg">
                          {session.summary?.presentCount || 0}
                        </span>
                        <span className="text-sm text-gray-600">حاضر</span>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3 text-center">
                        <span className="block text-yellow-600 font-bold text-lg">
                          {session.summary?.lateCount || 0}
                        </span>
                        <span className="text-sm text-gray-600">متأخر</span>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <span className="block text-red-600 font-bold text-lg">
                          {session.summary?.absentCount || 0}
                        </span>
                        <span className="text-sm text-gray-600">غائب</span>
                      </div>
                    </div>

                    {session.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm"><strong>ملاحظات:</strong> {session.notes}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CurriculumAttendanceManagement;