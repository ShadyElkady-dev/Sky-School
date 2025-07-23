// src/components/Admin/CurriculaManagement.js
import React, { useState } from 'react';
import { Plus, Edit, Trash2, BookOpen, Clock, DollarSign, Users, Star, ChevronDown, ChevronUp, Eye, Copy, Settings, Play, Pause } from 'lucide-react';
import { useCollection } from '../../hooks/useFirestore';
import { where } from 'firebase/firestore';

const CurriculaManagement = () => {
  const { data: curricula, loading, add, update, remove } = useCollection('curricula');
  const { data: curriculumGroups } = useCollection('curriculumGroups');
  const { data: subscriptions } = useCollection('subscriptions');
  const { data: trainers } = useCollection('users', [where('role', '==', 'trainer')]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState(null);
  const [expandedCurriculum, setExpandedCurriculum] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [curriculumData, setCurriculumData] = useState({
    title: '',
    description: '',
    category: '',
    ageRangeFrom: '',
    ageRangeTo: '',
    image: '',
    subscriptionPlans: [
      { type: 'monthly', price: '', label: 'شهري' },
      { type: 'quarterly', price: '', label: 'ربع سنوي' },
      { type: 'semiannual', price: '', label: 'نصف سنوي' },
      { type: 'annual', price: '', label: 'سنوي' }
    ],
    levels: [
      {
        id: 'level_1',
        title: 'المرحلة الأولى',
        description: '',
        topics: [''],
        duration: '', // الوصف النصي مثل "3 أشهر"
        durationDays: '30', // المدة بالأيام
        sessionsCount: '12', // --- الحقل الجديد: عدد الجلسات ---
        order: 1
      }
    ],
    prerequisites: '',
    learningOutcomes: [''],
    isActive: true,
    
    duration: '',
    totalSessions: '',
    canCreateGroups: true,
    allowGroupAssignment: true,
    defaultGroupSize: 12,
    maxGroupSize: 20,
    minGroupSize: 6,
    groupSettings: {
      autoCreateGroups: false,
      groupByAge: true,
      groupByLevel: false,
      allowStudentChoice: false,
      maxConcurrentGroups: 5,
      sessionDuration: 90,
      weeklySessionsCount: 2
    },
    
    progressSettings: {
      allowLevelPromotion: true,
      requireAdminApproval: true,
      minimumCompletionRate: 80,
      allowSelfPromotion: false // التأكد من تعطيلها
    }
  });

  const getExistingCategories = () => {
    const categories = new Set();
    curricula.forEach(curriculum => {
      if (curriculum.category) {
        categories.add(curriculum.category);
      }
    });
    return Array.from(categories);
  };

  const getCurriculumStats = (curriculumId) => {
    const groups = curriculumGroups.filter(g => g.curriculumId === curriculumId);
    const subs = subscriptions.filter(s => s.curriculumId === curriculumId);
    
    const activeGroups = groups.filter(g => g.status === 'active');
    const pendingGroups = groups.filter(g => g.status === 'pending');
    const readyGroups = groups.filter(g => g.status === 'ready');
    
    const activeSubscriptions = subs.filter(s => s.status === 'active' && s.currentLevelAccessExpiresAt && new Date(s.currentLevelAccessExpiresAt.toDate()) > new Date());
    const pendingSubscriptions = subs.filter(s => s.status === 'pending');
    const expiredSubscriptions = subs.filter(s => s.status === 'active' && s.currentLevelAccessExpiresAt && new Date(s.currentLevelAccessExpiresAt.toDate()) <= new Date());
    
    const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);
    const monthlyRevenue = activeSubscriptions
      .filter(sub => sub.planType === 'monthly')
      .reduce((sum, sub) => sum + (sub.amount || 0), 0);
    
    const groupedStudentIds = new Set();
    activeGroups.forEach(group => {
      group.students?.forEach(studentId => groupedStudentIds.add(studentId));
    });
    const ungroupedStudents = activeSubscriptions.filter(sub => !groupedStudentIds.has(sub.studentId));
    
    return {
      totalGroups: groups.length,
      activeGroups: activeGroups.length,
      pendingGroups: pendingGroups.length,
      readyGroups: readyGroups.length,
      totalSubscriptions: subs.length,
      activeSubscriptions: activeSubscriptions.length,
      pendingSubscriptions: pendingSubscriptions.length,
      expiredSubscriptions: expiredSubscriptions.length,
      totalStudents: activeSubscriptions.length,
      groupedStudents: Array.from(groupedStudentIds).length,
      ungroupedStudents: ungroupedStudents.length,
      totalRevenue,
      monthlyRevenue,
      needsAttention: pendingGroups.length + pendingSubscriptions.length + ungroupedStudents.length
    };
  };

  const resetForm = () => {
    setCurriculumData({
      title: '',
      description: '',
      category: '',
      ageRangeFrom: '',
      ageRangeTo: '',
      image: '',
      subscriptionPlans: [
        { type: 'monthly', price: '', label: 'شهري' },
        { type: 'quarterly', price: '', label: 'ربع سنوي' },
        { type: 'semiannual', price: '', label: 'نصف سنوي' },
        { type: 'annual', price: '', label: 'سنوي' }
      ],
      levels: [
        {
          id: 'level_1',
          title: 'المرحلة الأولى',
          description: '',
          topics: [''],
          duration: '',
          durationDays: '30',
          sessionsCount: '12',
          order: 1
        }
      ],
      prerequisites: '',
      learningOutcomes: [''],
      isActive: true,
      duration: '',
      totalSessions: '',
      canCreateGroups: true,
      allowGroupAssignment: true,
      defaultGroupSize: 12,
      maxGroupSize: 20,
      minGroupSize: 6,
      groupSettings: {
        autoCreateGroups: false,
        groupByAge: true,
        groupByLevel: false,
        allowStudentChoice: false,
        maxConcurrentGroups: 5,
        sessionDuration: 90,
        weeklySessionsCount: 2
      },
      progressSettings: {
        allowLevelPromotion: true,
        requireAdminApproval: true,
        minimumCompletionRate: 80,
        allowSelfPromotion: false
      }
    });
    setEditingCurriculum(null);
    setShowCreateForm(false);
  };

  const handleEdit = (curriculum) => {
    setEditingCurriculum(curriculum);
    setCurriculumData({
      ...curriculum,
      subscriptionPlans: curriculum.subscriptionPlans || [
        { type: 'monthly', price: '', label: 'شهري' },
        { type: 'quarterly', price: '', label: 'ربع سنوي' },
        { type: 'semiannual', price: '', label: 'نصف سنوي' },
        { type: 'annual', price: '', label: 'سنوي' }
      ],
      levels: curriculum.levels?.map(l => ({...l, sessionsCount: l.sessionsCount || '12'})) || [
        {
          id: 'level_1',
          title: 'المرحلة الأولى',
          description: '',
          topics: [''],
          duration: '',
          durationDays: '30',
          sessionsCount: '12',
          order: 1
        }
      ],
      learningOutcomes: curriculum.learningOutcomes || [''],
      duration: curriculum.duration || '',
      totalSessions: curriculum.totalSessions || '',
      canCreateGroups: curriculum.canCreateGroups !== false,
      allowGroupAssignment: curriculum.allowGroupAssignment !== false,
      defaultGroupSize: curriculum.defaultGroupSize || 12,
      maxGroupSize: curriculum.maxGroupSize || 20,
      minGroupSize: curriculum.minGroupSize || 6,
      groupSettings: curriculum.groupSettings || {
        autoCreateGroups: false,
        groupByAge: true,
        groupByLevel: false,
        allowStudentChoice: false,
        maxConcurrentGroups: 5,
        sessionDuration: 90,
        weeklySessionsCount: 2
      },
      progressSettings: {
        ...curriculum.progressSettings,
        allowSelfPromotion: false 
      } || {
        allowLevelPromotion: true,
        requireAdminApproval: true,
        minimumCompletionRate: 80,
        allowSelfPromotion: false
      }
    });
    setShowCreateForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (curriculumData.ageRangeFrom && curriculumData.ageRangeTo && parseInt(curriculumData.ageRangeFrom) >= parseInt(curriculumData.ageRangeTo)) {
        alert('العمر "من" يجب أن يكون أقل من العمر "إلى"');
        setIsLoading(false);
        return;
      }
      

      if (curriculumData.minGroupSize >= curriculumData.maxGroupSize) {
        alert('الحد الأدنى للمجموعة يجب أن يكون أقل من الحد الأقصى');
        setIsLoading(false);
        return;
      }

      const activePlans = curriculumData.subscriptionPlans.filter(plan => plan.price && parseFloat(plan.price) > 0);
      
      if (activePlans.length === 0) {
        alert('يجب إضافة خطة اشتراك واحدة على الأقل');
        setIsLoading(false);
        return;
      }

      const cleanLearningOutcomes = curriculumData.learningOutcomes.filter(outcome => outcome.trim());
      const cleanLevels = curriculumData.levels.map(level => ({
        ...level,
        sessionsCount: parseInt(level.sessionsCount) || 12,
        topics: level.topics.filter(topic => topic.trim())
      }));

      const finalData = {
        ...curriculumData,
        ageRangeFrom: parseInt(curriculumData.ageRangeFrom),
        ageRangeTo: parseInt(curriculumData.ageRangeTo),
        subscriptionPlans: activePlans.map(plan => ({
          ...plan,
          price: parseFloat(plan.price)
        })),
        levels: cleanLevels,
        learningOutcomes: cleanLearningOutcomes,
        totalSessions: curriculumData.totalSessions ? parseInt(curriculumData.totalSessions) : null,
        defaultGroupSize: parseInt(curriculumData.defaultGroupSize),
        maxGroupSize: parseInt(curriculumData.maxGroupSize),
        minGroupSize: parseInt(curriculumData.minGroupSize),
        groupSettings: {
          ...curriculumData.groupSettings,
          sessionDuration: parseInt(curriculumData.groupSettings.sessionDuration),
          weeklySessionsCount: parseInt(curriculumData.groupSettings.weeklySessionsCount),
          maxConcurrentGroups: parseInt(curriculumData.groupSettings.maxConcurrentGroups)
        },
        progressSettings: {
          ...curriculumData.progressSettings,
          allowSelfPromotion: false, 
          minimumCompletionRate: parseInt(curriculumData.progressSettings.minimumCompletionRate)
        }
      };

      if (editingCurriculum) {
        await update(editingCurriculum.id, finalData);
        alert('تم تحديث المنهج بنجاح');
      } else {
        await add(finalData);
        alert('تم إضافة المنهج بنجاح');
      }

      resetForm();
    } catch (error) {
      console.error('Error saving curriculum:', error);
      alert('حدث خطأ في حفظ المنهج');
    }
    setIsLoading(false);
  };

  const addLevel = () => {
    const newLevel = {
      id: `level_${Date.now()}`,
      title: '',
      description: '',
      topics: [''],
      duration: '',
      durationDays: '30',
      sessionsCount: '12', 
      order: curriculumData.levels.length + 1
    };
    setCurriculumData({
      ...curriculumData,
      levels: [...curriculumData.levels, newLevel]
    });
  };

  const removeLevel = (index) => {
    if (curriculumData.levels.length > 1) {
      const newLevels = curriculumData.levels.filter((_, i) => i !== index);
      setCurriculumData({
        ...curriculumData,
        levels: newLevels
      });
    }
  };

  const updateLevel = (index, field, value) => {
    const newLevels = [...curriculumData.levels];
    newLevels[index] = { ...newLevels[index], [field]: value };
    setCurriculumData({
      ...curriculumData,
      levels: newLevels
    });
  };

  const addTopic = (levelIndex) => {
    const newLevels = [...curriculumData.levels];
    newLevels[levelIndex].topics.push('');
    setCurriculumData({
      ...curriculumData,
      levels: newLevels
    });
  };

  const updateTopic = (levelIndex, topicIndex, value) => {
    const newLevels = [...curriculumData.levels];
    newLevels[levelIndex].topics[topicIndex] = value;
    setCurriculumData({
      ...curriculumData,
      levels: newLevels
    });
  };

  const removeTopic = (levelIndex, topicIndex) => {
    const newLevels = [...curriculumData.levels];
    if (newLevels[levelIndex].topics.length > 1) {
      newLevels[levelIndex].topics.splice(topicIndex, 1);
      setCurriculumData({
        ...curriculumData,
        levels: newLevels
      });
    }
  };
  
  const addLearningOutcome = () => {
    setCurriculumData({
      ...curriculumData,
      learningOutcomes: [...curriculumData.learningOutcomes, '']
    });
  };

  const updateLearningOutcome = (index, value) => {
    const newOutcomes = [...curriculumData.learningOutcomes];
    newOutcomes[index] = value;
    setCurriculumData({
      ...curriculumData,
      learningOutcomes: newOutcomes
    });
  };

  const removeLearningOutcome = (index) => {
    if (curriculumData.learningOutcomes.length > 1) {
      const newOutcomes = curriculumData.learningOutcomes.filter((_, i) => i !== index);
      setCurriculumData({
        ...curriculumData,
        learningOutcomes: newOutcomes
      });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنهج؟ سيتم إلغاء جميع الاشتراكات والمجموعات المرتبطة به.')) {
      try {
        await remove(id);
        alert('تم حذف المنهج بنجاح');
      } catch (error) {
        console.error('Error deleting curriculum:', error);
        alert('حدث خطأ في حذف المنهج');
      }
    }
  };

  const toggleCurriculumStatus = async (curriculum) => {
    try {
      await update(curriculum.id, { isActive: !curriculum.isActive });
      alert(`تم ${curriculum.isActive ? 'إيقاف' : 'تفعيل'} المنهج بنجاح`);
    } catch (error) {
      console.error('Error updating curriculum status:', error);
      alert('حدث خطأ في تحديث حالة المنهج');
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  const existingCategories = getExistingCategories();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">إدارة المناهج التعليمية</h2>
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">
            <span className="font-semibold">{curricula.length}</span> منهج
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة منهج جديد
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-6">
            {editingCurriculum ? 'تعديل المنهج' : 'إنشاء منهج جديد'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-2">عنوان المنهج</label>
                <input
                  type="text"
                  value={curriculumData.title}
                  onChange={(e) => setCurriculumData({...curriculumData, title: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  placeholder="مثال: منهج احتراف البرمجة"
                  required
                />
              </div>

              <div>
                <label className="block font-medium mb-2">الفئة</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={curriculumData.category}
                    onChange={(e) => setCurriculumData({...curriculumData, category: e.target.value})}
                    className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">اختر فئة موجودة</option>
                    {existingCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={curriculumData.category}
                    onChange={(e) => setCurriculumData({...curriculumData, category: e.target.value})}
                    className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    placeholder="أو اكتب فئة جديدة"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-2">من عمر</label>
                <input
                  type="number"
                  value={curriculumData.ageRangeFrom}
                  onChange={(e) => setCurriculumData({...curriculumData, ageRangeFrom: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  min="3"
                  max="100"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-2">إلى عمر</label>
                <input
                  type="number"
                  value={curriculumData.ageRangeTo}
                  onChange={(e) => setCurriculumData({...curriculumData, ageRangeTo: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  min="4"
                  max="100"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-2">مدة المنهج (اختياري)</label>
                <input
                  type="text"
                  value={curriculumData.duration}
                  onChange={(e) => setCurriculumData({...curriculumData, duration: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  placeholder="مثال: 6 أشهر, سنة كاملة"
                />
              </div>
              <div>
                <label className="block font-medium mb-2">عدد الجلسات الإجمالي (اختياري)</label>
                <input
                  type="number"
                  value={curriculumData.totalSessions}
                  onChange={(e) => setCurriculumData({...curriculumData, totalSessions: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  placeholder="مثال: 48 جلسة"
                  min="1"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
              <h4 className="text-lg font-semibold mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
                <Users className="text-blue-600" size={20} />
                <span>إعدادات المجموعات التعليمية</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block font-medium mb-2">الحد الأدنى</label>
                  <input
                    type="number"
                    value={curriculumData.minGroupSize}
                    onChange={(e) => setCurriculumData({...curriculumData, minGroupSize: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    min="3"
                    max="30"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2">الحد الأقصى</label>
                  <input
                    type="number"
                    value={curriculumData.maxGroupSize}
                    onChange={(e) => setCurriculumData({...curriculumData, maxGroupSize: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    min="5"
                    max="50"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2">الحجم الافتراضي</label>
                  <input
                    type="number"
                    value={curriculumData.defaultGroupSize}
                    onChange={(e) => setCurriculumData({...curriculumData, defaultGroupSize: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    min="5"
                    max="30"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block font-medium mb-2">مدة الجلسة (دقيقة)</label>
                  <input
                    type="number"
                    value={curriculumData.groupSettings.sessionDuration}
                    onChange={(e) => setCurriculumData({
                      ...curriculumData,
                      groupSettings: {...curriculumData.groupSettings, sessionDuration: e.target.value}
                    })}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    min="30"
                    max="180"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2">جلسات أسبوعية</label>
                  <input
                    type="number"
                    value={curriculumData.groupSettings.weeklySessionsCount}
                    onChange={(e) => setCurriculumData({
                      ...curriculumData,
                      groupSettings: {...curriculumData.groupSettings, weeklySessionsCount: e.target.value}
                    })}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    min="1"
                    max="7"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2">أقصى مجموعات متزامنة</label>
                  <input
                    type="number"
                    value={curriculumData.groupSettings.maxConcurrentGroups}
                    onChange={(e) => setCurriculumData({
                      ...curriculumData,
                      groupSettings: {...curriculumData.groupSettings, maxConcurrentGroups: e.target.value}
                    })}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    min="1"
                    max="20"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={curriculumData.canCreateGroups} onChange={(e) => setCurriculumData({...curriculumData, canCreateGroups: e.target.checked})} className="rounded"/>
                  <span>السماح بإنشاء مجموعات لهذا المنهج</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={curriculumData.allowGroupAssignment} onChange={(e) => setCurriculumData({...curriculumData, allowGroupAssignment: e.target.checked})} className="rounded"/>
                  <span>السماح بتخصيص الطلاب للمجموعات</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={curriculumData.groupSettings.autoCreateGroups} onChange={(e) => setCurriculumData({...curriculumData, groupSettings: {...curriculumData.groupSettings, autoCreateGroups: e.target.checked}})} className="rounded"/>
                  <span>إنشاء مجموعات تلقائياً عند وصول العدد المطلوب</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={curriculumData.groupSettings.groupByAge} onChange={(e) => setCurriculumData({...curriculumData, groupSettings: {...curriculumData.groupSettings, groupByAge: e.target.checked}})} className="rounded"/>
                  <span>تجميع الطلاب حسب العمر تلقائياً</span>
                </label>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="text-green-600" size={20} />
                إعدادات التقييم والترقية
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block font-medium mb-2">الحد الأدنى لمعدل الإكمال (%)</label>
                  <input
                    type="number"
                    value={curriculumData.progressSettings.minimumCompletionRate}
                    onChange={(e) => setCurriculumData({
                      ...curriculumData,
                      progressSettings: {...curriculumData.progressSettings, minimumCompletionRate: e.target.value}
                    })}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    min="50"
                    max="100"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={curriculumData.progressSettings.allowLevelPromotion} onChange={(e) => setCurriculumData({...curriculumData, progressSettings: {...curriculumData.progressSettings, allowLevelPromotion: e.target.checked}})} className="rounded"/>
                  <span>السماح بترقية الطلاب للمراحل التالية</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={curriculumData.progressSettings.requireAdminApproval} onChange={(e) => setCurriculumData({...curriculumData, progressSettings: {...curriculumData.progressSettings, requireAdminApproval: e.target.checked}})} className="rounded"/>
                  <span>يتطلب موافقة الإدارة للترقية</span>
                </label>
                <label className="flex items-center gap-2 text-gray-400">
                  <input type="checkbox" checked={false} disabled className="rounded"/>
                  <span>السماح للطلاب بطلب الترقية الذاتية (معطل)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-medium mb-2">وصف المنهج</label>
              <textarea
                value={curriculumData.description}
                onChange={(e) => setCurriculumData({...curriculumData, description: e.target.value})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                rows="4"
                placeholder="وصف شامل للمنهج وما سيتعلمه الطالب..."
                required
              />
            </div>
            
            <div>
              <label className="block font-medium mb-3">خطط الاشتراك والأسعار</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {curriculumData.subscriptionPlans.map((plan, index) => (
                  <div key={plan.type} className="border rounded-lg p-4">
                    <label className="block font-medium mb-2">{plan.label}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={plan.price}
                        onChange={(e) => {
                          const newPlans = [...curriculumData.subscriptionPlans];
                          newPlans[index].price = e.target.value;
                          setCurriculumData({...curriculumData, subscriptionPlans: newPlans});
                        }}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                        placeholder="السعر"
                      />
                      <span className="absolute left-3 top-2 text-gray-500">جنيه</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {plan.type === 'monthly' && 'كل شهر'}
                      {plan.type === 'quarterly' && 'كل 3 أشهر'}
                      {plan.type === 'semiannual' && 'كل 6 أشهر'}
                      {plan.type === 'annual' && 'كل سنة'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row items-center justify-between mb-3 gap-2">
                <label className="block font-medium">المراحل التعليمية</label>
                <button
                  type="button"
                  onClick={addLevel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 self-start sm:self-center"
                >
                  <Plus size={16} />
                  إضافة مرحلة
                </button>
              </div>

              <div className="space-y-4">
                {curriculumData.levels.map((level, levelIndex) => (
                  <div key={levelIndex} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold">المرحلة {levelIndex + 1}</h4>
                      {curriculumData.levels.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLevel(levelIndex)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="lg:col-span-2">
                        <label className="block font-medium mb-2">عنوان المرحلة</label>
                        <input
                          type="text"
                          value={level.title}
                          onChange={(e) => updateLevel(levelIndex, 'title', e.target.value)}
                          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                          placeholder="مثال: مبتدئ، متوسط، محترف"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-2">المدة بالأيام (مطلوب)</label>
                        <input
                          type="number"
                          value={level.durationDays}
                          onChange={(e) => updateLevel(levelIndex, 'durationDays', e.target.value)}
                          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                          placeholder="مثال: 90"
                          required
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-2">عدد الجلسات (مطلوب)</label>
                        <input
                          type="number"
                          value={level.sessionsCount}
                          onChange={(e) => updateLevel(levelIndex, 'sessionsCount', e.target.value)}
                          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                          placeholder="مثال: 12"
                          required
                          min="1"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block font-medium mb-2">وصف المرحلة</label>
                      <textarea
                        value={level.description}
                        onChange={(e) => updateLevel(levelIndex, 'description', e.target.value)}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                        rows="2"
                        placeholder="ماذا سيتعلم الطالب في هذه المرحلة..."
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block font-medium">موضوعات المرحلة</label>
                        <button
                          type="button"
                          onClick={() => addTopic(levelIndex)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          + إضافة موضوع
                        </button>
                      </div>
                      <div className="space-y-2">
                        {level.topics.map((topic, topicIndex) => (
                          <div key={topicIndex} className="flex gap-2">
                            <input
                              type="text"
                              value={topic}
                              onChange={(e) => updateTopic(levelIndex, topicIndex, e.target.value)}
                              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                              placeholder="موضوع الدرس"
                            />
                            {level.topics.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTopic(levelIndex, topicIndex)}
                                className="text-red-600 hover:text-red-700 p-2"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block font-medium">مخرجات التعلم</label>
                <button
                  type="button"
                  onClick={addLearningOutcome}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  + إضافة مخرج
                </button>
              </div>
              <div className="space-y-2">
                {curriculumData.learningOutcomes.map((outcome, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={outcome}
                      onChange={(e) => updateLearningOutcome(index, e.target.value)}
                      className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                      placeholder="ماذا سيستطيع الطالب فعله بعد إنهاء المنهج..."
                    />
                    {curriculumData.learningOutcomes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLearningOutcome(index)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium mb-2">المتطلبات المسبقة (اختياري)</label>
              <textarea
                value={curriculumData.prerequisites}
                onChange={(e) => setCurriculumData({...curriculumData, prerequisites: e.target.value})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                rows="2"
                placeholder="ما يجب أن يعرفه الطالب قبل البدء في هذا المنهج..."
              />
            </div>

            <div>
              <label className="block font-medium mb-2">رابط صورة المنهج</label>
              <input
                type="url"
                value={curriculumData.image}
                onChange={(e) => setCurriculumData({...curriculumData, image: e.target.value})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'جاري الحفظ...' : editingCurriculum ? 'تحديث المنهج' : 'إنشاء المنهج'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-400 text-white px-6 py-3 rounded-lg hover:bg-gray-500 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {curricula.map(curriculum => {
          const stats = getCurriculumStats(curriculum.id);
          
          return (
            <div key={curriculum.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              {curriculum.image && (
                <img src={curriculum.image} alt={curriculum.title} className="w-full h-48 object-cover" />
              )}
              
              <div className="p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-2">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{curriculum.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {curriculum.category}
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        {curriculum.ageRangeFrom}-{curriculum.ageRangeTo} سنة
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        curriculum.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {curriculum.isActive ? 'مفعل' : 'معطل'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 self-start sm:self-center flex-shrink-0">
                    <button
                      onClick={() => handleEdit(curriculum)}
                      className="text-blue-600 hover:text-blue-700 p-2"
                      title="تعديل"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(curriculum.id)}
                      className="text-red-600 hover:text-red-700 p-2"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-gray-600 mb-4 line-clamp-2">{curriculum.description}</p>

                <div className="mb-4">
                  <h4 className="font-semibold mb-3">الإحصائيات التفصيلية:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="font-bold text-blue-600">{stats.totalStudents}</p>
                      <p className="text-xs text-gray-600">طالب مشترك</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="font-bold text-green-600">{stats.activeGroups}</p>
                      <p className="text-xs text-gray-600">مجموعة نشطة</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                      <p className="font-bold text-yellow-600">{stats.ungroupedStudents}</p>
                      <p className="text-xs text-gray-600">طالب غير مجمع</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <p className="font-bold text-purple-600">{stats.totalRevenue.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">إجمالي الإيرادات</p>
                    </div>
                  </div>
                  
                  {stats.needsAttention > 0 && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 text-sm font-medium">
                        ⚠️ يحتاج انتباه: {stats.needsAttention} عنصر معلق
                      </p>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold mb-2">خطط الاشتراك:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {curriculum.subscriptionPlans?.filter(plan => plan.price > 0).map(plan => (
                      <div key={plan.type} className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="font-semibold text-sm">{plan.label}</p>
                        <p className="text-purple-600 font-bold">{plan.price} جنيه</p>
                      </div>
                    ))}
                  </div>
                </div>

                {(curriculum.duration || curriculum.totalSessions) && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    {curriculum.duration && (
                      <p className="text-sm"><strong>مدة المنهج:</strong> {curriculum.duration}</p>
                    )}
                    {curriculum.totalSessions && (
                      <p className="text-sm"><strong>عدد الجلسات:</strong> {curriculum.totalSessions}</p>
                    )}
                  </div>
                )}

                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-1">إعدادات المجموعات:</p>
                  <div className="text-xs text-blue-700 space-y-1">
                    <p>حجم المجموعة: {curriculum.minGroupSize || 6}-{curriculum.maxGroupSize || 20} طالب</p>
                    <p>مدة الجلسة: {curriculum.groupSettings?.sessionDuration || 90} دقيقة</p>
                    <p>جلسات أسبوعية: {curriculum.groupSettings?.weeklySessionsCount || 2}</p>
                    <p>إنشاء مجموعات: {curriculum.canCreateGroups !== false ? '✅ مفعل' : '❌ معطل'}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <button
                    onClick={() => setExpandedCurriculum(
                      expandedCurriculum === curriculum.id ? null : curriculum.id
                    )}
                    className="flex items-center justify-between w-full text-left font-semibold"
                  >
                    <span>المراحل التعليمية ({curriculum.levels?.length || 0})</span>
                    {expandedCurriculum === curriculum.id ? 
                      <ChevronUp size={20} /> : <ChevronDown size={20} />
                    }
                  </button>
                  
                  {expandedCurriculum === curriculum.id && (
                    <div className="mt-3 space-y-2">
                      {curriculum.levels?.map((level, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <h5 className="font-semibold">{level.title}</h5>
                          <p className="text-sm text-gray-600">{level.description}</p>
                          <div className="flex justify-between text-xs text-purple-600 mt-1">
                            <span>المدة: {level.duration} ({level.durationDays} يوم)</span>
                            <span>الجلسات: {level.sessionsCount} جلسة</span>
                          </div>
                          <div className="mt-2">
                            <p className="text-xs font-medium">الموضوعات:</p>
                            <ul className="text-xs text-gray-600 mt-1">
                              {level.topics?.filter(topic => topic.trim()).map((topic, topicIndex) => (
                                <li key={topicIndex}>• {topic}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => toggleCurriculumStatus(curriculum)}
                      className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                        curriculum.isActive
                          ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {curriculum.isActive ? (
                        <>
                          <Pause size={14} className="inline mr-1" />
                          إيقاف
                        </>
                      ) : (
                        <>
                          <Play size={14} className="inline mr-1" />
                          تفعيل
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => window.open(`/admin/curriculum-groups`, '_blank')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Users size={14} className="inline mr-1" />
                      المجموعات ({stats.totalGroups})
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleEdit(curriculum)}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    <Settings size={14} className="inline mr-1" />
                    إدارة المنهج
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {curricula.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 text-lg">لا توجد مناهج حتى الآن</p>
          <p className="text-gray-500 text-sm mt-2">ابدأ بإنشاء أول منهج تعليمي</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            إنشاء منهج جديد
          </button>
        </div>
      )}
    </div>
  );
};

export default CurriculaManagement;