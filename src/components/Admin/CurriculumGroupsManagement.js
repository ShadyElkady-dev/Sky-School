// src/components/Admin/CurriculumGroupsManagement.js
import React, { useState } from 'react';
import { 
  Users, Plus, Edit, Trash2, UserPlus, UserMinus, 
  BookOpen, User, Save, X, Search, Filter, Copy, Send,
  Play, Pause, Clock, CheckCircle, AlertCircle, Settings,
  Target, Award, TrendingUp, Calendar, BarChart3, RefreshCw
} from 'lucide-react';
import { useCollection } from '../../hooks/useFirestore';
import { where } from 'firebase/firestore';
import { useNotifications } from '../../hooks/useNotifications';

const CurriculumGroupsManagement = () => {
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('groups'); // groups, students, schedule, analytics
  
  const { data: curricula } = useCollection('curricula');
  const { data: users } = useCollection('users');
  const { data: subscriptions } = useCollection('subscriptions');
  const { data: curriculumGroups, add: addGroup, update: updateGroup, remove: removeGroup } = useCollection('curriculumGroups');
  const { data: trainers } = useCollection('users', [where('role', '==', 'trainer')]);
  const { add: addCurriculumSession } = useCollection('curriculumAttendanceSessions');
  const { sendAddedToGroupNotification, sendAssignedToGroupNotification } = useNotifications();

  const students = users.filter(u => u.role === 'student');

  const addAttendanceSession = async (groupId) => {
    const group = curriculumGroups.find(g => g.id === groupId);
    if (!group || group.status !== 'active') {
      alert('يمكن إضافة جلسات حضور للمجموعات المفعلة فقط');
      return;
    }

    const curriculum = curricula.find(c => c.id === group.curriculumId);
    const currentLevel = group.progress?.currentLevel || 1;
    
    const sessionData = {
      sessionNumber: prompt('رقم الجلسة:'),
      topic: prompt('موضوع الجلسة:'),
      level: currentLevel
    };
    
    if (!sessionData.sessionNumber || !sessionData.topic) return;

    try {
      await addCurriculumSession({
        groupId: group.id,
        groupName: group.name,
        curriculumId: group.curriculumId,
        curriculumName: curriculum?.title,
        sessionNumber: parseInt(sessionData.sessionNumber),
        sessionDate: new Date(),
        sessionTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
        topic: sessionData.topic,
        level: sessionData.level,
        attendance: group.students?.map(studentId => {
          const student = users.find(u => u.id === studentId);
          return {
            studentId,
            studentName: student ? `${student.firstName} ${student.lastName}` : 'غير معروف',
            status: 'present'
          };
        }) || [],
        summary: {
          totalStudents: group.students?.length || 0,
          presentCount: group.students?.length || 0,
          absentCount: 0,
          lateCount: 0
        },
        notes: `جلسة ${sessionData.topic} - المرحلة ${currentLevel}`
      });

      alert('تم إضافة جلسة الحضور بنجاح!');
    } catch (error) {
      console.error('Error adding attendance session:', error);
      alert('خطأ في إضافة جلسة الحضور');
    }
  };

  const getFilteredGroups = () => {
    let filteredGroups = selectedCurriculum 
      ? curriculumGroups.filter(g => g.curriculumId === selectedCurriculum.id)
      : curriculumGroups;

    if (statusFilter !== 'all') {
      filteredGroups = filteredGroups.filter(g => g.status === statusFilter);
    }

    if (searchTerm) {
      filteredGroups = filteredGroups.filter(g => 
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.curriculumName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.trainerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filteredGroups;
  };

  // --- إصلاح الخطأ البرمجي هنا ---
  const getCurriculumStudents = (curriculumId) => {
    const curriculum = curricula.find(c => c.id === curriculumId);
    if (!curriculum) return [];

    // طلاب لديهم اشتراك نشط في المنهج
    const activeSubscriptions = subscriptions.filter(sub => 
      sub.curriculumId === curriculumId && 
      sub.status === 'active' &&
      sub.currentLevelAccessExpiresAt && // التأكد من وجود الحقل قبل استخدامه
      new Date(sub.currentLevelAccessExpiresAt.toDate()) > new Date()
    );

    return students.filter(student => {
      const hasActiveSubscription = activeSubscriptions.some(sub => sub.studentId === student.id);
      if (!hasActiveSubscription) return false;

      return student.age >= curriculum.ageRangeFrom && student.age <= curriculum.ageRangeTo;
    });
  };

  const getAvailableStudents = (curriculumId) => {
    const curriculumStudents = getCurriculumStudents(curriculumId);
    const activeGroupedStudentIds = new Set();
    
    curriculumGroups.forEach(group => {
      if (group.curriculumId === curriculumId && group.status === 'active') {
        group.students?.forEach(studentId => {
          activeGroupedStudentIds.add(studentId);
        });
      }
    });
    
    return curriculumStudents.filter(student => !activeGroupedStudentIds.has(student.id));
  };

  const determineGroupStatus = (studentCount, minSize, maxSize, hasTrainer = false) => {
    if (studentCount === 0) return 'pending';
    if (studentCount < minSize) return 'pending';
    if (studentCount >= minSize && studentCount <= maxSize) {
      return hasTrainer ? 'ready' : 'ready';
    }
    return 'overfull';
  };

  const getGroupStats = (groupId) => {
    const group = curriculumGroups.find(g => g.id === groupId);
    if (!group) return null;

    const curriculum = curricula.find(c => c.id === group.curriculumId);
    const sessions = [];
    
    const avgAttendanceRate = 85;
    
    return {
      group,
      curriculum,
      totalStudents: group.students?.length || 0,
      avgAttendanceRate,
      totalSessions: sessions.length,
      hasTrainer: !!group.trainerId,
      isBalanced: group.students?.length >= group.minSize && group.students?.length <= group.maxSize
    };
  };

  const calculateExpectedEndDate = (group) => {
    const curriculum = curricula.find(c => c.id === group.curriculumId);
    if (!curriculum?.duration) return null;

    const startDate = new Date();
    if (curriculum.duration.includes('شهر')) {
      const months = parseInt(curriculum.duration.match(/\d+/)[0]);
      startDate.setMonth(startDate.getMonth() + months);
    } else if (curriculum.duration.includes('سنة')) {
      const years = parseInt(curriculum.duration.match(/\d+/)[0]);
      startDate.setFullYear(startDate.getFullYear() + years);
    }
    
    return startDate;
  };

  const changeGroupStatus = async (group, newStatus) => {
    if (newStatus === 'active') {
      if (!group.students || group.students.length < group.minSize) {
        alert(`لا يمكن تفعيل المجموعة. الحد الأدنى ${group.minSize} طلاب`);
        return;
      }
      if (!group.trainerId) {
        const confirm = window.confirm('المجموعة بدون مدرب. هل تريد التفعيل بدون مدرب؟');
        if (!confirm) return;
      }
    }

    try {
      const updateData = {
        status: newStatus,
        statusChangedAt: new Date(),
        statusChangedBy: 'admin'
      };

      if (newStatus === 'active') {
        updateData.activatedAt = new Date();
        updateData.expectedEndDate = calculateExpectedEndDate(group);
      }

      await updateGroup(group.id, updateData);
      alert(`تم تغيير حالة المجموعة إلى: ${getStatusLabel(newStatus)}`);
    } catch (error) {
      console.error('Error changing group status:', error);
      alert('خطأ في تغيير حالة المجموعة');
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'قيد الإنشاء';
      case 'ready': return 'جاهزة للتفعيل';
      case 'active': return 'مفعلة';
      case 'inactive': return 'غير مفعلة';
      case 'completed': return 'مكتملة';
      case 'overfull': return 'ممتلئة أكثر من اللازم';
      default: return 'غير محدد';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'ready': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'active': return 'bg-green-100 text-green-800 border-green-300';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'completed': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'overfull': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={16} />;
      case 'ready': return <CheckCircle size={16} />;
      case 'active': return <Play size={16} />;
      case 'inactive': return <Pause size={16} />;
      case 'completed': return <Award size={16} />;
      case 'overfull': return <AlertCircle size={16} />;
      default: return <Settings size={16} />;
    }
  };

  const CreateGroupForm = () => {
    const [groupData, setGroupData] = useState({
      name: '',
      description: '',
      minSize: selectedCurriculum?.minGroupSize || 8,
      maxSize: selectedCurriculum?.maxGroupSize || 15,
      trainerId: '',
      students: [],
      level: 1,
      startDate: new Date().toISOString().split('T')[0],
      expectedEndDate: '',
      schedule: {
        days: [],
        time: '',
        duration: selectedCurriculum?.groupSettings?.sessionDuration || 90,
        weeklySessionsCount: selectedCurriculum?.groupSettings?.weeklySessionsCount || 2
      },
      groupSettings: {
        allowLateJoin: true,
        maxAbsences: 3,
        requireHomework: false,
        autoProgress: false
      }
    });
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
      if (editingGroup) {
        setGroupData({
          name: editingGroup.name,
          description: editingGroup.description || '',
          minSize: editingGroup.minSize || 8,
          maxSize: editingGroup.maxSize || 15,
          trainerId: editingGroup.trainerId || '',
          students: editingGroup.students || [],
          level: editingGroup.level || 1,
          startDate: editingGroup.startDate || new Date().toISOString().split('T')[0],
          expectedEndDate: editingGroup.expectedEndDate || '',
          schedule: editingGroup.schedule || {
            days: [],
            time: '',
            duration: selectedCurriculum?.groupSettings?.sessionDuration || 90,
            weeklySessionsCount: selectedCurriculum?.groupSettings?.weeklySessionsCount || 2
          },
          groupSettings: editingGroup.groupSettings || {
            allowLateJoin: true,
            maxAbsences: 3,
            requireHomework: false,
            autoProgress: false
          }
        });
      }
    }, [editingGroup]);

    const availableStudents = selectedCurriculum ? getAvailableStudents(selectedCurriculum.id) : [];
    const allAvailableStudents = editingGroup 
      ? [...availableStudents, ...users.filter(u => editingGroup.students?.includes(u.id))]
      : availableStudents;

    const handleAddStudent = (studentId) => {
      if (groupData.students.length < groupData.maxSize) {
        setGroupData(prev => ({
          ...prev,
          students: [...prev.students, studentId]
        }));
      }
    };

    const handleRemoveStudent = (studentId) => {
      setGroupData(prev => ({
        ...prev,
        students: prev.students.filter(id => id !== studentId)
      }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!selectedCurriculum) return;
      
      setLoading(true);
      try {
        const autoStatus = determineGroupStatus(
          groupData.students.length, 
          groupData.minSize, 
          groupData.maxSize,
          !!groupData.trainerId
        );
        
        const groupInfo = {
          curriculumId: selectedCurriculum.id,
          curriculumName: selectedCurriculum.title,
          name: groupData.name,
          description: groupData.description,
          minSize: parseInt(groupData.minSize),
          maxSize: parseInt(groupData.maxSize),
          trainerId: groupData.trainerId || null,
          trainerName: groupData.trainerId ? trainers.find(t => t.id === groupData.trainerId)?.firstName + ' ' + trainers.find(t => t.id === groupData.trainerId)?.lastName : null,
          students: groupData.students,
          studentCount: groupData.students.length,
          level: parseInt(groupData.level),
          startDate: groupData.startDate,
          expectedEndDate: groupData.expectedEndDate || calculateExpectedEndDate({curriculumId: selectedCurriculum.id}),
          schedule: {
            ...groupData.schedule,
            duration: parseInt(groupData.schedule.duration),
            weeklySessionsCount: parseInt(groupData.schedule.weeklySessionsCount)
          },
          groupSettings: groupData.groupSettings,
          status: editingGroup?.status || autoStatus,
          createdAt: editingGroup?.createdAt || new Date(),
          updatedAt: new Date(),
          progress: {
            currentLevel: parseInt(groupData.level),
            completedLevels: editingGroup?.progress?.completedLevels || [],
            startedAt: editingGroup?.progress?.startedAt || new Date(),
            totalSessions: 0,
            completedSessions: 0
          },
          analytics: {
            averageAttendance: 0,
            completionRate: 0,
            lastSessionDate: null
          }
        };

        if (editingGroup) {
          await updateGroup(editingGroup.id, groupInfo);
          alert('تم تحديث المجموعة بنجاح!');
        } else {
          await addGroup(groupInfo);
          alert(`تم إنشاء المجموعة بنجاح! الحالة: ${getStatusLabel(autoStatus)}`);
        }
        
        // إرسال الإشعارات
        const prevStudents = new Set(editingGroup?.students || []);
        const newStudents = groupInfo.students.filter(id => !prevStudents.has(id));
        
        newStudents.forEach(studentId => {
          sendAddedToGroupNotification(
            studentId,
            groupInfo.name,
            groupInfo.curriculumName,
            '/my-curricula'
          );
        });
        
        if (groupInfo.trainerId && groupInfo.trainerId !== editingGroup?.trainerId) {
          sendAssignedToGroupNotification(
            groupInfo.trainerId,
            groupInfo.name,
            groupInfo.curriculumName,
            '/trainer/dashboard'
          );
        }

        setGroupData({
          name: '', 
          description: '', 
          minSize: selectedCurriculum?.minGroupSize || 8, 
          maxSize: selectedCurriculum?.maxGroupSize || 15, 
          trainerId: '', 
          students: [],
          level: 1,
          startDate: new Date().toISOString().split('T')[0],
          expectedEndDate: '',
          schedule: {
            days: [],
            time: '',
            duration: selectedCurriculum?.groupSettings?.sessionDuration || 90,
            weeklySessionsCount: selectedCurriculum?.groupSettings?.weeklySessionsCount || 2
          },
          groupSettings: {
            allowLateJoin: true,
            maxAbsences: 3,
            requireHomework: false,
            autoProgress: false
          }
        });
        setShowCreateGroup(false);
        setEditingGroup(null);
      } catch (error) {
        console.error('Error saving group:', error);
        alert('حدث خطأ في حفظ المجموعة');
      }
      setLoading(false);
    };

    const autoFillGroup = () => {
      const availableCount = Math.min(allAvailableStudents.length, groupData.maxSize);
      const selectedStudents = allAvailableStudents.slice(0, availableCount);
      setGroupData(prev => ({
        ...prev,
        students: selectedStudents.map(s => s.id)
      }));
    };

    const currentStatus = determineGroupStatus(groupData.students.length, groupData.minSize, groupData.maxSize, !!groupData.trainerId);

    const daysOfWeek = [
      { value: 'saturday', label: 'السبت' },
      { value: 'sunday', label: 'الأحد' },
      { value: 'monday', label: 'الاثنين' },
      { value: 'tuesday', label: 'الثلاثاء' },
      { value: 'wednesday', label: 'الأربعاء' },
      { value: 'thursday', label: 'الخميس' },
      { value: 'friday', label: 'الجمعة' }
    ];

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-6">
          {editingGroup ? 'تعديل المجموعة' : 'إنشاء مجموعة جديدة'} - {selectedCurriculum?.title}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium mb-2">اسم المجموعة</label>
              <input type="text" value={groupData.name} onChange={(e) => setGroupData({...groupData, name: e.target.value})} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" placeholder="مثال: مجموعة المبتدئين أ" required />
            </div>
            <div>
              <label className="block font-medium mb-2">الحد الأدنى</label>
              <input type="number" value={groupData.minSize} onChange={(e) => setGroupData({...groupData, minSize: parseInt(e.target.value)})} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" min="3" max="50" required />
            </div>
            <div>
              <label className="block font-medium mb-2">الحد الأقصى</label>
              <input type="number" value={groupData.maxSize} onChange={(e) => setGroupData({...groupData, maxSize: parseInt(e.target.value)})} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" min="5" max="50" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium mb-2">المدرب المخصص</label>
              <select value={groupData.trainerId} onChange={(e) => setGroupData({...groupData, trainerId: e.target.value})} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500">
                <option value="">اختر مدرب (اختياري)</option>
                {trainers.map(trainer => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.firstName} {trainer.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium mb-2">المرحلة البدائية</label>
              <select value={groupData.level} onChange={(e) => setGroupData({...groupData, level: parseInt(e.target.value)})} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" required>
                {selectedCurriculum?.levels?.map((level, index) => (
                  <option key={index + 1} value={index + 1}>
                    المرحلة {index + 1}: {level.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium mb-2">تاريخ البدء</label>
              <input type="date" value={groupData.startDate} onChange={(e) => setGroupData({...groupData, startDate: e.target.value})} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" required />
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} />
              جدولة المجموعة
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-medium mb-2">أيام الأسبوع</label>
                <div className="space-y-2">
                  {daysOfWeek.map(day => (
                    <label key={day.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={groupData.schedule.days.includes(day.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGroupData(prev => ({
                              ...prev,
                              schedule: { ...prev.schedule, days: [...prev.schedule.days, day.value] }
                            }));
                          } else {
                            setGroupData(prev => ({
                              ...prev,
                              schedule: { ...prev.schedule, days: prev.schedule.days.filter(d => d !== day.value) }
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-medium mb-2">وقت الجلسة</label>
                <input type="time" value={groupData.schedule.time} onChange={(e) => setGroupData({ ...groupData, schedule: { ...groupData.schedule, time: e.target.value } })} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block font-medium mb-2">مدة الجلسة (دقيقة)</label>
                <input type="number" value={groupData.schedule.duration} onChange={(e) => setGroupData({ ...groupData, schedule: { ...groupData.schedule, duration: parseInt(e.target.value) } })} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" min="30" max="180" />
              </div>
              <div>
                <label className="block font-medium mb-2">جلسات أسبوعية</label>
                <input type="number" value={groupData.schedule.weeklySessionsCount} onChange={(e) => setGroupData({ ...groupData, schedule: { ...groupData.schedule, weeklySessionsCount: parseInt(e.target.value) } })} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" min="1" max="7" />
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="text-green-600" size={20} />
              إعدادات المجموعة
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-2">الحد الأقصى للغيابات</label>
                <input type="number" value={groupData.groupSettings.maxAbsences} onChange={(e) => setGroupData({ ...groupData, groupSettings: { ...groupData.groupSettings, maxAbsences: parseInt(e.target.value) } })} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" min="0" max="10" />
              </div>
            </div>
            <div className="space-y-3 mt-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={groupData.groupSettings.allowLateJoin} onChange={(e) => setGroupData({ ...groupData, groupSettings: { ...groupData.groupSettings, allowLateJoin: e.target.checked } })} className="rounded" />
                <span>السماح بالانضمام المتأخر</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={groupData.groupSettings.requireHomework} onChange={(e) => setGroupData({ ...groupData, groupSettings: { ...groupData.groupSettings, requireHomework: e.target.checked } })} className="rounded" />
                <span>يتطلب واجبات منزلية</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={groupData.groupSettings.autoProgress} onChange={(e) => setGroupData({ ...groupData, groupSettings: { ...groupData.groupSettings, autoProgress: e.target.checked } })} className="rounded" />
                <span>التقدم التلقائي للمراحل</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block font-medium mb-2">وصف المجموعة</label>
            <textarea value={groupData.description} onChange={(e) => setGroupData({...groupData, description: e.target.value})} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" rows="3" placeholder="وصف مختصر للمجموعة..." />
          </div>
          <div className={`p-4 rounded-lg border ${getStatusColor(currentStatus)}`}>
            <div className="flex items-center gap-2">
              {getStatusIcon(currentStatus)}
              <span className="font-medium">الحالة المتوقعة: {getStatusLabel(currentStatus)}</span>
            </div>
            <p className="text-sm mt-2">
              {currentStatus === 'pending' && 'تحتاج المزيد من الطلاب للوصول للحد الأدنى'}
              {currentStatus === 'ready' && 'جاهزة للتفعيل! العدد والإعدادات مناسبة'}
              {currentStatus === 'overfull' && 'تحتوي على طلاب أكثر من الحد الأقصى'}
            </p>
            {!groupData.trainerId && (
              <p className="text-sm mt-1 text-orange-600">
                💡 تحديد مدرب سيحسن من كفاءة المجموعة
              </p>
            )}
          </div>
          {selectedCurriculum && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-800 mb-2">معلومات المنهج:</h4>
              <div className="text-purple-700 text-sm space-y-1">
                <p><strong>الفئة:</strong> {selectedCurriculum.category}</p>
                <p><strong>الفئة العمرية:</strong> من {selectedCurriculum.ageRangeFrom} إلى {selectedCurriculum.ageRangeTo} سنة</p>
                <p><strong>الطلاب المتاحين:</strong> {availableStudents.length} طالب</p>
                <p><strong>عدد المراحل:</strong> {selectedCurriculum.levels?.length || 0} مرحلة</p>
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">
                اختيار الطلاب ({groupData.students.length}/{groupData.maxSize})
              </h4>
              <div className="flex gap-2">
                <button type="button" onClick={autoFillGroup} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2">
                  <Copy size={16} />
                  تعبئة تلقائية
                </button>
              </div>
            </div>
            <div className="relative mb-4">
              <Search className="absolute right-3 top-3 text-gray-400" size={20} />
              <input type="text" placeholder="ابحث عن طالب..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border rounded-lg pr-12 pl-4 py-2 focus:outline-none focus:border-purple-500" />
            </div>
            {groupData.students.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium mb-2">الطلاب المختارين:</h5>
                <div className="flex flex-wrap gap-2">
                  {groupData.students.map(studentId => {
                    const student = users.find(u => u.id === studentId);
                    return student ? (
                      <div key={studentId} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        {student.firstName} {student.lastName}
                        <span className="text-xs">({student.age} سنة)</span>
                        <button type="button" onClick={() => handleRemoveStudent(studentId)} className="hover:bg-purple-200 rounded-full p-1">
                          <X size={12} />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 gap-2">
                {allAvailableStudents
                  .filter(student =>
                    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    student.phone.includes(searchTerm)
                  )
                  .map(student => {
                    const subscription = subscriptions.find(sub => 
                      sub.studentId === student.id && 
                      sub.curriculumId === selectedCurriculum.id &&
                      sub.status === 'active'
                    );
                    
                    return (
                      <div 
                        key={student.id} 
                        className={`flex items-center justify-between p-3 bg-white rounded-lg border transition-colors ${
                          groupData.students.includes(student.id) ? 'border-purple-300 bg-purple-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold text-sm">
                              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{student.firstName} {student.lastName}</p>
                            <p className="text-sm text-gray-600">{student.phone} • {student.age} سنة</p>
                            {subscription && subscription.expiresAt && (
                              <p className="text-xs text-green-600">
                                اشتراك {subscription.planLabel} - ينتهي {new Date(subscription.expiresAt.toDate()).toLocaleDateString('ar-EG')}
                              </p>
                            )}
                          </div>
                        </div>
                        {groupData.students.includes(student.id) ? (
                          <button type="button" onClick={() => handleRemoveStudent(student.id)} className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 transition-colors" title="إزالة من المجموعة">
                            <UserMinus size={16} />
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleAddStudent(student.id)} disabled={groupData.students.length >= groupData.maxSize} className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="إضافة للمجموعة">
                            <UserPlus size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                {allAvailableStudents.filter(student =>
                  student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  student.phone.includes(searchTerm)
                ).length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    {searchTerm ? 'لا توجد نتائج بحث' : 'لا يوجد طلاب متاحين'}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || groupData.students.length === 0}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? 'جاري الحفظ...' : editingGroup ? 'تحديث المجموعة' : 'إنشاء المجموعة'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateGroup(false);
                setEditingGroup(null);
                setSearchTerm('');
              }}
              className="bg-gray-400 text-white px-6 py-3 rounded-lg hover:bg-gray-500 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    );
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setShowCreateGroup(true);
  };

  const handleDeleteGroup = async (group) => {
    if (window.confirm(`هل أنت متأكد من حذف مجموعة "${group.name}"؟`)) {
      try {
        await removeGroup(group.id);
        alert('تم حذف المجموعة بنجاح!');
      } catch (error) {
        console.error('Error deleting group:', error);
        alert('حدث خطأ في حذف المجموعة');
      }
    }
  };

  const assignGroupToTrainer = async (groupId, trainerId) => {
    try {
      const trainer = trainers.find(t => t.id === trainerId);
      await updateGroup(groupId, {
        trainerId: trainerId || null,
        trainerName: trainer ? `${trainer.firstName} ${trainer.lastName}` : null
      });
      alert('تم تخصيص المدرب بنجاح!');
    } catch (error) {
      console.error('Error assigning trainer:', error);
      alert('حدث خطأ في تخصيص المدرب');
    }
  };

  const filteredGroups = getFilteredGroups();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">إدارة مجموعات المناهج</h2>
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">
            <span className="font-semibold">{curriculumGroups.length}</span> مجموعة إجمالية
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">اختر المنهج</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {curricula.filter(c => c.isActive).map(curriculum => {
            const curriculumStudentsCount = getCurriculumStudents(curriculum.id).length;
            const curriculumGroupsCount = curriculumGroups.filter(g => g.curriculumId === curriculum.id).length;
            const activeGroupsCount = curriculumGroups.filter(g => g.curriculumId === curriculum.id && g.status === 'active').length;
            
            return (
              <div
                key={curriculum.id}
                onClick={() => setSelectedCurriculum(curriculum)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedCurriculum?.id === curriculum.id 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h4 className="font-semibold">{curriculum.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{curriculum.category}</p>
                <p className="text-xs text-purple-600 mt-1">
                  الفئة العمرية: {curriculum.ageRangeFrom}-{curriculum.ageRangeTo} سنة
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {curriculumStudentsCount} طالب • {curriculumGroupsCount} مجموعة ({activeGroupsCount} مفعلة)
                </p>
                <div className="mt-2 text-xs text-purple-600">
                  الطلاب المتاحين: {getAvailableStudents(curriculum.id).length}
                </div>
              </div>
            );
          })}
        </div>
        
        {curricula.filter(c => c.isActive).length === 0 && (
          <p className="text-gray-600 text-center py-4">لا توجد مناهج نشطة متاحة</p>
        )}
      </div>

      {selectedCurriculum && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <BookOpen className="mx-auto text-blue-600 mb-2" size={24} />
              <p className="text-2xl font-bold text-blue-900">{getCurriculumStudents(selectedCurriculum.id).length}</p>
              <p className="text-gray-600 text-sm">طلاب مشتركين</p>
            </div>
            
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <Play className="mx-auto text-green-600 mb-2" size={24} />
              <p className="text-2xl font-bold text-green-900">
                {curriculumGroups.filter(g => g.curriculumId === selectedCurriculum.id && g.status === 'active').length}
              </p>
              <p className="text-gray-600 text-sm">مجموعات مفعلة</p>
            </div>
            
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <Clock className="mx-auto text-yellow-600 mb-2" size={24} />
              <p className="text-2xl font-bold text-yellow-900">
                {curriculumGroups.filter(g => g.curriculumId === selectedCurriculum.id && g.status === 'pending').length}
              </p>
              <p className="text-gray-600 text-sm">قيد الإنشاء</p>
            </div>
            
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <User className="mx-auto text-purple-600 mb-2" size={24} />
              <p className="text-2xl font-bold text-purple-900">{getAvailableStudents(selectedCurriculum.id).length}</p>
              <p className="text-gray-600 text-sm">طلاب متاحين</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setShowCreateGroup(true)}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                إنشاء مجموعة جديدة
              </button>

              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute right-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="ابحث في المجموعات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border rounded-lg pr-12 pl-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              >
                <option value="all">جميع الحالات</option>
                <option value="pending">قيد الإنشاء</option>
                <option value="ready">جاهزة للتفعيل</option>
                <option value="active">مفعلة</option>
                <option value="inactive">غير مفعلة</option>
              </select>
            </div>
          </div>

          {showCreateGroup && <CreateGroupForm />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredGroups.map(group => (
              <div key={group.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold">{group.name}</h4>
                    <p className="text-sm text-gray-600">{group.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditGroup(group)}
                      className="text-blue-600 hover:text-blue-700 p-2"
                      title="تعديل المجموعة"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group)}
                      className="text-red-600 hover:text-red-700 p-2"
                      title="حذف المجموعة"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${getStatusColor(group.status)}`}>
                    {getStatusIcon(group.status)}
                    {getStatusLabel(group.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-600">عدد الطلاب:</span>
                    <span className="font-semibold ml-2">
                      {group.studentCount}/{group.maxSize}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">المرحلة الحالية:</span>
                    <span className="font-semibold ml-2">{group.level || 1}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">الحد الأدنى:</span>
                    <span className="font-semibold ml-2">{group.minSize}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">تاريخ البدء:</span>
                    <span className="font-semibold ml-2">
                      {group.startDate ? new Date(group.startDate).toLocaleDateString('ar-EG') : '-'}
                    </span>
                  </div>
                </div>

                {group.schedule && (group.schedule.days?.length > 0 || group.schedule.time) && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-800 mb-2">الجدولة:</h5>
                    <div className="text-blue-700 text-sm space-y-1">
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
                      {group.schedule.duration && (
                        <p><strong>مدة الجلسة:</strong> {group.schedule.duration} دقيقة</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">المدرب المخصص:</label>
                  <select
                    value={group.trainerId || ''}
                    onChange={(e) => assignGroupToTrainer(group.id, e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                    disabled={group.status === 'active'}
                  >
                    <option value="">لا يوجد مدرب محدد</option>
                    {trainers.map(trainer => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.firstName} {trainer.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>امتلاء المجموعة</span>
                    <span>{Math.round((group.studentCount / group.maxSize) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        group.studentCount >= group.minSize ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min((group.studentCount / group.maxSize) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>الحد الأدنى: {group.minSize}</span>
                    <span>الحد الأقصى: {group.maxSize}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.status === 'pending' && group.studentCount >= group.minSize && (
                    <button onClick={() => changeGroupStatus(group, 'active')} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                      <Play size={16} />
                      تفعيل المجموعة
                    </button>
                  )}
                  {group.status === 'ready' && (
                    <button onClick={() => changeGroupStatus(group, 'active')} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                      <Play size={16} />
                      تفعيل المجموعة
                    </button>
                  )}
                  {group.status === 'active' && (
                    <>
                      <button onClick={() => changeGroupStatus(group, 'inactive')} className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2">
                        <Pause size={16} />
                        إيقاف المجموعة
                      </button>
                      <button onClick={() => addAttendanceSession(group.id)} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                        <BarChart3 size={16} />
                        إضافة جلسة حضور
                      </button>
                    </>
                  )}
                  {group.status === 'inactive' && (
                    <button onClick={() => changeGroupStatus(group, 'active')} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                      <Play size={16} />
                      إعادة تفعيل المجموعة
                    </button>
                  )}
                  {group.status === 'pending' && group.studentCount < group.minSize && (
                    <div className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg text-center text-sm">
                      <AlertCircle className="inline mr-2" size={16} />
                      يحتاج {group.minSize - group.studentCount} طلاب إضافيين للتفعيل
                    </div>
                  )}
                  {group.status === 'overfull' && (
                    <div className="w-full bg-red-100 text-red-600 py-2 rounded-lg text-center text-sm">
                      <AlertCircle className="inline mr-2" size={16} />
                      المجموعة ممتلئة أكثر من اللازم ({group.studentCount}/{group.maxSize})
                    </div>
                  )}
                </div>

                <details className="group mt-4">
                  <summary className="cursor-pointer text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2">
                    <Users size={16} />
                    عرض الطلاب ({group.studentCount})
                  </summary>
                  <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                    {group.students?.map(studentId => {
                      const student = users.find(u => u.id === studentId);
                      const subscription = subscriptions.find(sub => 
                        sub.studentId === studentId && 
                        sub.curriculumId === selectedCurriculum.id &&
                        sub.status === 'active'
                      );
                      
                      return student ? (
                        <div key={studentId} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-600 font-semibold text-xs">
                                {student.firstName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">{student.firstName} {student.lastName}</span>
                              <span className="text-gray-500 text-xs ml-2">({student.phone})</span>
                            </div>
                          </div>
                          <div className="text-xs text-purple-600">
                            {student.age} سنة
                            {subscription && subscription.expiresAt && (
                              <div className="text-green-600">
                                {subscription.planLabel}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </details>
              </div>
            ))}
            
            {filteredGroups.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                <Users className="mx-auto mb-4" size={48} />
                <p>
                  {searchTerm || statusFilter !== 'all' 
                    ? 'لا توجد مجموعات تطابق المعايير المحددة' 
                    : 'لا توجد مجموعات لهذا المنهج حتى الآن'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <p className="text-sm mt-2">ابدأ بإنشاء مجموعة جديدة</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CurriculumGroupsManagement;