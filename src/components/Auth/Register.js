// src/components/Auth/Register.js
import React, { useState } from 'react';
import { Phone, Lock, Mail, User, Calendar, Users, GraduationCap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';

const Register = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const { t, language } = useLanguage();
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    age: '',
    gender: '',
    parentPhone: '' // <-- إضافة حقل جديد لولي الأمر
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // تحديد الفئة العمرية (سيتم حفظها في قاعدة البيانات بدون عرضها للمستخدم)
  const getAgeGroup = (age) => {
    const numAge = parseInt(age);
    if (numAge >= 6 && numAge <= 9) return 'kids';        // أطفال (6-9)
    if (numAge >= 10 && numAge <= 13) return 'juniors';   // صغار (10-13)
    if (numAge >= 14 && numAge <= 17) return 'teens';     // مراهقين (14-17)
    if (numAge >= 18) return 'adults';                    // بالغين (18+)
    return null; // عمر غير صالح
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // التحقق من صحة البيانات
    if (!registerData.age || parseInt(registerData.age) < 6) {
      setError('العمر يجب أن يكون 6 سنوات أو أكثر');
      setLoading(false);
      return;
    }

    if (parseInt(registerData.age) < 18 && !registerData.parentPhone) {
      setError('يرجى إدخال رقم هاتف ولي الأمر للطلاب تحت 18 سنة');
      setLoading(false);
      return;
    }

    if (!registerData.gender) {
      setError('يرجى اختيار النوع');
      setLoading(false);
      return;
    }
    
    try {
      const ageGroup = getAgeGroup(registerData.age);
      
      const dataToRegister = { ...registerData, age: parseInt(registerData.age), ageGroup };
      // حذف رقم ولي الأمر إذا كان العمر 18 أو أكثر
      if (parseInt(registerData.age) >= 18) {
        delete dataToRegister.parentPhone;
      }

      await register(dataToRegister);
      
      setRegisterData({ 
        firstName: '', 
        lastName: '', 
        phone: '', 
        email: '', 
        password: '',
        age: '',
        gender: '',
        parentPhone: ''
      });
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        {/* اللوجو */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">SKY ACADEMY</h1>
        </div>
        
        <h2 className="text-2xl font-bold text-white text-center mb-6">{t('register')}</h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-white p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* الاسم */}
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder={t('firstName')}
              value={registerData.firstName}
              onChange={(e) => setRegisterData({...registerData, firstName: e.target.value})}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:border-white/40"
              required
              disabled={loading}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            />
            <input
              type="text"
              placeholder={t('lastName')}
              value={registerData.lastName}
              onChange={(e) => setRegisterData({...registerData, lastName: e.target.value})}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:border-white/40"
              required
              disabled={loading}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>
          
          {/* رقم الهاتف */}
          <div className="relative">
            <Phone className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-3 text-white/60`} size={20} />
            <input
              type="tel"
              placeholder={t('phone')}
              value={registerData.phone}
              onChange={(e) => setRegisterData({...registerData, phone: e.target.value})}
              className={`w-full bg-white/10 border border-white/20 rounded-xl ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 text-white placeholder-white/60 focus:outline-none focus:border-white/40`}
              required
              disabled={loading}
              dir="ltr"
            />
          </div>
          
          {/* البريد الإلكتروني */}
          <div className="relative">
            <Mail className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-3 text-white/60`} size={20} />
            <input
              type="email"
              placeholder={t('emailOptional')}
              value={registerData.email}
              onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
              className={`w-full bg-white/10 border border-white/20 rounded-xl ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 text-white placeholder-white/60 focus:outline-none focus:border-white/40`}
              disabled={loading}
              dir="ltr"
            />
          </div>
          
          {/* العمر والنوع */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Calendar className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-3 text-white/60`} size={20} />
              <input
                type="number"
                placeholder="العمر"
                value={registerData.age}
                onChange={(e) => setRegisterData({...registerData, age: e.target.value})}
                className={`w-full bg-white/10 border border-white/20 rounded-xl ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 text-white placeholder-white/60 focus:outline-none focus:border-white/40 h-12`}
                min="6"
                max="100"
                required
                disabled={loading}
              />
            </div>
            
            <div className="relative">
              <Users className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-3 text-white/60`} size={20} />
              <select
                value={registerData.gender}
                onChange={(e) => setRegisterData({...registerData, gender: e.target.value})}
                className={`w-full bg-white/10 border border-white/20 rounded-xl ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 text-white focus:outline-none focus:border-white/40 h-12 appearance-none`}
                required
                disabled={loading}
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: `${language === 'ar' ? 'left 0.5rem' : 'right 0.5rem'} center`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em'
                }}
              >
                <option value="" className="bg-gray-800">اختر النوع</option>
                <option value="male" className="bg-gray-800">ذكر</option>
                <option value="female" className="bg-gray-800">أنثى</option>
              </select>
            </div>
          </div>

          {/* <-- التعديل الجديد: إظهار حقل ولي الأمر بشكل شرطي --> */}
          {registerData.age && parseInt(registerData.age) < 18 && (
            <div className="relative">
              <Phone className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-3 text-white/60`} size={20} />
              <input
                type="tel"
                placeholder="رقم هاتف ولي الأمر"
                value={registerData.parentPhone}
                onChange={(e) => setRegisterData({...registerData, parentPhone: e.target.value})}
                className={`w-full bg-white/10 border border-white/20 rounded-xl ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 text-white placeholder-white/60 focus:outline-none focus:border-white/40`}
                required
                disabled={loading}
                dir="ltr"
              />
            </div>
          )}
          
          {/* كلمة المرور */}
          <div className="relative">
            <Lock className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-3 text-white/60`} size={20} />
            <input
              type="password"
              placeholder={t('password')}
              value={registerData.password}
              onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
              className={`w-full bg-white/10 border border-white/20 rounded-xl ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 text-white placeholder-white/60 focus:outline-none focus:border-white/40`}
              required
              disabled={loading}
              dir="ltr"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl py-3 font-semibold hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('registering') : t('registerButton')}
          </button>
          
          <p className="text-center text-white/80">
            {t('haveAccount')}{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-white font-semibold hover:underline"
              disabled={loading}
            >
              {t('loginNow')}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;