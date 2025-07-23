// src/components/Admin/PaymentsManagement.js
import React, { useState } from 'react';
import { CheckCircle, XCircle, DollarSign, Clock, Eye } from 'lucide-react';
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

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">إدارة المدفوعات</h2>
      
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
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
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      payment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      payment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.status === 'confirmed' ? 'مؤكد' :
                       payment.status === 'rejected' ? 'مرفوض' : 'معلق'}
                    </span>
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
        
        {payments.length === 0 && (
          <div className="text-center py-12">
            <Clock className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">لا توجد مدفوعات حتى الآن</p>
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

export default PaymentsManagement;