// src/components/Student/ProfileSettings.js
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useFirestore';
import { where } from 'firebase/firestore';
import { User, Mail, Phone, Calendar, Award, GraduationCap } from 'lucide-react';

const ProfileSettings = () => {
  const { userProfile } = useAuth();

  // جلب الاشتراكات والكورسات
  const { data: subscriptions } = useCollection('subscriptions', [where('studentId', '==', userProfile.id)]);
  const { data: enrollments } = useCollection('enrollments', [where('studentId', '==', userProfile.id)]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-3xl">
            {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
        </div>
        <div>
            <h1 className="text-3xl font-bold text-gray-800">
                {userProfile?.firstName} {userProfile?.lastName}
            </h1>
            <p className="text-gray-500">مرحباً بك في ملفك الشخصي</p>
        </div>
      </div>
      
      {/* قسم المعلومات الشخصية */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="text-purple-600"/>
            المعلومات الشخصية
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail size={20} className="text-gray-500 flex-shrink-0"/>
                <div>
                    <p className="text-xs text-gray-600">البريد الإلكتروني</p>
                    <p className="font-medium truncate">{userProfile.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone size={20} className="text-gray-500 flex-shrink-0"/>
                <div>
                    <p className="text-xs text-gray-600">رقم الهاتف</p>
                    <p className="font-medium">{userProfile.phone}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar size={20} className="text-gray-500 flex-shrink-0"/>
                <div>
                    <p className="text-xs text-gray-600">العمر</p>
                    <p className="font-medium">{userProfile.age} سنة</p>
                </div>
            </div>
            {userProfile.parentPhone && (
                 <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone size={20} className="text-gray-500 flex-shrink-0"/>
                    <div>
                        <p className="text-xs text-gray-600">هاتف ولي الأمر</p>
                        <p className="font-medium">{userProfile.parentPhone}</p>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* قسم الاشتراكات */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <GraduationCap className="text-purple-600"/>
            ملخص الاشتراكات
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-4xl font-bold text-purple-700">{subscriptions.length}</p>
                <p className="text-sm text-gray-600 mt-1">منهج مشترك به</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-4xl font-bold text-blue-700">{enrollments.length}</p>
                <p className="text-sm text-gray-600 mt-1">كورس مسجل به</p>
            </div>
        </div>
        <div className="mt-4 text-center">
            <a href="/my-curricula" className="text-purple-600 hover:underline font-medium">
                عرض مناهجي
            </a>
            <span className="mx-2 text-gray-300">|</span>
            <a href="/my-courses" className="text-blue-600 hover:underline font-medium">
                عرض كورساتي
            </a>
        </div>
      </div>

    </div>
  );
};

export default ProfileSettings;