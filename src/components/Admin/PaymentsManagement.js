// src/components/Admin/PaymentsManagement.js
import React, { useState } from 'react';
import { CheckCircle, XCircle, DollarSign, Clock, Eye, User, BookOpen } from 'lucide-react';
import { useCollection } from '../../hooks/useFirestore';
import { orderBy } from 'firebase/firestore';
import { useNotifications } from '../../hooks/useNotifications';

const PaymentsManagement = () => {
  const { data: payments, loading, update } = useCollection('payments', [orderBy('createdAt', 'desc')]);
  const { data: users } = useCollection('users');
  const { data: courses } = useCollection('courses');
  const { add: addEnrollment } = useCollection('enrollments');
  const { sendPaymentStatusNotification } = useNotifications();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const handlePaymentConfirmation = async (payment, status) => {
    setIsProcessing(true);
    try {
      await update(payment.id, { status });
      
      if (status === 'confirmed') {
        await addEnrollment({
          studentId: payment.studentId,
          courseId: payment.courseId,
          paymentId: payment.id
        });
        
        sendPaymentStatusNotification(
          payment.studentId,
          payment.courseName,
          'confirmed'
        );

        alert('تم تأكيد الدفع والتسجيل في الكورس');
      } else {
        
        sendPaymentStatusNotification(
          payment.studentId,
          payment.courseName,
          'rejected'
        );

        alert('تم رفض الدفع');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('حدث خطأ في تحديث حالة الدفع');
    }
    setIsProcessing(false);
  };

  const getStudentName = (studentId) => {
    const student = users.find(u => u.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : 'غير معروف';
  };

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.title : 'غير معروف';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'مؤكد' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'مرفوض' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'معلق' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="mr-3 text-gray-600">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 sm:mb-0">إدارة المدفوعات</h2>
        <div className="text-sm text-gray-600">
          إجمالي المدفوعات: {payments.length}
        </div>
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الطالب</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الكورس</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map(payment => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.studentName || getStudentName(payment.studentId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.courseName || getCourseName(payment.courseId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <DollarSign size={16} />
                      {payment.amount} جنيه
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.createdAt?.toDate ? new Date(payment.createdAt.toDate()).toLocaleDateString('ar-EG') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2 items-center">
                      {payment.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handlePaymentConfirmation(payment, 'confirmed')}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            disabled={isProcessing}
                            title="تأكيد الدفع"
                          >
                            <CheckCircle size={20} />
                          </button>
                          <button
                            onClick={() => handlePaymentConfirmation(payment, 'rejected')}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            disabled={isProcessing}
                            title="رفض الدفع"
                          >
                            <XCircle size={20} />
                          </button>
                        </>
                      )}
                      {payment.receiptUrl && (
                        <button
                          onClick={() => setSelectedReceipt(payment.receiptUrl)}
                          className="text-purple-600 hover:text-purple-900 transition-colors"
                          title="عرض الإيصال"
                        >
                          <Eye size={20} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {payments.map(payment => (
          <div key={payment.id} className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {payment.studentName || getStudentName(payment.studentId)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600 truncate">
                    {payment.courseName || getCourseName(payment.courseId)}
                  </span>
                </div>
              </div>
              <div className="mr-2 flex-shrink-0">
                {getStatusBadge(payment.status)}
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-xs text-gray-500 block">المبلغ</span>
                <div className="flex items-center gap-1 mt-1">
                  <DollarSign size={14} className="text-green-600" />
                  <span className="text-sm font-semibold text-gray-900">{payment.amount} جنيه</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">التاريخ</span>
                <span className="text-sm text-gray-700 mt-1 block">
                  {payment.createdAt?.toDate ? new Date(payment.createdAt.toDate()).toLocaleDateString('ar-EG') : '-'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
              {payment.status === 'pending' && (
                <>
                  <button
                    onClick={() => handlePaymentConfirmation(payment, 'confirmed')}
                    className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    <CheckCircle size={16} />
                    <span>تأكيد</span>
                  </button>
                  <button
                    onClick={() => handlePaymentConfirmation(payment, 'rejected')}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    <XCircle size={16} />
                    <span>رفض</span>
                  </button>
                </>
              )}
              {payment.receiptUrl && (
                <button
                  onClick={() => setSelectedReceipt(payment.receiptUrl)}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-sm font-medium transition-colors"
                >
                  <Eye size={16} />
                  <span>عرض الإيصال</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {payments.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg">
          <div className="text-center py-12">
            <Clock className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مدفوعات</h3>
            <p className="text-gray-600">لم يتم إضافة أي مدفوعات حتى الآن</p>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedReceipt(null)}
        >
          <div 
            className="bg-white p-2 sm:p-4 rounded-lg max-w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2 sm:mb-4">
              <h3 className="text-lg font-semibold">إيصال الدفع</h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <XCircle size={24} />
              </button>
            </div>
            <img 
              src={selectedReceipt} 
              alt="إيصال الدفع" 
              className="w-full h-auto max-w-2xl mx-auto rounded-lg"
            />
          </div>
        </div>
      )}
      
      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span>جاري المعالجة...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsManagement;