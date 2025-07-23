// src/components/Admin/GroupsManagement.js
import React, { useState } from 'react';
import { 
  Users, Plus, Edit, Trash2, UserPlus, UserMinus, 
  BookOpen, User, Save, X, Search, Filter, Copy, Send,
  Play, Pause, Clock, CheckCircle, AlertCircle, Settings
} from 'lucide-react';
import { useCollection } from '../../hooks/useFirestore';
import { where } from 'firebase/firestore';

const GroupsManagement = () => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, active, inactive
  
  // جلب البيانات - move all hooks to top level
  const { data: courses } = useCollection('courses');
  const { data: users } = useCollection('users');
  const { data: enrollments } = useCollection('enrollments');
  const { data: groups, add: addGroup, update: updateGroup, remove: removeGroup } = useCollection('courseGroups');
  const { data: trainers } = useCollection('users', [where('role', '==', 'trainer')]);
  const { data: subscriptions } = useCollection('subscriptions');
  const { data: curricula } = useCollection('curricula');

  // فلترة المجموعات حسب الكورس والحالة
  const getFilteredGroups = () => {
    let filteredGroups = selectedCourse 
      ? groups.filter(g => g.courseId === selectedCourse.id)
      : groups;

    // فلترة حسب الحالة
    if (statusFilter !== 'all') {
      filteredGroups = filteredGroups.filter(g => g.status === statusFilter);
    }

    // فلترة حسب البحث
    if (searchTerm) {
      filteredGroups = filteredGroups.filter(g => 
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.courseName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filteredGroups;
  };

  // جلب الطلاب المسجلين في الكورس والمناسبين للفئة العمرية
  const getCourseStudents = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return [];

    // طلاب الكورسات العادية
    const courseEnrollments = enrollments.filter(e => e.courseId === courseId);
    const courseStudents = users.filter(u => 
      u.role === 'student' && 
      courseEnrollments.some(e => e.studentId === u.id) &&
      // التحقق من الفئة العمرية
      u.age >= course.ageRangeFrom && 
      u.age <= course.ageRangeTo
    );

    // طلاب المناهج المشتركين (إذا كان الكورس يدعم الطلاب من مناهج مشابهة)
    const curriculumStudents = users.filter(u => {
      if (u.role !== 'student') return false;
      if (u.age < course.ageRangeFrom || u.age > course.ageRangeTo) return false;
      
      // <-- التعديل الجديد لإصلاح الخطأ -->
      // التحقق من وجود اشتراك نشط في منهج من نفس الفئة
      const hasActiveSubscription = subscriptions.some(sub => {
        if (sub.studentId !== u.id || sub.status !== 'active') return false;
        // التأكد من وجود الحقل قبل استخدامه
        if (!sub.expiresAt || !sub.expiresAt.toDate) return false; 
        if (new Date(sub.expiresAt.toDate()) <= new Date()) return false;
        
        const curriculum = curricula.find(c => c.id === sub.curriculumId);
        return curriculum && curriculum.category === course.category;
      });
      
      return hasActiveSubscription;
    });

    // دمج الطلاب وإزالة المكررات
    const allStudents = [...courseStudents, ...curriculumStudents];
    const uniqueStudents = allStudents.filter((student, index, self) => 
      index === self.findIndex(s => s.id === student.id)
    );

    return uniqueStudents;
  };

  // جلب الطلاب غير المجمعين أو في مجموعات غير مفعلة
  const getAvailableStudents = (courseId) => {
    const courseStudents = getCourseStudents(courseId);
    const activeGroupedStudentIds = new Set();
    
    // جمع الطلاب في المجموعات المفعلة فقط
    groups.forEach(group => {
      if (group.courseId === courseId && group.status === 'active') {
        group.students?.forEach(studentId => {
          activeGroupedStudentIds.add(studentId);
        });
      }
    });
    
    return courseStudents.filter(student => !activeGroupedStudentIds.has(student.id));
  };

  // تحديد حالة المجموعة تلقائياً
  const determineGroupStatus = (studentCount, minSize, maxSize) => {
    if (studentCount === 0) return 'pending';
    if (studentCount < minSize) return 'pending';
    if (studentCount >= minSize && studentCount <= maxSize) return 'ready'; // جاهزة للتفعيل
    return 'overfull'; // ممتلئة أكثر من اللازم
  };

  // تغيير حالة المجموعة
  const changeGroupStatus = async (group, newStatus) => {
    try {
      await updateGroup(group.id, {
        status: newStatus,
        statusChangedAt: new Date(),
        statusChangedBy: 'admin' // يمكن تغييرها لمعرف المستخدم الحالي
      });
      alert(`تم تغيير حالة المجموعة إلى: ${getStatusLabel(newStatus)}`);
    } catch (error) {
      console.error('Error changing group status:', error);
      alert('خطأ في تغيير حالة المجموعة');
    }
  };

  // الحصول على تسمية الحالة
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'قيد الإنشاء';
      case 'ready': return 'جاهزة للتفعيل';
      case 'active': return 'مفعلة';
      case 'inactive': return 'غير مفعلة';
      case 'overfull': return 'ممتلئة أكثر من اللازم';
      default: return 'غير محدد';
    }
  };

  // الحصول على لون الحالة
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'ready': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'active': return 'bg-green-100 text-green-800 border-green-300';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'overfull': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // الحصول على أيقونة الحالة
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={16} />;
      case 'ready': return <CheckCircle size={16} />;
      case 'active': return <Play size={16} />;
      case 'inactive': return <Pause size={16} />;
      case 'overfull': return <AlertCircle size={16} />;
      default: return <Settings size={16} />;
    }
  };

  const CreateGroupForm = () => {
    const [groupData, setGroupData] = useState({
      name: '',
      description: '',
      minSize: 8,
      maxSize: 15,
      trainerId: '',
      students: []
    });
    const [loading, setLoading] = useState(false);

    // تهيئة البيانات عند التعديل
    React.useEffect(() => {
      if (editingGroup) {
        setGroupData({
          name: editingGroup.name,
          description: editingGroup.description || '',
          minSize: editingGroup.minSize || 8,
          maxSize: editingGroup.maxSize || 15,
          trainerId: editingGroup.trainerId || '',
          students: editingGroup.students || []
        });
      }
    }, [editingGroup]);

    const availableStudents = selectedCourse ? getAvailableStudents(selectedCourse.id) : [];
    const filteredStudents = availableStudents.filter(student =>
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phone.includes(searchTerm)
    );

    // إضافة الطلاب المحددين مسبقاً (في حالة التعديل) للقائمة المتاحة
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
      if (!selectedCourse) return;
      
      setLoading(true);
      try {
        // تحديد الحالة التلقائية
        const autoStatus = determineGroupStatus(groupData.students.length, groupData.minSize, groupData.maxSize);
        
        const groupInfo = {
          courseId: selectedCourse.id,
          courseName: selectedCourse.title,
          name: groupData.name,
          description: groupData.description,
          minSize: parseInt(groupData.minSize),
          maxSize: parseInt(groupData.maxSize),
          trainerId: groupData.trainerId || null,
          trainerName: groupData.trainerId ? trainers.find(t => t.id === groupData.trainerId)?.firstName + ' ' + trainers.find(t => t.id === groupData.trainerId)?.lastName : null,
          students: groupData.students,
          studentCount: groupData.students.length,
          status: editingGroup?.status || autoStatus, // في التعديل نحتفظ بالحالة الحالية
          createdAt: editingGroup?.createdAt || new Date(),
          updatedAt: new Date()
        };

        if (editingGroup) {
          await updateGroup(editingGroup.id, groupInfo);
          alert('تم تحديث المجموعة بنجاح!');
          setEditingGroup(null);
        } else {
          await addGroup(groupInfo);
          alert(`تم إنشاء المجموعة بنجاح! الحالة: ${getStatusLabel(autoStatus)}`);
        }

        setGroupData({ name: '', description: '', minSize: 8, maxSize: 15, trainerId: '', students: [] });
        setShowCreateGroup(false);
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

    const currentStatus = determineGroupStatus(groupData.students.length, groupData.minSize, groupData.maxSize);

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-6">
          {editingGroup ? 'تعديل المجموعة' : 'إنشاء مجموعة جديدة'} - {selectedCourse?.title}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* معلومات المجموعة الأساسية */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block font-medium mb-2">اسم المجموعة</label>
              <input
                type="text"
                value={groupData.name}
                onChange={(e) => setGroupData({...groupData, name: e.target.value})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                placeholder="مثال: مجموعة أ"
                required
              />
            </div>
            
            <div>
              <label className="block font-medium mb-2">الحد الأدنى</label>
              <input
                type="number"
                value={groupData.minSize}
                onChange={(e) => setGroupData({...groupData, minSize: parseInt(e.target.value)})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                min="3"
                max="50"
                required
              />
            </div>
            
            <div>
              <label className="block font-medium mb-2">الحد الأقصى</label>
              <input
                type="number"
                value={groupData.maxSize}
                onChange={(e) => setGroupData({...groupData, maxSize: parseInt(e.target.value)})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                min="5"
                max="50"
                required
              />
            </div>
            
            <div>
              <label className="block font-medium mb-2">المدرب المخصص</label>
              <select
                value={groupData.trainerId}
                onChange={(e) => setGroupData({...groupData, trainerId: e.target.value})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              >
                <option value="">اختر مدرب (اختياري)</option>
                {trainers.map(trainer => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.firstName} {trainer.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">وصف المجموعة</label>
            <textarea
              value={groupData.description}
              onChange={(e) => setGroupData({...groupData, description: e.target.value})}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              rows="3"
              placeholder="وصف مختصر للمجموعة..."
            />
          </div>

          {/* عرض الحالة المتوقعة */}
          <div className={`p-4 rounded-lg border ${getStatusColor(currentStatus)}`}>
            <div className="flex items-center gap-2">
              {getStatusIcon(currentStatus)}
              <span className="font-medium">الحالة المتوقعة: {getStatusLabel(currentStatus)}</span>
            </div>
            <p className="text-sm mt-2">
              {currentStatus === 'pending' && 'تحتاج المزيد من الطلاب للوصول للحد الأدنى'}
              {currentStatus === 'ready' && 'جاهزة للتفعيل! العدد مناسب'}
              {currentStatus === 'overfull' && 'تحتوي على طلاب أكثر من الحد الأقصى'}
            </p>
          </div>

          {/* معلومات الفئة العمرية للكورس */}
          {selectedCourse && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">معلومات الكورس:</h4>
              <div className="text-blue-700 text-sm space-y-1">
                <p><strong>الفئة:</strong> {selectedCourse.category}</p>
                <p><strong>الفئة العمرية:</strong> من {selectedCourse.ageRangeFrom} إلى {selectedCourse.ageRangeTo} سنة</p>
                <p><strong>الطلاب المتاحين:</strong> {availableStudents.length} طالب</p>
              </div>
            </div>
          )}

          {/* اختيار الطلاب */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">
                اختيار الطلاب ({groupData.students.length}/{groupData.maxSize})
              </h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={autoFillGroup}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                >
                  <Copy size={16} />
                  تعبئة تلقائية
                </button>
              </div>
            </div>

            {/* البحث في الطلاب */}
            <div className="relative mb-4">
              <Search className="absolute right-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="ابحث عن طالب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border rounded-lg pr-12 pl-4 py-2 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* الطلاب المختارين */}
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
                        <button
                          type="button"
                          onClick={() => handleRemoveStudent(studentId)}
                          className="hover:bg-purple-200 rounded-full p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* قائمة الطلاب المتاحين */}
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 gap-2">
                {allAvailableStudents
                  .filter(student =>
                    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    student.phone.includes(searchTerm)
                  )
                  .map(student => (
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
                        </div>
                      </div>
                      
                      {groupData.students.includes(student.id) ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveStudent(student.id)}
                          className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 transition-colors"
                          title="إزالة من المجموعة"
                        >
                          <UserMinus size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddStudent(student.id)}
                          disabled={groupData.students.length >= groupData.maxSize}
                          className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="إضافة للمجموعة"
                        >
                          <UserPlus size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                
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

          {/* أزرار الحفظ */}
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
        <h2 className="text-3xl font-bold text-gray-800">إدارة المجموعات</h2>
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">
            <span className="font-semibold">{groups.length}</span> مجموعة إجمالية
          </div>
        </div>
      </div>

      {/* اختيار الكورس */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">اختر الكورس</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => {
            const courseStudentsCount = getCourseStudents(course.id).length;
            const courseGroupsCount = groups.filter(g => g.courseId === course.id).length;
            const activeGroupsCount = groups.filter(g => g.courseId === course.id && g.status === 'active').length;
            
            return (
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
                <p className="text-sm text-gray-600 mt-1">{course.category}</p>
                <p className="text-xs text-purple-600 mt-1">
                  الفئة العمرية: {course.ageRangeFrom}-{course.ageRangeTo} سنة
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {courseStudentsCount} طالب • {courseGroupsCount} مجموعة ({activeGroupsCount} مفعلة)
                </p>
                <div className="mt-2 text-xs text-purple-600">
                  الطلاب المتاحين: {getAvailableStudents(course.id).length}
                </div>
              </div>
            );
          })}
        </div>
        
        {courses.length === 0 && (
          <p className="text-gray-600 text-center py-4">لا توجد كورسات متاحة</p>
        )}
      </div>

      {selectedCourse && (
        <>
          {/* إحصائيات الكورس */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <BookOpen className="mx-auto text-blue-600 mb-2" size={24} />
              <p className="text-2xl font-bold text-blue-900">{getCourseStudents(selectedCourse.id).length}</p>
              <p className="text-gray-600 text-sm">طلاب مناسبين</p>
            </div>
            
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <Play className="mx-auto text-green-600 mb-2" size={24} />
              <p className="text-2xl font-bold text-green-900">
                {groups.filter(g => g.courseId === selectedCourse.id && g.status === 'active').length}
              </p>
              <p className="text-gray-600 text-sm">مجموعات مفعلة</p>
            </div>
            
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <Clock className="mx-auto text-yellow-600 mb-2" size={24} />
              <p className="text-2xl font-bold text-yellow-900">
                {groups.filter(g => g.courseId === selectedCourse.id && g.status === 'pending').length}
              </p>
              <p className="text-gray-600 text-sm">قيد الإنشاء</p>
            </div>
            
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <User className="mx-auto text-purple-600 mb-2" size={24} />
              <p className="text-2xl font-bold text-purple-900">{getAvailableStudents(selectedCourse.id).length}</p>
              <p className="text-gray-600 text-sm">طلاب متاحين</p>
            </div>
          </div>

          {/* أدوات التصفية والبحث */}
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

          {/* نموذج إنشاء/تعديل المجموعة */}
          {showCreateGroup && <CreateGroupForm />}

          {/* قائمة المجموعات */}
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

                {/* حالة المجموعة */}
                <div className="mb-4">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${getStatusColor(group.status)}`}>
                    {getStatusIcon(group.status)}
                    {getStatusLabel(group.status)}
                  </div>
                </div>

                {/* معلومات المجموعة */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-600">عدد الطلاب:</span>
                    <span className="font-semibold ml-2">
                      {group.studentCount}/{group.maxSize}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">الحد الأدنى:</span>
                    <span className="font-semibold ml-2">{group.minSize}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">الحالة:</span>
                    <span className={`font-semibold ml-2 ${
                      group.studentCount >= group.minSize ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {group.studentCount >= group.minSize ? 'مكتملة' : `يحتاج ${group.minSize - group.studentCount} طلاب`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">تاريخ الإنشاء:</span>
                    <span className="font-semibold ml-2">
                      {group.createdAt?.toDate ? new Date(group.createdAt.toDate()).toLocaleDateString('ar-EG') : '-'}
                    </span>
                  </div>
                </div>

                {/* المدرب المخصص */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">المدرب المخصص:</label>
                  <select
                    value={group.trainerId || ''}
                    onChange={(e) => assignGroupToTrainer(group.id, e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                    disabled={group.status === 'active'} // منع التغيير للمجموعات المفعلة
                  >
                    <option value="">لا يوجد مدرب محدد</option>
                    {trainers.map(trainer => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.firstName} {trainer.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* شريط التقدم */}
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

                {/* أزرار التحكم في الحالة */}
                <div className="space-y-2">
                  {group.status === 'pending' && group.studentCount >= group.minSize && (
                    <button
                      onClick={() => changeGroupStatus(group, 'active')}
                      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Play size={16} />
                      تفعيل المجموعة
                    </button>
                  )}

                  {group.status === 'ready' && (
                    <button
                      onClick={() => changeGroupStatus(group, 'active')}
                      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Play size={16} />
                      تفعيل المجموعة
                    </button>
                  )}

                  {group.status === 'active' && (
                    <button
                      onClick={() => changeGroupStatus(group, 'inactive')}
                      className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Pause size={16} />
                      إيقاف المجموعة
                    </button>
                  )}

                  {group.status === 'inactive' && (
                    <button
                      onClick={() => changeGroupStatus(group, 'active')}
                      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
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

                {/* قائمة الطلاب */}
                <details className="group mt-4">
                  <summary className="cursor-pointer text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2">
                    <Users size={16} />
                    عرض الطلاب ({group.studentCount})
                  </summary>
                  <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                    {group.students?.map(studentId => {
                      const student = users.find(u => u.id === studentId);
                      return student ? (
                        <div key={studentId} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold text-xs">
                              {student.firstName.charAt(0)}
                            </span>
                          </div>
                          <span>{student.firstName} {student.lastName}</span>
                          <span className="text-gray-500 text-xs">({student.phone})</span>
                          <span className="text-purple-600 text-xs">• {student.age} سنة</span>
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
                    : 'لا توجد مجموعات لهذا الكورس حتى الآن'
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

export default GroupsManagement;