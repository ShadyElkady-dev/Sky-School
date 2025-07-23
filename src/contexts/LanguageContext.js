// src/contexts/LanguageContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
  ar: {
    // Auth
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب جديد',
    firstName: 'الاسم الأول',
    lastName: 'الاسم الأخير',
    phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني',
    emailOptional: 'البريد الإلكتروني (اختياري)',
    password: 'كلمة المرور',
    loginButton: 'دخول',
    registerButton: 'إنشاء الحساب',
    haveAccount: 'لديك حساب بالفعل؟',
    noAccount: 'ليس لديك حساب؟',
    loginNow: 'تسجيل الدخول',
    registerNow: 'سجل الآن',
    loggingIn: 'جاري الدخول...',
    registering: 'جاري إنشاء الحساب...',
    
    // Dashboard
    platformName: 'منصة الكورسات المباشرة',
    logout: 'خروج',
    
    // Admin
    coursesManagement: 'إدارة الكورسات',
    payments: 'المدفوعات',
    users: 'المستخدمين',
    addNewCourse: 'إضافة كورس جديد',
    editCourse: 'تعديل الكورس',
    courseTitle: 'عنوان الكورس',
    price: 'السعر',
    duration: 'المدة',
    startDate: 'تاريخ البدء',
    description: 'وصف الكورس',
    imageUrl: 'رابط الصورة',
    add: 'إضافة',
    update: 'تحديث',
    cancel: 'إلغاء',
    edit: 'تعديل',
    delete: 'حذف',
    selectTrainer: 'اختر مدرب',
    egp: 'جنيه',
    
    // Student
    availableCourses: 'الكورسات المتاحة',
    myCourses: 'كورساتي',
    viewDetails: 'عرض التفاصيل',
    enrolled: 'مسجل',
    pending: 'قيد المراجعة',
    enrolledInCourse: 'مسجل في الكورس',
    waitingPayment: 'في انتظار تأكيد الدفع',
    
    // Trainer
    students: 'الطلاب',
    myStudents: 'طلابي',
    startChat: 'بدء المحادثة',
    
    // Payment
    paymentMethod: 'طريقة الدفع',
    vodafoneCash: 'فودافون كاش',
    confirmEnrollment: 'تأكيد التسجيل والدفع',
    
    // Messages
    typeMessage: 'اكتب رسالتك...',
    send: 'إرسال',
    chatWith: 'محادثة مع',
    
    // Roles
    admin: 'مدير',
    trainer: 'مدرب', 
    student: 'طالب',
    
    // Status
    confirmed: 'مؤكد',
    rejected: 'مرفوض',
    pendingStatus: 'معلق',
    
    // Actions
    actions: 'الإجراءات',
    loading: 'جاري التحميل...',
    noDataYet: 'لا توجد بيانات حتى الآن',
  },
  en: {
    // Auth
    login: 'Login',
    register: 'Create Account',
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone Number',
    email: 'Email',
    emailOptional: 'Email (Optional)',
    password: 'Password',
    loginButton: 'Login',
    registerButton: 'Create Account',
    haveAccount: 'Already have an account?',
    noAccount: "Don't have an account?",
    loginNow: 'Login',
    registerNow: 'Register Now',
    loggingIn: 'Logging in...',
    registering: 'Creating account...',
    
    // Dashboard
    platformName: 'Live Courses Platform',
    logout: 'Logout',
    
    // Admin
    coursesManagement: 'Courses Management',
    payments: 'Payments',
    users: 'Users',
    addNewCourse: 'Add New Course',
    editCourse: 'Edit Course',
    courseTitle: 'Course Title',
    price: 'Price',
    duration: 'Duration',
    startDate: 'Start Date',
    description: 'Course Description',
    imageUrl: 'Image URL',
    add: 'Add',
    update: 'Update',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    selectTrainer: 'Select Trainer',
    egp: 'EGP',
    
    // Student
    availableCourses: 'Available Courses',
    myCourses: 'My Courses',
    viewDetails: 'View Details',
    enrolled: 'Enrolled',
    pending: 'Under Review',
    enrolledInCourse: 'Enrolled in Course',
    waitingPayment: 'Waiting for Payment Confirmation',
    
    // Trainer
    students: 'Students',
    myStudents: 'My Students',
    startChat: 'Start Chat',
    
    // Payment
    paymentMethod: 'Payment Method',
    vodafoneCash: 'Vodafone Cash',
    confirmEnrollment: 'Confirm Enrollment & Payment',
    
    // Messages
    typeMessage: 'Type your message...',
    send: 'Send',
    chatWith: 'Chat with',
    
    // Roles
    admin: 'Admin',
    trainer: 'Trainer',
    student: 'Student',
    
    // Status
    confirmed: 'Confirmed',
    rejected: 'Rejected',
    pendingStatus: 'Pending',
    
    // Actions
    actions: 'Actions',
    loading: 'Loading...',
    noDataYet: 'No data yet',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'ar';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};