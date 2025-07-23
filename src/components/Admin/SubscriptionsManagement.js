// src/components/Admin/SubscriptionsManagement.js
import React, { useState } from 'react';
import { CheckCircle, XCircle, DollarSign, Clock, Users, Calendar, Eye, Search, Filter, RefreshCw, AlertCircle, ChevronDown, X, User, BookOpen, CreditCard } from 'lucide-react';
import { useCollection } from '../../hooks/useFirestore';
import { orderBy, where } from 'firebase/firestore';
import { useNotifications } from '../../hooks/useNotifications';

const SubscriptionsManagement = () => {
  const { data: subscriptions, loading, update } = useCollection('subscriptions', [orderBy('createdAt', 'desc')]);
  const { data: users } = useCollection('users');
  const { data: curricula } = useCollection('curricula');
  const { sendSubscriptionStatusNotification } = useNotifications();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const handleSubscriptionConfirmation = async (subscription, status) => {
    setIsProcessing(true);
    try {
      if (status === 'active') {
        const curriculum = curricula.find(c => c.id === subscription.curriculumId);
        if (!curriculum || !curriculum.levels || curriculum.levels.length === 0) {
          alert('خطأ: المنهج غير موجود أو لا يحتوي على مراحل دراسية.');
          setIsProcessing(false);
          return;
        }

        const firstLevel = curriculum.levels.sort((a, b) => a.order - b.order)[0];
        const levelDuration = parseInt(firstLevel.durationDays) || 30;

        if (subscription.accessCreditDays < levelDuration) {
          alert(`لا يمكن تفعيل الاشتراك. رصيد الطالب (${subscription.accessCreditDays} يوم) غير كافٍ لتغطية المرحلة الأولى (${levelDuration} يوم).`);
          setIsProcessing(false);
          return;
        }

        const newCredit = subscription.accessCreditDays - levelDuration;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + levelDuration);

        const updateData = {
          status: 'active',
          activatedAt: new Date(),
          activatedBy: 'admin',
          accessCreditDays: newCredit,
          currentLevelAccessExpiresAt: expiryDate,
          currentLevel: 1,
          progress: {
            ...subscription.progress,
            startedLevelAt: new Date(),
          }
        };
        await update(subscription.id, updateData);
        
        sendSubscriptionStatusNotification(
          subscription.studentId,
          subscription.curriculumTitle,
          'active'
        );

        alert('تم تفعيل الاشتراك بنجاح!');
      
      } else if (status === 'rejected') {
        await update(subscription.id, {
          status: 'rejected',
          rejectedAt: new Date(),
          rejectedBy: 'admin'
        });

        sendSubscriptionStatusNotification(
          subscription.studentId,
          subscription.curriculumTitle,
          'rejected'
        );

        alert('تم رفض الاشتراك');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('حدث خطأ في تحديث حالة الاشتراك');
    }
    setIsProcessing(false);
  };
  
  const renewSubscription = async (subscription) => {
    const daysToAdd = prompt("كم عدد الأيام التي تريد إضافتها لرصيد الطالب؟", "30");
    if (!daysToAdd || isNaN(parseInt(daysToAdd)) || parseInt(daysToAdd) <= 0) {
      return;
    }
    
    setIsProcessing(true);
    try {
      const newCredit = (subscription.accessCreditDays || 0) + parseInt(daysToAdd);
      
      await update(subscription.id, {
        accessCreditDays: newCredit,
        status: 'active', 
        renewedAt: new Date(),
        renewedBy: 'admin'
      });
      
      alert(`تم إضافة ${daysToAdd} يوماً لرصيد الطالب بنجاح! الرصيد الجديد: ${newCredit} يوماً.`);
    } catch (error) {
      console.error('Error renewing subscription:', error);
      alert('حدث خطأ في تجديد الاشتراك');
    }
    setIsProcessing(false);
  };

  const getStudentName = (studentId) => {
    const student = users.find(u => u.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : 'غير معروف';
  };

  const getCurriculumName = (curriculumId) => {
    const curriculum = curricula.find(c => c.id === curriculumId);
    return curriculum ? curriculum.title : 'غير معروف';
  };

  const getStatusColor = (status, expiresAt) => {
    if (status === 'active' && expiresAt && new Date(expiresAt.toDate()) < new Date()) {
      return 'bg-orange-100 text-orange-800';
    }
    
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status, expiresAt) => {
    if (status === 'active' && expiresAt && new Date(expiresAt.toDate()) < new Date()) {
      return 'منتهي الصلاحية';
    }
    
    switch (status) {
      case 'active':
        return 'نشط';
      case 'pending':
        return 'قيد المراجعة';
      case 'rejected':
        return 'مرفوض';
      case 'expired':
        return 'منتهي';
      default:
        return 'غير محدد';
    }
  };

  const isExpired = (subscription) => {
    return subscription.currentLevelAccessExpiresAt && new Date(subscription.currentLevelAccessExpiresAt.toDate()) < new Date();
  };

  const getDaysLeft = (expiresAt) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt.toDate());
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getFilteredSubscriptions = () => {
    let filtered = subscriptions;
    
    if (statusFilter !== 'all') {
      if (statusFilter === 'expired') {
        filtered = filtered.filter(sub => 
          (sub.status === 'active' && isExpired(sub)) || sub.status === 'expired'
        );
      } else {
        filtered = filtered.filter(sub => sub.status === statusFilter && !isExpired(sub));
      }
    }
    
    if (searchTerm) {
      filtered = filtered.filter(sub =>
        getStudentName(sub.studentId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCurriculumName(sub.curriculumId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.planLabel?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getQuickStats = () => {
    const activeSubscriptions = subscriptions.filter(sub => 
      sub.status === 'active' && !isExpired(sub)
    );
    const pendingSubscriptions = subscriptions.filter(sub => sub.status === 'pending');
    const expiredSubscriptions = subscriptions.filter(sub => 
      (sub.status === 'active' && isExpired(sub)) || sub.status === 'expired'
    );
    const totalRevenue = subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((sum, sub) => sum + (sub.amount || 0), 0);

    return {
      total: subscriptions.length,
      active: activeSubscriptions.length,
      pending: pendingSubscriptions.length,
      expired: expiredSubscriptions.length,
      revenue: totalRevenue
    };
  };

  // عرض الاشتراك كبطاقة على الهواتف
  const renderMobileSubscriptionCard = (subscription) => {
    const expired = isExpired(subscription);
    const daysLeft = getDaysLeft(subscription.currentLevelAccessExpiresAt);
    const student = users.find(u => u.id === subscription.studentId);

    return (
      <div key={subscription.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
              <User size={16} />
              {subscription.studentName || getStudentName(subscription.studentId)}
            </h4>
            <p className="text-sm text-gray-600 mt-1" dir="ltr">
              {student?.phone}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
              getStatusColor(subscription.status, subscription.currentLevelAccessExpiresAt)
            }`}>
              {getStatusLabel(subscription.status, subscription.currentLevelAccessExpiresAt)}
            </span>
            {subscription.status === 'active' && daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center gap-1">
                <AlertCircle size={10} />
                ينتهي قريباً
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <BookOpen size={16} className="text-gray-500" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {subscription.curriculumTitle || getCurriculumName(subscription.curriculumId)}
              </p>
              <p className="text-xs text-gray-500">المرحلة الحالية: {subscription.currentLevel || 1}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-blue-600 font-semibold text-lg">
                {subscription.accessCreditDays || 0}
              </p>
              <p className="text-xs text-blue-800">رصيد الأيام</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              {subscription.currentLevelAccessExpiresAt ? (
                <div>
                  <p className={`font-semibold text-sm ${expired ? 'text-red-600' : 'text-gray-900'}`}>
                    {new Date(subscription.currentLevelAccessExpiresAt.toDate()).toLocaleDateString('ar-EG')}
                  </p>
                  {subscription.status === 'active' && !expired && daysLeft !== null && (
                    <p className={`text-xs ${
                      daysLeft <= 7 ? 'text-red-600' : 
                      daysLeft <= 30 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {daysLeft > 0 ? `${daysLeft} يوم متبقي` : 'انتهى اليوم'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">غير محدد</p>
              )}
              <p className="text-xs text-gray-600">انتهاء المرحلة</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            {subscription.status === 'pending' && (
              <>
                <button
                  onClick={() => handleSubscriptionConfirmation(subscription, 'active')}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                  disabled={isProcessing}
                >
                  <CheckCircle size={16} />
                  تفعيل
                </button>
                <button
                  onClick={() => handleSubscriptionConfirmation(subscription, 'rejected')}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                  disabled={isProcessing}
                >
                  <XCircle size={16} />
                  رفض
                </button>
              </>
            )}
            
            {(subscription.status === 'active' && expired) && (
              <button
                onClick={() => renewSubscription(subscription)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                disabled={isProcessing}
              >
                <RefreshCw size={16} />
                إضافة رصيد
              </button>
            )}

            {subscription.receiptUrl && (
              <button
                onClick={() => setSelectedReceipt(subscription.receiptUrl)}
                className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
              >
                <Eye size={16} />
                الإيصال
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // عرض الجدول للشاشات الكبيرة
  const renderDesktopTable = () => (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الطالب</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المنهج</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رصيد الأيام</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">انتهاء صلاحية المرحلة الحالية</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getFilteredSubscriptions().map(subscription => {
              const expired = isExpired(subscription);
              const daysLeft = getDaysLeft(subscription.currentLevelAccessExpiresAt);
              
              return (
                <tr key={subscription.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium">{subscription.studentName || getStudentName(subscription.studentId)}</p>
                      <p className="text-sm text-gray-500">
                        {users.find(u => u.id === subscription.studentId)?.phone}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-medium">{subscription.curriculumTitle || getCurriculumName(subscription.curriculumId)}</p>
                    <p className="text-sm text-gray-500">المرحلة الحالية: {subscription.currentLevel || 1}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                      {subscription.accessCreditDays || 0} يوم
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {subscription.currentLevelAccessExpiresAt ? (
                      <div>
                        <p className={expired ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                          {new Date(subscription.currentLevelAccessExpiresAt.toDate()).toLocaleDateString('ar-EG')}
                        </p>
                        {subscription.status === 'active' && !expired && daysLeft !== null && (
                          <p className={`text-xs ${
                            daysLeft <= 7 ? 'text-red-600' : 
                            daysLeft <= 30 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {daysLeft > 0 ? `${daysLeft} يوم متبقي` : 'انتهى اليوم'}
                          </p>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        getStatusColor(subscription.status, subscription.currentLevelAccessExpiresAt)
                      }`}>
                        {getStatusLabel(subscription.status, subscription.currentLevelAccessExpiresAt)}
                      </span>
                      {subscription.status === 'active' && daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center gap-1">
                          <AlertCircle size={12} />
                          ينتهي قريباً
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2 items-center">
                      {subscription.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleSubscriptionConfirmation(subscription, 'active')}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            disabled={isProcessing}
                            title="تفعيل الاشتراك"
                          >
                            <CheckCircle size={20} />
                          </button>
                          <button
                            onClick={() => handleSubscriptionConfirmation(subscription, 'rejected')}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            disabled={isProcessing}
                            title="رفض الاشتراك"
                          >
                            <XCircle size={20} />
                          </button>
                        </>
                      )}
                      
                      {(subscription.status === 'active' && expired) && (
                        <button
                          onClick={() => renewSubscription(subscription)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          disabled={isProcessing}
                          title="إضافة رصيد أيام"
                        >
                          <RefreshCw size={20} />
                        </button>
                      )}

                      {subscription.receiptUrl && (
                        <button
                          onClick={() => setSelectedReceipt(subscription.receiptUrl)}
                          className="text-purple-600 hover:text-purple-900 transition-colors"
                          title="عرض الإيصال"
                        >
                          <Eye size={20} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {getFilteredSubscriptions().length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all' 
              ? 'لا توجد اشتراكات تطابق المعايير المحددة'
              : 'لا توجد اشتراكات حتى الآن'
            }
          </p>
        </div>
      )}
    </div>
  );

  // تصفية الاشتراكات حسب التاب النشط على الهواتف
  const getFilteredSubscriptionsByTab = () => {
    const filtered = getFilteredSubscriptions();
    if (activeTab === 'all') return filtered;
    
    if (activeTab === 'expired') {
      return filtered.filter(sub => 
        (sub.status === 'active' && isExpired(sub)) || sub.status === 'expired'
      );
    } else {
      return filtered.filter(sub => sub.status === activeTab && !isExpired(sub));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-8">جاري التحميل...</div>
      </div>
    );
  }

  const filteredSubscriptions = getFilteredSubscriptions();
  const stats = getQuickStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-3xl font-bold text-gray-800">إدارة الاشتراكات</h2>
          <div className="bg-purple-100 text-purple-800 px-3 py-1 md:px-4 md:py-2 rounded-lg">
            <span className="font-semibold text-sm md:text-base">{stats.total}</span>
            <span className="text-xs md:text-sm"> اشتراك</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 md:space-y-6 max-w-7xl mx-auto">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <div className="bg-green-50 rounded-xl p-3 md:p-4 text-center">
            <CheckCircle className="mx-auto text-green-600 mb-2" size={20} />
            <p className="text-lg md:text-2xl font-bold text-green-900">{stats.active}</p>
            <p className="text-gray-600 text-xs md:text-sm">اشتراك نشط</p>
          </div>
          
          <div className="bg-yellow-50 rounded-xl p-3 md:p-4 text-center">
            <Clock className="mx-auto text-yellow-600 mb-2" size={20} />
            <p className="text-lg md:text-2xl font-bold text-yellow-900">{stats.pending}</p>
            <p className="text-gray-600 text-xs md:text-sm">قيد المراجعة</p>
          </div>
          
          <div className="bg-orange-50 rounded-xl p-3 md:p-4 text-center">
            <Calendar className="mx-auto text-orange-600 mb-2" size={20} />
            <p className="text-lg md:text-2xl font-bold text-orange-900">{stats.expired}</p>
            <p className="text-gray-600 text-xs md:text-sm">منتهي</p>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-3 md:p-4 text-center">
            <Users className="mx-auto text-blue-600 mb-2" size={20} />
            <p className="text-lg md:text-2xl font-bold text-blue-900">{stats.total}</p>
            <p className="text-gray-600 text-xs md:text-sm">إجمالي</p>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-3 md:p-4 text-center col-span-2 md:col-span-1">
            <DollarSign className="mx-auto text-purple-600 mb-2" size={20} />
            <p className="text-lg md:text-2xl font-bold text-purple-900">{stats.revenue.toLocaleString()}</p>
            <p className="text-gray-600 text-xs md:text-sm">إجمالي الإيرادات</p>
          </div>
        </div>

        {/* Mobile: Filter Toggle Button */}
        <div className="block md:hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between"
          >
            <span className="flex items-center gap-2 text-gray-700 font-medium">
              <Filter size={20} />
              البحث والفلترة
            </span>
            <ChevronDown 
              size={20} 
              className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Search and Filters */}
        <div className={`bg-white rounded-xl shadow-sm border transition-all duration-300 ${
          showFilters || window.innerWidth >= 768 ? 'block' : 'hidden'
        } md:block`}>
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4 md:hidden">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Filter size={20} />
                البحث والفلترة
              </h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="ابحث بالطالب أو المنهج..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full border rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 w-full md:w-auto"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="pending">قيد المراجعة</option>
                  <option value="active">نشط</option>
                  <option value="expired">منتهي</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-600 pt-2 border-t border-gray-100">
                <span>عرض {filteredSubscriptions.length} من {subscriptions.length}</span>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setShowFilters(false);
                  }}
                  className="text-purple-600 hover:text-purple-800 font-medium"
                >
                  مسح الفلاتر
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Tabs */}
        <div className="block md:hidden">
          <div className="bg-white rounded-xl shadow-sm border p-2">
            <div className="flex overflow-x-auto gap-1">
              {[
                { key: 'all', label: 'الكل', count: filteredSubscriptions.length },
                { key: 'pending', label: 'قيد المراجعة', count: stats.pending },
                { key: 'active', label: 'نشط', count: stats.active },
                { key: 'expired', label: 'منتهي', count: stats.expired }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-purple-100 text-purple-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Display */}
        <div>
          {/* Desktop View */}
          <div className="hidden md:block">
            {renderDesktopTable()}
          </div>

          {/* Mobile View */}
          <div className="block md:hidden">
            <div className="space-y-3">
              {getFilteredSubscriptionsByTab().map(renderMobileSubscriptionCard)}
              
              {getFilteredSubscriptionsByTab().length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                  <Users className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-600">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'لا توجد اشتراكات تطابق المعايير المحددة'
                      : 'لا توجد اشتراكات حتى الآن'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedReceipt(null)}
        >
          <div 
            className="bg-white p-4 rounded-lg max-w-2xl max-h-[90vh] overflow-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-2 left-2 bg-gray-100 hover:bg-gray-200 rounded-full p-2 z-10"
            >
              <X size={20} />
            </button>
            <img src={selectedReceipt} alt="إيصال الدفع" className="w-full h-auto" />
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-700">جاري المعالجة...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsManagement;