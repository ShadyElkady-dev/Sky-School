// src/components/Student/CourseDetails.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Clock, CreditCard, CheckCircle, Upload, Image, Smartphone, Building, AlertCircle, BookOpen, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useCollection } from '../../hooks/useFirestore';
import { useNotifications } from '../../hooks/useNotifications'; // <-- إضافة: استيراد hook الإشعارات
import { where } from 'firebase/firestore'; // <-- إضافة

const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('vodafone');
  const fileInputRef = useRef(null);
  const { add: addPayment } = useCollection('payments');

  // <-- إضافة: جلب المديرين وإعداد إرسال الإشعارات -->
  const { data: admins } = useCollection('users', [where('role', '==', 'admin')]);
  const { sendAdminPendingReviewNotification } = useNotifications();


  const paymentMethods = [
    {
      id: 'vodafone',
      name: 'فودافون كاش',
      icon: <Smartphone className="text-red-600" size={24} />,
      number: '01234567890',
      available: true,
      isDefault: true
    },
    {
      id: 'instapay',
      name: 'انستاباي',
      icon: <Building className="text-blue-600" size={24} />,
      number: '01234567890',
      available: true,
      isNew: true
    },
    {
      id: 'bank_transfer',
      name: 'حوالة بنكية',
      icon: <Building className="text-green-600" size={24} />,
      accountNumber: '1234567890123456',
      bankName: 'البنك الأهلي المصري',
      available: true,
      isNew: true
    }
  ];

  const levelLabels = {
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم'
  };

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const courseDoc = await getDoc(doc(db, 'courses', id));
        if (courseDoc.exists()) {
          const courseData = { id: courseDoc.id, ...courseDoc.data() };
          
          if (!userProfile.age || 
              !courseData.ageRangeFrom || 
              !courseData.ageRangeTo ||
              userProfile.age < courseData.ageRangeFrom || 
              userProfile.age > courseData.ageRangeTo) {
            alert('هذا الكورس غير متاح لفئتك العمرية');
            navigate('/courses');
            return;
          }
          
          setCourse(courseData);
        } else {
          navigate('/courses');
        }
      } catch (error) {
        console.error('Error fetching course:', error);
      }
      setLoading(false);
    };

    fetchCourse();
  }, [id, navigate, userProfile]);

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    if (!file.type.startsWith('image/')) {
      alert('يرجى رفع صورة فقط');
      return;
    }
  
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('حجم الصورة كبير جداً. الحد الأقصى 5 ميجا');
      return;
    }
  
    setUploadingReceipt(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setReceiptUrl(reader.result);
      setUploadingReceipt(false);
      alert('تم إرفاق إيصال الدفع بنجاح');
    };
    reader.onerror = (error) => {
      console.error('Error converting file to Base64:', error);
      alert('خطأ في معالجة الصورة');
      setUploadingReceipt(false);
    };
  };

  const handleEnrollment = async () => {
    if (!receiptUrl) {
      alert('يرجى رفع إيصال الدفع لإتمام عملية التسجيل.');
      return;
    }
    
    setEnrolling(true);
    try {
      const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);
      
      await addPayment({
        studentId: userProfile.id,
        studentName: `${userProfile.firstName} ${userProfile.lastName}`,
        courseId: course.id,
        courseName: course.title,
        amount: course.price,
        status: 'pending',
        receiptUrl: receiptUrl || null,
        hasReceipt: !!receiptUrl,
        paymentMethod: selectedPaymentMethod,
        paymentMethodName: selectedMethod?.name || 'فودافون كاش'
      });

      // <-- إضافة: إرسال إشعار للمديرين -->
      admins.forEach(admin => {
        sendAdminPendingReviewNotification(admin.id, 1, 'payment');
      });
      
      alert('تم إرسال طلب التسجيل بنجاح! سيتم التواصل معك لتأكيد الدفع.');
      navigate('/courses');
    } catch (error) {
      console.error('Error creating enrollment:', error);
      alert('حدث خطأ في إرسال طلب التسجيل');
    }
    setEnrolling(false);
  };

  const getPaymentInstructions = () => {
    const method = paymentMethods.find(m => m.id === selectedPaymentMethod);
    
    switch (selectedPaymentMethod) {
      case 'vodafone':
        return [
          'بعد الضغط على زر التسجيل، سيتم تسجيل طلبك في النظام',
          `قم بإرسال مبلغ ${course?.price} جنيه على رقم: ${method.number}`,
          'يجب رفع صورة إيصال الدفع لتأكيد طلبك',
          'سيتم التواصل معك خلال 24 ساعة لتأكيد الدفع',
          'بعد التأكيد، ستتمكن من التواصل مع الإدارة مباشرة'
        ];
      case 'instapay':
        return [
          'بعد الضغط على زر التسجيل، سيتم تسجيل طلبك في النظام',
          'افتح تطبيق البنك الخاص بك',
          'اختر InstaPay واستخدم الرقم: ' + method.number,
          `حول مبلغ ${course?.price} جنيه`,
          'ارفع صورة إيصال التحويل',
          'سيتم تأكيد الدفع خلال 24 ساعة'
        ];
      case 'bank_transfer':
        return [
          'بعد الضغط على زر التسجيل، سيتم تسجيل طلبك في النظام',
          `اذهب لأي فرع من ${method.bankName}`,
          `احول على رقم الحساب: ${method.accountNumber}`,
          `المبلغ: ${course?.price} جنيه`,
          'ارفع صورة إيصال التحويل',
          'سيتم تأكيد الدفع خلال 24-48 ساعة'
        ];
      default:
        return [];
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري تحميل تفاصيل الكورس...</div>;
  }

  if (!course) {
    return <div className="text-center py-8">الكورس غير موجود</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/courses')}
        className="mb-6 text-purple-600 hover:text-purple-800 flex items-center gap-2 transition-colors"
      >
        <ArrowLeft size={20} />
        العودة للكورسات
      </button>
      
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {course.image && (
          <div className="relative">
            <img src={course.image} alt={course.title} className="w-full h-64 object-cover" />
            
            <div className="absolute top-4 right-4 flex gap-2">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                {course.category}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                course.level === 'beginner' ? 'bg-green-100 text-green-800' :
                course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {levelLabels[course.level]}
              </span>
            </div>
          </div>
        )}
        
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
          <p className="text-gray-600 text-lg mb-6 leading-relaxed">{course.description}</p>
          
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="text-purple-600" size={20} />
              <span className="font-semibold text-purple-800">الفئة العمرية المستهدفة:</span>
            </div>
            <span className="text-purple-700">
              من {course.ageRangeFrom} إلى {course.ageRangeTo} سنة
            </span>
            <div className="mt-2 text-sm text-purple-600">
              ✓ عمرك ({userProfile.age} سنة) مناسب لهذا الكورس
            </div>
          </div>

          {course.prerequisites && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">المتطلبات المسبقة:</h3>
              <p className="text-yellow-700">{course.prerequisites}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-purple-50 rounded-xl p-6 text-center">
              <DollarSign className="mx-auto text-purple-600 mb-3" size={36} />
              <p className="text-3xl font-bold text-purple-900">{course.price} جنيه</p>
              <p className="text-gray-600 mt-1">سعر الكورس</p>
            </div>
            
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <Clock className="mx-auto text-blue-600 mb-3" size={36} />
              <p className="text-3xl font-bold text-blue-900">{course.duration}</p>
              <p className="text-gray-600 mt-1">مدة الكورس</p>
            </div>
            
            <div className="bg-green-50 rounded-xl p-6 text-center">
              <BookOpen className="mx-auto text-green-600 mb-3" size={36} />
              <p className="text-3xl font-bold text-green-900">
                {course.sessionsCount || 'غير محدد'}
              </p>
              <p className="text-gray-600 mt-1">عدد الحصص</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4">اختر طريقة الدفع</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {paymentMethods.map(method => (
                <div
                  key={method.id}
                  onClick={() => method.available && setSelectedPaymentMethod(method.id)}
                  className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPaymentMethod === method.id
                      ? 'border-purple-500 bg-white shadow-md'
                      : 'border-gray-200 hover:border-purple-300'
                  } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {method.isNew && (
                    <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      جديد
                    </span>
                  )}
                  
                  <div className="flex items-center gap-3 mb-2">
                    {method.icon}
                    <span className="font-medium">{method.name}</span>
                  </div>
                  
                  {method.isDefault && (
                    <span className="text-xs text-purple-600">الطريقة الافتراضية</span>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                {paymentMethods.find(m => m.id === selectedPaymentMethod)?.icon}
                طريقة الدفع: {paymentMethods.find(m => m.id === selectedPaymentMethod)?.name}
              </h4>
              
              {selectedPaymentMethod === 'vodafone' && (
                <div className="text-center my-6">
                  <p className="text-4xl font-bold text-purple-900">01234567890</p>
                  <p className="text-gray-600 mt-2">رقم فودافون كاش</p>
                </div>
              )}
              
              {selectedPaymentMethod === 'instapay' && (
                <div className="text-center my-6">
                  <p className="text-4xl font-bold text-blue-900">01234567890</p>
                  <p className="text-gray-600 mt-2">رقم InstaPay</p>
                </div>
              )}
              
              {selectedPaymentMethod === 'bank_transfer' && (
                <div className="bg-gray-50 rounded-lg p-4 my-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>البنك:</strong> البنك الأهلي المصري
                    </div>
                    <div>
                      <strong>رقم الحساب:</strong> 1234567890123456
                    </div>
                    <div className="md:col-span-2">
                      <strong>اسم الحساب:</strong> أكاديمية الكورسات المباشرة
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3 text-sm text-gray-600">
                {getPaymentInstructions().map((instruction, index) => (
                  <p key={index} className="flex items-start gap-2">
                    <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                    {instruction}
                  </p>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload size={24} />
              رفع إيصال الدفع (مطلوب)
            </h3>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleReceiptUpload}
              className="hidden"
            />
            
            {receiptUrl ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 flex items-center gap-2">
                    <CheckCircle size={20} />
                    تم رفع إيصال الدفع بنجاح
                  </p>
                </div>
                <img 
                  src={receiptUrl} 
                  alt="إيصال الدفع" 
                  className="max-w-full h-48 object-contain mx-auto rounded-lg border"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-purple-600 hover:text-purple-700 text-sm underline"
                >
                  تغيير الإيصال
                </button>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingReceipt}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-purple-400 transition-colors flex flex-col items-center gap-3 group"
                >
                  {uploadingReceipt ? (
                    <div className="animate-spin h-10 w-10 border-4 border-purple-600 border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Image size={40} className="text-gray-400 group-hover:text-purple-600" />
                      <span className="text-gray-600 group-hover:text-purple-600">
                        اضغط لرفع صورة الإيصال
                      </span>
                      <span className="text-sm text-gray-500">
                        JPG, PNG (حتى 5 ميجا)
                      </span>
                    </>
                  )}
                </button>
                
                {!receiptUrl && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      رفع الإيصال مطلوب لإتمام التسجيل
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={handleEnrollment}
            disabled={enrolling || !receiptUrl}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard size={24} />
            {enrolling ? 'جاري التسجيل...' : 'تأكيد التسجيل والدفع'}
          </button>
          
          <p className="text-center text-gray-500 text-sm mt-4">
            بالضغط على زر التسجيل، أنت توافق على شروط وأحكام المنصة
          </p>
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;