// src/components/Admin/SubscriptionsManagement.js
import React, { useState } from 'react';
import { CheckCircle, XCircle, DollarSign, Clock, Users, Calendar, Eye, Search, Filter, RefreshCw, AlertCircle } from 'lucide-react';
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
        sub.planLabel.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  const filteredSubscriptions = getFilteredSubscriptions();
  const stats = getQuickStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">إدارة الاشتراكات</h2>
        <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">
          <span className="font-semibold">{stats.total}</span> اشتراك إجمالي
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <CheckCircle className="mx-auto text-green-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-green-900">{stats.active}</p>
          <p className="text-gray-600 text-sm">اشتراك نشط</p>
        </div>
        
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <Clock className="mx-auto text-yellow-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
          <p className="text-gray-600 text-sm">قيد المراجعة</p>
        </div>
        
        <div className="bg-orange-50 rounded-xl p-4 text-center">
          <Calendar className="mx-auto text-orange-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-orange-900">{stats.expired}</p>
          <p className="text-gray-600 text-sm">منتهي</p>
        </div>
        
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <Users className="mx-auto text-blue-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          <p className="text-gray-600 text-sm">إجمالي</p>
        </div>
        
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <DollarSign className="mx-auto text-purple-600 mb-2" size={24} />
          <p className="text-2xl font-bold text-purple-900">{stats.revenue.toLocaleString()}</p>
          <p className="text-gray-600 text-sm">إجمالي الإيرادات</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute right-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="ابحث بالطالب أو المنهج..."
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
            <option value="pending">قيد المراجعة</option>
            <option value="active">نشط</option>
            <option value="expired">منتهي</option>
            <option value="rejected">مرفوض</option>
          </select>

          <div className="text-sm text-gray-600">
            عرض {filteredSubscriptions.length} من {subscriptions.length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
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
              {filteredSubscriptions.map(subscription => {
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
        
        {filteredSubscriptions.length === 0 && (
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

      {selectedReceipt && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedReceipt(null)}
        >
          <div 
            className="bg-white p-4 rounded-lg max-w-2xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={selectedReceipt} alt="إيصال الدفع" className="w-full h-auto" />
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsManagement;