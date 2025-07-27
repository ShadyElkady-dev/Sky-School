// src/components/Admin/CreditManagement.js
import React, { useState } from 'react';
import { 
  CreditCard, Users, Search, Filter, Plus, History, 
  Calendar, CheckCircle, AlertCircle, TrendingUp,
  Eye, Download, RefreshCw, DollarSign, Clock,
  User, BookOpen, Target, Coins, Gift
} from 'lucide-react';
import { useCollection } from '../../hooks/useFirestore';
import { where, orderBy } from 'firebase/firestore';
import { useNotifications } from '../../hooks/useNotifications';

const CreditManagement = () => {
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, low, medium, high
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [viewMode, setViewMode] = useState('overview'); // overview, students, history, bulk

  const { data: subscriptions, update: updateSubscription } = useCollection('subscriptions');
  const { data: users } = useCollection('users');
  const { data: curricula } = useCollection('curricula');
  const { data: creditHistory, add: addCreditHistory } = useCollection('creditHistory', [orderBy('createdAt', 'desc')]);
  const { sendCreditAddedNotification } = useNotifications();

  const students = users.filter(u => u.role === 'student');
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');

  // إحصائيات عامة
  const getOverallStats = () => {
    const totalActiveStudents = activeSubscriptions.length;
    const totalCredits = activeSubscriptions.reduce((sum, sub) => sum + (sub.accessCreditDays || 0), 0);
    const lowCreditStudents = activeSubscriptions.filter(sub => (sub.accessCreditDays || 0) <= 7).length;
    const expiredStudents = activeSubscriptions.filter(sub => 
      sub.currentLevelAccessExpiresAt && new Date(sub.currentLevelAccessExpiresAt.toDate()) < new Date()
    ).length;

    const averageCredit = totalActiveStudents > 0 ? totalCredits / totalActiveStudents : 0;

    return {
      totalActiveStudents,
      totalCredits,
      lowCreditStudents,
      expiredStudents,
      averageCredit
    };
  };

  // جلب الطلاب مع معلومات الرصيد
  const getStudentsWithCredit = () => {
    const curriculumFilter = selectedCurriculum ? 
      activeSubscriptions.filter(sub => sub.curriculumId === selectedCurriculum.id) : 
      activeSubscriptions;

    return curriculumFilter.map(subscription => {
      const student = students.find(s => s.id === subscription.studentId);
      const curriculum = curricula.find(c => c.id === subscription.curriculumId);
      
      if (!student) return null;

      const creditDays = subscription.accessCreditDays || 0;
      const expiresAt = subscription.currentLevelAccessExpiresAt;
      const isExpired = expiresAt && new Date(expiresAt.toDate()) < new Date();
      const daysUntilExpiry = expiresAt ? 
        Math.ceil((new Date(expiresAt.toDate()) - new Date()) / (1000 * 60 * 60 * 24)) : null;

      let creditStatus = 'high';
      if (creditDays <= 3) creditStatus = 'critical';
      else if (creditDays <= 7) creditStatus = 'low';
      else if (creditDays <= 30) creditStatus = 'medium';

      return {
        student,
        subscription,
        curriculum,
        creditDays,
        creditStatus,
        isExpired,
        daysUntilExpiry,
        currentLevel: subscription.currentLevel || 1
      };
    }).filter(Boolean);
  };

  // فلترة الطلاب
  const getFilteredStudents = () => {
    let filtered = getStudentsWithCredit();

    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.creditStatus === filterType || 
        (filterType === 'critical' && item.creditStatus === 'critical'));
    }

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.student.phone.includes(searchTerm) ||
        item.curriculum?.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      // ترتيب حسب الأولوية: المنتهي أولاً، ثم الأقل رصيداً
      if (a.isExpired && !b.isExpired) return -1;
      if (!a.isExpired && b.isExpired) return 1;
      return a.creditDays - b.creditDays;
    });
  };

  // إضافة رصيد أيام
  const addCreditDays = async (studentIds, daysToAdd, reason, isPromotion = false) => {
    try {
      const results = [];
      
      for (const studentId of studentIds) {
        const subscription = activeSubscriptions.find(sub => sub.studentId === studentId);
        if (!subscription) continue;

        const oldCredit = subscription.accessCreditDays || 0;
        const newCredit = oldCredit + parseInt(daysToAdd);
        
        // تحديث الاشتراك
        await updateSubscription(subscription.id, {
          accessCreditDays: newCredit,
          lastCreditUpdate: new Date(),
          status: 'active'
        });

        // إضافة سجل في التاريخ
        await addCreditHistory({
          studentId,
          studentName: users.find(u => u.id === studentId)?.firstName + ' ' + users.find(u => u.id === studentId)?.lastName,
          curriculumId: subscription.curriculumId,
          curriculumName: subscription.curriculumTitle,
          oldCredit,
          newCredit,
          addedDays: parseInt(daysToAdd),
          reason,
          isPromotion,
          adminId: 'current-admin-id', // يجب استبداله بـ ID الأدمن الحقيقي
          adminName: 'Admin',
          createdAt: new Date()
        });

        // إرسال إشعار للطالب
        sendCreditAddedNotification(
          studentId,
          parseInt(daysToAdd),
          subscription.curriculumTitle,
          newCredit
        );

        results.push({ studentId, oldCredit, newCredit, success: true });
      }

      return results;
    } catch (error) {
      console.error('Error adding credit:', error);
      throw error;
    }
  };

  const stats = getOverallStats();
  const filteredStudents = getFilteredStudents();

  // مكونات واجهة المستخدم
  const AddCreditModal = () => {
    const [formData, setFormData] = useState({
      daysToAdd: '',
      reason: '',
      applyToAll: false
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formData.daysToAdd || parseInt(formData.daysToAdd) <= 0) {
        alert('يرجى إدخال عدد أيام صحيح');
        return;
      }

      setLoading(true);
      try {
        const targetStudents = formData.applyToAll ? 
          filteredStudents.map(item => item.student.id) : 
          selectedStudents;

        if (targetStudents.length === 0) {
          alert('يرجى اختيار طلاب أو تفعيل "تطبيق على الكل"');
          return;
        }

        await addCreditDays(
          targetStudents, 
          formData.daysToAdd, 
          formData.reason || 'إضافة رصيد من الإدارة'
        );

        alert(`تم إضافة ${formData.daysToAdd} يوماً لـ ${targetStudents.length} طالب بنجاح!`);
        setShowAddCreditModal(false);
        setSelectedStudents([]);
        setFormData({ daysToAdd: '', reason: '', applyToAll: false });
      } catch (error) {
        alert('حدث خطأ في إضافة الرصيد: ' + error.message);
      }
      setLoading(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <h3 className="text-xl font-semibold mb-4">إضافة رصيد أيام</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-medium mb-2">عدد الأيام المراد إضافتها</label>
              <input
                type="number"
                value={formData.daysToAdd}
                onChange={(e) => setFormData({...formData, daysToAdd: e.target.value})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                placeholder="مثال: 30"
                required
                min="1"
                max="365"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">السبب (اختياري)</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                rows="3"
                placeholder="سبب إضافة الرصيد..."
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.applyToAll}
                  onChange={(e) => setFormData({...formData, applyToAll: e.target.checked})}
                  className="rounded"
                />
                <span>تطبيق على جميع الطلاب المفلترين ({filteredStudents.length} طالب)</span>
              </label>
              
              {!formData.applyToAll && (
                <p className="text-sm text-gray-600">
                  سيتم تطبيق الإضافة على {selectedStudents.length} طالب محدد
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">معاينة العملية:</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• عدد الطلاب: {formData.applyToAll ? filteredStudents.length : selectedStudents.length}</p>
                <p>• الأيام المضافة: {formData.daysToAdd || 0} يوم لكل طالب</p>
                <p>• إجمالي الأيام: {(formData.daysToAdd || 0) * (formData.applyToAll ? filteredStudents.length : selectedStudents.length)} يوم</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'جاري الإضافة...' : 'إضافة الرصيد'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddCreditModal(false)}
                className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const getCreditStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'low': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCreditStatusLabel = (status) => {
    switch (status) {
      case 'critical': return 'حرج';
      case 'low': return 'منخفض';
      case 'medium': return 'متوسط';
      case 'high': return 'جيد';
      default: return 'غير محدد';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">إدارة رصيد الأيام</h2>
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">
            <span className="font-semibold">{stats.totalActiveStudents}</span> اشتراك نشط
          </div>
          <button
            onClick={() => setShowAddCreditModal(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة رصيد
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border p-2">
        <div className="flex gap-2">
          {[
            { key: 'overview', label: 'نظرة عامة', icon: <TrendingUp size={16} /> },
            { key: 'students', label: 'الطلاب', icon: <Users size={16} /> },
            { key: 'history', label: 'السجل', icon: <History size={16} /> },
            { key: 'bulk', label: 'العمليات المجمعة', icon: <Target size={16} /> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                viewMode === tab.key
                  ? 'bg-purple-100 text-purple-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <Users className="mx-auto text-blue-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-blue-900">{stats.totalActiveStudents}</p>
          <p className="text-gray-600 text-sm">طالب نشط</p>
        </div>
        
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <Coins className="mx-auto text-green-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-green-900">{stats.totalCredits.toLocaleString()}</p>
          <p className="text-gray-600 text-sm">إجمالي الرصيد</p>
        </div>
        
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <AlertCircle className="mx-auto text-yellow-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-yellow-900">{stats.lowCreditStudents}</p>
          <p className="text-gray-600 text-sm">رصيد منخفض</p>
        </div>
        
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <Clock className="mx-auto text-red-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-red-900">{stats.expiredStudents}</p>
          <p className="text-gray-600 text-sm">منتهي الصلاحية</p>
        </div>
        
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <TrendingUp className="mx-auto text-purple-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-purple-900">{stats.averageCredit.toFixed(1)}</p>
          <p className="text-gray-600 text-sm">متوسط الرصيد</p>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'students' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، الهاتف، أو المنهج..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border rounded-lg pr-12 pl-4 py-3 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <select
                value={selectedCurriculum?.id || ''}
                onChange={(e) => setSelectedCurriculum(
                  e.target.value ? curricula.find(c => c.id === e.target.value) : null
                )}
                className="border rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              >
                <option value="">جميع المناهج</option>
                {curricula.map(curriculum => (
                  <option key={curriculum.id} value={curriculum.id}>
                    {curriculum.title}
                  </option>
                ))}
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              >
                <option value="all">جميع الحالات</option>
                <option value="critical">حرج (≤3 أيام)</option>
                <option value="low">منخفض (≤7 أيام)</option>
                <option value="medium">متوسط (≤30 يوم)</option>
                <option value="high">جيد ({'>'}30 يوم)</option>
              </select>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <span className="text-sm text-gray-600">
                عرض {filteredStudents.length} من {getStudentsWithCredit().length} طالب
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">محدد: {selectedStudents.length}</span>
                <button
                  onClick={() => setSelectedStudents(
                    selectedStudents.length === filteredStudents.length ? 
                    [] : filteredStudents.map(item => item.student.id)
                  )}
                  className="text-purple-600 hover:text-purple-700 text-sm"
                >
                  {selectedStudents.length === filteredStudents.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                </button>
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                        onChange={() => setSelectedStudents(
                          selectedStudents.length === filteredStudents.length ? 
                          [] : filteredStudents.map(item => item.student.id)
                        )}
                        className="rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الطالب</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنهج</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رصيد الأيام</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">انتهاء المرحلة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map(item => (
                    <tr key={`${item.student.id}-${item.subscription.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(item.student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents([...selectedStudents, item.student.id]);
                            } else {
                              setSelectedStudents(selectedStudents.filter(id => id !== item.student.id));
                            }
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="font-semibold text-purple-600">
                              {item.student.firstName.charAt(0)}{item.student.lastName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{item.student.firstName} {item.student.lastName}</p>
                            <p className="text-sm text-gray-600">{item.student.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{item.curriculum?.title}</p>
                          <p className="text-sm text-gray-600">المرحلة {item.currentLevel}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            item.creditDays <= 3 ? 'bg-red-100 text-red-800' :
                            item.creditDays <= 7 ? 'bg-orange-100 text-orange-800' :
                            item.creditDays <= 30 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.creditDays} يوم
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm border ${getCreditStatusColor(item.creditStatus)}`}>
                          {getCreditStatusLabel(item.creditStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {item.isExpired ? (
                            <span className="text-red-600 font-semibold">منتهي</span>
                          ) : item.daysUntilExpiry !== null ? (
                            <span className={item.daysUntilExpiry <= 7 ? 'text-red-600' : 'text-gray-600'}>
                              {item.daysUntilExpiry} يوم
                            </span>
                          ) : (
                            <span className="text-gray-400">غير محدد</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedStudents([item.student.id]);
                            setShowAddCreditModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 transition-colors"
                          title="إضافة رصيد"
                        >
                          <Plus size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredStudents.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600">
                  {searchTerm || filterType !== 'all' || selectedCurriculum
                    ? 'لا توجد نتائج تطابق المعايير المحددة'
                    : 'لا توجد اشتراكات نشطة'
                  }
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {viewMode === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">سجل إضافة الرصيد</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الطالب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنهج</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الأيام المضافة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرصيد السابق</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرصيد الجديد</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السبب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {creditHistory.slice(0, 50).map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      {record.createdAt?.toDate ? 
                        new Date(record.createdAt.toDate()).toLocaleDateString('ar-EG') : 
                        'غير محدد'}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{record.curriculumName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-semibold">
                        +{record.addedDays} يوم
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{record.oldCredit} يوم</td>
                    <td className="px-6 py-4 text-sm font-semibold">{record.newCredit} يوم</td>
                    <td className="px-6 py-4 text-sm">{record.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {creditHistory.length === 0 && (
            <div className="text-center py-12">
              <History className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">لا يوجد سجل لإضافة الرصيد حتى الآن</p>
            </div>
          )}
        </div>
      )}

      {viewMode === 'bulk' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* إضافة رصيد للطلاب ذوي الرصيد المنخفض */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="text-orange-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold">رصيد منخفض</h3>
                  <p className="text-sm text-gray-600">{stats.lowCreditStudents} طالب</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                إضافة رصيد للطلاب الذين لديهم أقل من 7 أيام
              </p>
              <button
                onClick={() => {
                  const lowCreditStudents = getStudentsWithCredit()
                    .filter(item => item.creditDays <= 7)
                    .map(item => item.student.id);
                  setSelectedStudents(lowCreditStudents);
                  setShowAddCreditModal(true);
                }}
                className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition-colors"
                disabled={stats.lowCreditStudents === 0}
              >
                إضافة رصيد جماعي
              </button>
            </div>

            {/* إضافة رصيد للطلاب المنتهيين */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Clock className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold">منتهي الصلاحية</h3>
                  <p className="text-sm text-gray-600">{stats.expiredStudents} طالب</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                إعادة تفعيل الطلاب المنتهيين
              </p>
              <button
                onClick={() => {
                  const expiredStudents = getStudentsWithCredit()
                    .filter(item => item.isExpired)
                    .map(item => item.student.id);
                  setSelectedStudents(expiredStudents);
                  setShowAddCreditModal(true);
                }}
                className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
                disabled={stats.expiredStudents === 0}
              >
                إعادة تفعيل
              </button>
            </div>

            {/* إضافة رصيد حسب المنهج */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <BookOpen className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold">حسب المنهج</h3>
                  <p className="text-sm text-gray-600">إضافة لمنهج محدد</p>
                </div>
              </div>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    const curriculumStudents = getStudentsWithCredit()
                      .filter(item => item.curriculum?.id === e.target.value)
                      .map(item => item.student.id);
                    setSelectedStudents(curriculumStudents);
                    setShowAddCreditModal(true);
                  }
                }}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 mb-4"
              >
                <option value="">اختر منهج</option>
                {curricula.map(curriculum => {
                  const count = getStudentsWithCredit().filter(item => item.curriculum?.id === curriculum.id).length;
                  return (
                    <option key={curriculum.id} value={curriculum.id}>
                      {curriculum.title} ({count} طالب)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* إحصائيات مفصلة */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">إحصائيات مفصلة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {getStudentsWithCredit().filter(item => item.creditDays <= 3).length}
                </div>
                <div className="text-sm text-gray-600">رصيد حرج (≤3 أيام)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {getStudentsWithCredit().filter(item => item.creditDays > 3 && item.creditDays <= 7).length}
                </div>
                <div className="text-sm text-gray-600">رصيد منخفض (4-7 أيام)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {getStudentsWithCredit().filter(item => item.creditDays > 7 && item.creditDays <= 30).length}
                </div>
                <div className="text-sm text-gray-600">رصيد متوسط (8-30 يوم)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {getStudentsWithCredit().filter(item => item.creditDays > 30).length}
                </div>
                <div className="text-sm text-gray-600">رصيد جيد ({'>'}30 يوم)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* تنبيهات مهمة */}
          {(stats.lowCreditStudents > 0 || stats.expiredStudents > 0) && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-600">تنبيهات مهمة</h3>
              <div className="space-y-3">
                {stats.expiredStudents > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="text-red-600" size={20} />
                      <span className="font-semibold text-red-800">
                        {stats.expiredStudents} طالب انتهت صلاحية وصولهم للمرحلة الحالية
                      </span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">
                      يحتاجون لإضافة رصيد فوري لاستكمال تعليمهم
                    </p>
                    <button
                      onClick={() => {
                        const expiredStudents = getStudentsWithCredit()
                          .filter(item => item.isExpired)
                          .map(item => item.student.id);
                        setSelectedStudents(expiredStudents);
                        setShowAddCreditModal(true);
                      }}
                      className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      إضافة رصيد للمنتهيين
                    </button>
                  </div>
                )}
                
                {stats.lowCreditStudents > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="text-orange-600" size={20} />
                      <span className="font-semibold text-orange-800">
                        {stats.lowCreditStudents} طالب لديهم رصيد منخفض (≤7 أيام)
                      </span>
                    </div>
                    <p className="text-orange-700 text-sm mt-1">
                      يُنصح بإضافة رصيد لهم قبل انتهاء وصولهم
                    </p>
                    <button
                      onClick={() => {
                        const lowCreditStudents = getStudentsWithCredit()
                          .filter(item => item.creditDays <= 7 && !item.isExpired)
                          .map(item => item.student.id);
                        setSelectedStudents(lowCreditStudents);
                        setShowAddCreditModal(true);
                      }}
                      className="mt-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm"
                    >
                      إضافة رصيد للرصيد المنخفض
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* أفضل وأسوأ المناهج من ناحية الرصيد */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">توزيع الطلاب حسب حالة الرصيد</h3>
              <div className="space-y-3">
                {[
                  { status: 'critical', label: 'حرج', count: getStudentsWithCredit().filter(item => item.creditStatus === 'critical').length, color: 'red' },
                  { status: 'low', label: 'منخفض', count: getStudentsWithCredit().filter(item => item.creditStatus === 'low').length, color: 'orange' },
                  { status: 'medium', label: 'متوسط', count: getStudentsWithCredit().filter(item => item.creditStatus === 'medium').length, color: 'yellow' },
                  { status: 'high', label: 'جيد', count: getStudentsWithCredit().filter(item => item.creditStatus === 'high').length, color: 'green' }
                ].map(item => {
                  const percentage = stats.totalActiveStudents > 0 ? (item.count / stats.totalActiveStudents) * 100 : 0;
                  return (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full bg-${item.color}-500`}></div>
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.count}</span>
                        <span className="text-sm text-gray-500">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">أحدث عمليات إضافة الرصيد</h3>
              <div className="space-y-3">
                {creditHistory.slice(0, 5).map(record => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{record.studentName}</p>
                      <p className="text-xs text-gray-600">{record.curriculumName}</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                        +{record.addedDays} يوم
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {record.createdAt?.toDate ? 
                          new Date(record.createdAt.toDate()).toLocaleDateString('ar-EG') : 
                          'غير محدد'}
                      </p>
                    </div>
                  </div>
                ))}
                {creditHistory.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    لا يوجد سجل لإضافة الرصيد حتى الآن
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Credit Modal */}
      {showAddCreditModal && <AddCreditModal />}
    </div>
  );
};

export default CreditManagement