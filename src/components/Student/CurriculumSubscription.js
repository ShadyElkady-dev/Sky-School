// src/components/Student/CurriculumSubscription.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Clock, CreditCard, CheckCircle, Upload, Image, Smartphone, Building, AlertCircle, Calendar, Star, Lock, PieChart } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useCollection } from '../../hooks/useFirestore';
import { useNotifications } from '../../hooks/useNotifications'; // <-- إضافة: استيراد hook الإشعارات
import { where } from 'firebase/firestore'; // <-- إضافة

const CurriculumSubscription = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('vodafone');
  const fileInputRef = useRef(null);
  const { add: addSubscription } = useCollection('subscriptions');

  // <-- إضافة: جلب المديرين وإعداد إرسال الإشعارات -->
  const { data: admins } = useCollection('users', [where('role', '==', 'admin')]);
  const { sendAdminPendingReviewNotification } = useNotifications();


  const paymentMethods = [
    { id: 'vodafone', name: 'فودافون كاش', icon: <Smartphone className="text-red-600" size={24} />, number: '01234567890', available: true, isDefault: true },
    { id: 'instapay', name: 'انستاباي', icon: <Building className="text-blue-600" size={24} />, number: '01234567890', available: true, isNew: true },
    { id: 'bank_transfer', name: 'حوالة بنكية', icon: <Building className="text-green-600" size={24} />, accountNumber: '1234567890123456', bankName: 'البنك الأهلي المصري', available: true, isNew: true }
  ];

  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const curriculumDoc = await getDoc(doc(db, 'curricula', id));
        if (curriculumDoc.exists()) {
          const curriculumData = { id: curriculumDoc.id, ...curriculumDoc.data() };
          
          if (!curriculumData.isActive || !userProfile.age || userProfile.age < curriculumData.ageRangeFrom || userProfile.age > curriculumData.ageRangeTo) {
            alert('هذا المنهج غير متاح لك');
            navigate('/curricula');
            return;
          }
          
          setCurriculum(curriculumData);
          if (curriculumData.subscriptionPlans?.length > 0) {
            const defaultPlan = curriculumData.subscriptionPlans.find(p => p.type === 'quarterly') || curriculumData.subscriptionPlans[0];
            setSelectedPlan(defaultPlan);
          }
        } else {
          navigate('/curricula');
        }
      } catch (error) {
        console.error('Error fetching curriculum:', error);
      }
      setLoading(false);
    };

    fetchCurriculum();
  }, [id, navigate, userProfile]);

  const planCoverage = useMemo(() => {
    if (!selectedPlan || !curriculum?.levels) {
      return { coveredLevels: [], remainingDays: 0 };
    }

    const planDaysMap = { monthly: 30, quarterly: 90, semiannual: 180, annual: 365 };
    let remainingDays = planDaysMap[selectedPlan.type] || 0;

    const coveredLevels = curriculum.levels.sort((a,b) => a.order - b.order).map(level => {
      const levelDuration = parseInt(level.durationDays) || 30;
      if (remainingDays >= levelDuration) {
        remainingDays -= levelDuration;
        return { ...level, coverage: 'full' };
      } else if (remainingDays > 0) {
        const partialDays = remainingDays;
        remainingDays = 0;
        return { ...level, coverage: 'partial', coveredDays: partialDays };
      } else {
        return { ...level, coverage: 'none' };
      }
    });

    return { coveredLevels, remainingDays };

  }, [selectedPlan, curriculum]);

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

  const handleSubscription = async () => {
    if (!selectedPlan) {
      alert('يرجى اختيار خطة اشتراك');
      return;
    }

    if (!receiptUrl) {
      alert('يرجى رفع إيصال الدفع لإتمام عملية الاشتراك.');
      return;
    }

    setSubscribing(true);
    try {
      const planDays = { monthly: 30, quarterly: 90, semiannual: 180, annual: 365 };
      const accessCreditDays = planDays[selectedPlan.type] || 30;
      
      const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);
      
      await addSubscription({
        studentId: userProfile.id,
        studentName: `${userProfile.firstName} ${userProfile.lastName}`,
        curriculumId: curriculum.id,
        curriculumTitle: curriculum.title,
        planType: selectedPlan.type,
        planLabel: selectedPlan.label,
        amount: selectedPlan.price,
        status: 'pending',
        receiptUrl: receiptUrl || null,
        hasReceipt: !!receiptUrl,
        paymentMethod: selectedPaymentMethod,
        paymentMethodName: selectedMethod?.name || 'فودافون كاش',
        accessCreditDays: accessCreditDays,
        currentLevelAccessExpiresAt: null,
        currentLevel: 1,
        progress: {
          completedLevels: [],
          currentTopicIndex: 0
        }
      });

      // <-- إضافة: إرسال إشعار للمديرين -->
      admins.forEach(admin => {
        sendAdminPendingReviewNotification(admin.id, 1, 'subscription');
      });
      
      alert('تم إرسال طلب الاشتراك بنجاح! سيتم مراجعته وتفعيله من قبل الإدارة.');
      navigate('/my-curricula');
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('حدث خطأ في إرسال طلب الاشتراك');
    }
    setSubscribing(false);
  };

  const getPaymentInstructions = () => {
    const method = paymentMethods.find(m => m.id === selectedPaymentMethod);
    
    switch (selectedPaymentMethod) {
      case 'vodafone':
        return [
          'بعد الضغط على زر الاشتراك، سيتم تسجيل طلبك في النظام',
          `قم بإرسال مبلغ ${selectedPlan?.price} جنيه على رقم: ${method.number}`,
          'يجب رفع صورة إيصال الدفع لتأكيد طلبك',
          'سيتم التواصل معك خلال 24 ساعة لتأكيد الدفع',
          'بعد التأكيد، ستتمكن من الوصول للمنهج والتواصل مع الإدارة'
        ];
      case 'instapay':
        return [
          'بعد الضغط على زر الاشتراك، سيتم تسجيل طلبك في النظام',
          'افتح تطبيق البنك الخاص بك',
          'اختر InstaPay واستخدم الرقم: ' + method.number,
          `حول مبلغ ${selectedPlan?.price} جنيه`,
          'ارفع صورة إيصال التحويل',
          'سيتم تأكيد الدفع خلال 24 ساعة'
        ];
      case 'bank_transfer':
        return [
          'بعد الضغط على زر الاشتراك، سيتم تسجيل طلبك في النظام',
          `اذهب لأي فرع من ${method.bankName}`,
          `احول على رقم الحساب: ${method.accountNumber}`,
          `المبلغ: ${selectedPlan?.price} جنيه`,
          'ارفع صورة إيصال التحويل',
          'سيتم تأكيد الدفع خلال 24-48 ساعة'
        ];
      default:
        return [];
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري تحميل تفاصيل المنهج...</div>;
  }

  if (!curriculum) {
    return <div className="text-center py-8">المنهج غير موجود</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/curricula')}
        className="mb-6 text-purple-600 hover:text-purple-800 flex items-center gap-2 transition-colors"
      >
        <ArrowLeft size={20} />
        العودة للمناهج
      </button>
      
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {curriculum.image && (
          <div className="relative">
            <img src={curriculum.image} alt={curriculum.title} className="w-full h-64 object-cover" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
                <h1 className="text-2xl font-bold">{curriculum.title}</h1>
                <p className="text-white/80">اشتراك في المنهج التعليمي</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="p-8">
          {!curriculum.image && (
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">{curriculum.title}</h1>
              <p className="text-gray-600">اشتراك في المنهج التعليمي</p>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">1. اختر خطة الاشتراك</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {curriculum.subscriptionPlans?.filter(plan => plan.price > 0).map(plan => (
                <div
                  key={plan.type}
                  onClick={() => setSelectedPlan(plan)}
                  className={`border rounded-xl p-6 cursor-pointer transition-all ${
                    selectedPlan?.type === plan.type
                      ? 'border-purple-500 bg-purple-50 shadow-lg scale-105'
                      : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  <div className="text-center">
                    <h4 className="font-bold text-lg mb-2">{plan.label}</h4>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-purple-600">{plan.price}</span>
                      <span className="text-gray-600"> جنيه</span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p className="flex items-center justify-center gap-2">
                        <Calendar size={16} />
                        {plan.type === 'monthly' && 'رصيد 30 يوم'}
                        {plan.type === 'quarterly' && 'رصيد 90 يوم'}
                        {plan.type === 'semiannual' && 'رصيد 180 يوم'}
                        {plan.type === 'annual' && 'رصيد 365 يوم'}
                      </p>
                      {plan.type === 'annual' && (
                        <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          ⭐ الأوفر
                        </div>
                      )}
                      {plan.type === 'monthly' && (
                        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          🚀 الأشهر
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedPlan && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">2. ماذا يغطي اشتراكك؟</h3>
              <div className="bg-gray-50 rounded-xl p-6 border">
                <p className="text-center text-gray-700 mb-4">
                  خطة <strong className="text-purple-600">{selectedPlan.label}</strong> تمنحك رصيد <strong className="text-purple-600">{( { monthly: 30, quarterly: 90, semiannual: 180, annual: 365 }[selectedPlan.type] || 0)} يوماً</strong>. إليك كيف سيتم استهلاكه:
                </p>
                <div className="space-y-3">
                  {planCoverage.coveredLevels.map((level) => (
                    <div key={level.id} className={`p-4 rounded-lg border-l-4 ${
                      level.coverage === 'full' ? 'bg-green-50 border-green-500' :
                      level.coverage === 'partial' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-gray-100 border-gray-300'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {level.coverage === 'full' && <CheckCircle className="text-green-500 mt-1 flex-shrink-0"/>}
                          {level.coverage === 'partial' && <Clock className="text-yellow-500 mt-1 flex-shrink-0"/>}
                          {level.coverage === 'none' && <Lock className="text-gray-400 mt-1 flex-shrink-0"/>}
                          <div>
                            <h4 className="font-semibold text-gray-800">{level.order}. {level.title}</h4>
                            <p className="text-sm text-gray-600">المدة المطلوبة: {level.durationDays} يوم ({level.sessionsCount} جلسة)</p>
                          </div>
                        </div>
                        {level.coverage === 'partial' && (
                          <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            يغطي {level.coveredDays} يوم فقط
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center bg-white p-4 rounded-lg shadow-inner">
                  <p className="font-semibold text-lg">
                    بعد تغطية هذه المراحل، سيتبقى في رصيدك: <span className="text-2xl text-purple-600">{planCoverage.remainingDays}</span> يوماً
                  </p>
                  <p className="text-sm text-gray-500 mt-1">يمكنك استخدامها في المراحل التالية أو تجديدها لاحقاً.</p>
                </div>
              </div>
            </div>
          )}

          {selectedPlan && (
            <>
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="text-xl font-semibold mb-4">3. اختر طريقة الدفع</h3>
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
                        <div><strong>البنك:</strong> البنك الأهلي المصري</div>
                        <div><strong>رقم الحساب:</strong> 1234567890123456</div>
                        <div className="md:col-span-2"><strong>اسم الحساب:</strong> أكاديمية المناهج التعليمية</div>
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
                  4. رفع إيصال الدفع (مطلوب)
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
                          رفع الإيصال مطلوب لإتمام الاشتراك
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={handleSubscription}
                disabled={subscribing || !receiptUrl}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard size={24} />
                {subscribing ? 'جاري إرسال الطلب...' : `تأكيد الاشتراك - ${selectedPlan.price} جنيه`}
              </button>
              
              <p className="text-center text-gray-500 text-sm mt-4">
                بالضغط على زر الاشتراك، أنت توافق على شروط وأحكام المنصة وسياسة الاشتراكات
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurriculumSubscription;