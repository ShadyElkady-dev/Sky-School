// src/components/Admin/UsersManagement.js
import React, { useState, useMemo } from 'react';
import { Users, UserPlus, Shield, GraduationCap, Award, Filter, Search, SortAsc, SortDesc, User, Calendar, ChevronDown, X } from 'lucide-react';
import { useCollection } from '../../hooks/useFirestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

const UsersManagement = () => {
  const { data: users, loading } = useCollection('users');
  const [isAdding, setIsAdding] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [newTrainer, setNewTrainer] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    gender: 'male',
    age: ''
  });

  // حالات الفلتر والبحث
  const [filters, setFilters] = useState({
    role: 'all', // all, admin, trainer, student
    gender: 'all', // all, male, female
    ageGroup: 'all', // all, kids, juniors, teens, adults
    search: '',
    sortBy: 'createdAt', // createdAt, name
    sortOrder: 'desc' // asc, desc
  });

  // تحديد الفئة العمرية
  const getAgeGroup = (age) => {
    const numAge = parseInt(age);
    if (numAge >= 6 && numAge <= 9) return 'kids';        // أطفال (6-9)
    if (numAge >= 10 && numAge <= 13) return 'juniors';   // صغار (10-13)
    if (numAge >= 14 && numAge <= 17) return 'teens';     // مراهقين (14-17)
    if (numAge >= 18) return 'adults';                    // بالغين (18+)
    return null;
  };

  const handleAddTrainer = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    
    try {
      const email = newTrainer.email || `${newTrainer.phone}@livecourses.com`;
      
      // التحقق من العمر
      if (!newTrainer.age || parseInt(newTrainer.age) < 18) {
        alert('عمر المدرب يجب أن يكون 18 سنة أو أكثر');
        setIsAdding(false);
        return;
      }

      const ageGroup = getAgeGroup(newTrainer.age);
      
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, newTrainer.password);
      
      // Save trainer profile
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        firstName: newTrainer.firstName,
        lastName: newTrainer.lastName,
        phone: newTrainer.phone,
        email: email,
        gender: newTrainer.gender,
        age: parseInt(newTrainer.age),
        ageGroup: ageGroup,
        role: 'trainer',
        createdAt: new Date()
      });
      
      setNewTrainer({ firstName: '', lastName: '', phone: '', email: '', password: '', gender: 'male', age: '' });
      alert('تم إضافة المدرب بنجاح');
    } catch (error) {
      console.error('Error adding trainer:', error);
      alert('خطأ في إضافة المدرب: ' + error.message);
    }
    
    setIsAdding(false);
  };

  // فلترة وترتيب المستخدمين
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      // فلتر حسب الدور
      if (filters.role !== 'all' && user.role !== filters.role) {
        return false;
      }
      
      // فلتر حسب الجنس
      if (filters.gender !== 'all' && user.gender !== filters.gender) {
        return false;
      }

      // فلتر حسب الفئة العمرية
      if (filters.ageGroup !== 'all' && user.ageGroup !== filters.ageGroup) {
        return false;
      }
      
      // فلتر البحث
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const phone = user.phone || '';
        const email = user.email || '';
        
        return fullName.includes(searchTerm) || 
               phone.includes(searchTerm) || 
               email.toLowerCase().includes(searchTerm);
      }
      
      return true;
    });

    // ترتيب المستخدمين
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (filters.sortBy === 'createdAt') {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        comparison = dateA.getTime() - dateB.getTime();
      } else if (filters.sortBy === 'name') {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        comparison = nameA.localeCompare(nameB);
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [users, filters]);

  // تجميع المستخدمين حسب الدور
  const groupedUsers = useMemo(() => {
    const groups = {
      admin: [],
      trainer: [],
      student: []
    };

    filteredAndSortedUsers.forEach(user => {
      if (groups[user.role]) {
        groups[user.role].push(user);
      }
    });

    return groups;
  }, [filteredAndSortedUsers]);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield size={16} />;
      case 'trainer':
        return <Award size={16} />;
      default:
        return <GraduationCap size={16} />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'trainer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getGenderIcon = (gender) => {
    return gender === 'female' ? 'اثنى' : 'ذكر';
  };

  const toggleSort = (sortBy) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  // عرض المستخدمين كبطاقات على الهواتف
  const renderMobileUserCard = (user) => (
    <div key={user.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-lg">
            {user.firstName} {user.lastName}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getRoleColor(user.role)}`}>
              {getRoleIcon(user.role)}
              {user.role === 'admin' ? 'مدير' :
               user.role === 'trainer' ? 'مدرب' : 'طالب'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl">{user.gender === 'female' ? '👩' : '👨'}</span>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">العمر:</span>
          <span className="font-medium">{user.age || '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">الهاتف:</span>
          <span className="font-medium" dir="ltr">{user.phone}</span>
        </div>
        {user.parentPhone && (
          <div className="flex justify-between">
            <span className="text-gray-600">هاتف ولي الأمر:</span>
            <span className="font-medium" dir="ltr">{user.parentPhone}</span>
          </div>
        )}
        {user.email && (
          <div className="flex justify-between">
            <span className="text-gray-600">الإيميل:</span>
            <span className="font-medium text-xs" dir="ltr">{user.email}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t border-gray-100">
          <span className="text-gray-600">تاريخ التسجيل:</span>
          <span className="font-medium text-xs">
            {user.createdAt?.toDate ? new Date(user.createdAt.toDate()).toLocaleDateString('ar-EG') : '-'}
          </span>
        </div>
      </div>
    </div>
  );

  // عرض المستخدمين كجدول على الشاشات الكبيرة
  const renderDesktopUsersGroup = (users, groupTitle, groupColor) => {
    if (users.length === 0) return null;

    return (
      <div className="mb-8">
        <h3 className={`text-lg font-semibold mb-4 px-4 py-2 rounded-lg ${groupColor} inline-block`}>
          {groupTitle} ({users.length})
        </h3>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right">الاسم</th>
                  <th className="px-6 py-3 text-right">الجنس</th>
                  <th className="px-6 py-3 text-right">العمر</th>
                  <th className="px-6 py-3 text-right">رقم الهاتف</th>
                  <th className="px-6 py-3 text-right">هاتف ولي الأمر</th>
                  <th className="px-6 py-3 text-right">البريد الإلكتروني</th>
                  <th className="px-6 py-3 text-right">النوع</th>
                  <th 
                    className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleSort('createdAt')}
                  >
                    <div className="flex items-center gap-2 justify-end">
                      تاريخ التسجيل
                      {filters.sortBy === 'createdAt' && (
                        filters.sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium whitespace-nowrap">{user.firstName} {user.lastName}</td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="text-lg">{getGenderIcon(user.gender)}</span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">{user.age || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.parentPhone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {user.role === 'admin' ? 'مدير' :
                         user.role === 'trainer' ? 'مدرب' : 'طالب'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {user.createdAt?.toDate ? new Date(user.createdAt.toDate()).toLocaleDateString('ar-EG') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // عرض المستخدمين كبطاقات على الهواتف
  const renderMobileUsersGroup = (users, groupTitle, groupColor) => {
    if (users.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className={`text-base font-semibold mb-3 px-3 py-2 rounded-lg ${groupColor} inline-block`}>
          {groupTitle} ({users.length})
        </h3>
        <div className="space-y-3">
          {users.map(renderMobileUserCard)}
        </div>
      </div>
    );
  };

  // تصفية المستخدمين حسب التاب النشط
  const getFilteredUsersByTab = () => {
    if (activeTab === 'all') return filteredAndSortedUsers;
    return filteredAndSortedUsers.filter(user => user.role === activeTab);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-4 sticky top-0 z-40">
        <h2 className="text-xl md:text-3xl font-bold text-gray-800">إدارة المستخدمين</h2>
      </div>

      <div className="p-4 space-y-4 md:space-y-6 max-w-7xl mx-auto">
        {/* Add Trainer Form */}
        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
            <UserPlus size={20} />
            إضافة مدرب جديد
          </h3>
          <form onSubmit={handleAddTrainer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="الاسم الأول"
                value={newTrainer.firstName}
                onChange={(e) => setNewTrainer({...newTrainer, firstName: e.target.value})}
                className="border rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 w-full"
                required
                disabled={isAdding}
              />
              <input
                type="text"
                placeholder="الاسم الأخير"
                value={newTrainer.lastName}
                onChange={(e) => setNewTrainer({...newTrainer, lastName: e.target.value})}
                className="border rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 w-full"
                required
                disabled={isAdding}
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <select
                value={newTrainer.gender}
                onChange={(e) => setNewTrainer({...newTrainer, gender: e.target.value})}
                className="border rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 w-full"
                required
                disabled={isAdding}
              >
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
              <input
                type="number"
                placeholder="العمر"
                value={newTrainer.age}
                onChange={(e) => setNewTrainer({...newTrainer, age: e.target.value})}
                className="border rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 w-full"
                min="18"
                max="100"
                required
                disabled={isAdding}
              />
              <input
                type="tel"
                placeholder="رقم الهاتف"
                value={newTrainer.phone}
                onChange={(e) => setNewTrainer({...newTrainer, phone: e.target.value})}
                className="border rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 w-full col-span-2 md:col-span-1"
                required
                disabled={isAdding}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="email"
                placeholder="البريد الإلكتروني (اختياري)"
                value={newTrainer.email}
                onChange={(e) => setNewTrainer({...newTrainer, email: e.target.value})}
                className="border rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 w-full"
                disabled={isAdding}
              />
              <input
                type="password"
                placeholder="كلمة المرور"
                value={newTrainer.password}
                onChange={(e) => setNewTrainer({...newTrainer, password: e.target.value})}
                className="border rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 w-full"
                required
                disabled={isAdding}
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={isAdding}
            >
              <UserPlus size={18} />
              {isAdding ? 'جاري الإضافة...' : 'إضافة مدرب'}
            </button>
          </form>
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
            
            <h3 className="text-lg font-semibold mb-4 items-center gap-2 hidden md:flex">
              <Filter size={20} />
              البحث والفلترة
            </h3>
            
            <div className="space-y-4">
              {/* البحث */}
              <div className="relative">
                <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="البحث بالاسم أو الهاتف أو الإيميل"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="w-full border rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* الفلاتر */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={filters.role}
                  onChange={(e) => setFilters({...filters, role: e.target.value})}
                  className="border rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 w-full"
                >
                  <option value="all">جميع الأدوار</option>
                  <option value="admin">المديرين</option>
                  <option value="trainer">المدربين</option>
                  <option value="student">الطلاب</option>
                </select>

                <select
                  value={filters.gender}
                  onChange={(e) => setFilters({...filters, gender: e.target.value})}
                  className="border rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 w-full"
                >
                  <option value="all">جميع الأجناس</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>

                <select
                  value={filters.ageGroup || 'all'}
                  onChange={(e) => setFilters({...filters, ageGroup: e.target.value})}
                  className="border rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 w-full"
                >
                  <option value="all">جميع الأعمار</option>
                  <option value="kids">أطفال (6-9)</option>
                  <option value="juniors">صغار (10-13)</option>
                  <option value="teens">مراهقين (14-17)</option>
                  <option value="adults">بالغين (18+)</option>
                </select>
              </div>

              {/* إعادة تعيين الفلاتر */}
              <button
                onClick={() => {
                  setFilters({
                    role: 'all',
                    gender: 'all',
                    ageGroup: 'all',
                    search: '',
                    sortBy: 'createdAt',
                    sortOrder: 'desc'
                  });
                  setShowFilters(false);
                }}
                className="w-full bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                مسح الفلاتر
              </button>
            </div>
          </div>
        </div>

        {/* Mobile: Tabs */}
        <div className="block md:hidden">
          <div className="bg-white rounded-xl shadow-sm border p-2">
            <div className="flex overflow-x-auto">
              {[
                { key: 'all', label: 'الكل', count: filteredAndSortedUsers.length },
                { key: 'admin', label: 'المديرين', count: groupedUsers.admin.length },
                { key: 'trainer', label: 'المدربين', count: groupedUsers.trainer.length },
                { key: 'student', label: 'الطلاب', count: groupedUsers.student.length }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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
        
        {/* Users Display */}
        <div className="space-y-6">
          {/* Desktop View */}
          <div className="hidden md:block">
            {renderDesktopUsersGroup(groupedUsers.admin, 'المديرين', 'bg-purple-100 text-purple-800')}
            {renderDesktopUsersGroup(groupedUsers.trainer, 'المدربين', 'bg-blue-100 text-blue-800')}
            {renderDesktopUsersGroup(groupedUsers.student, 'الطلاب', 'bg-green-100 text-green-800')}
          </div>

          {/* Mobile View */}
          <div className="block md:hidden">
            {activeTab === 'all' && (
              <>
                {renderMobileUsersGroup(groupedUsers.admin, 'المديرين', 'bg-purple-100 text-purple-800')}
                {renderMobileUsersGroup(groupedUsers.trainer, 'المدربين', 'bg-blue-100 text-blue-800')}
                {renderMobileUsersGroup(groupedUsers.student, 'الطلاب', 'bg-green-100 text-green-800')}
              </>
            )}
            {activeTab === 'admin' && renderMobileUsersGroup(groupedUsers.admin, 'المديرين', 'bg-purple-100 text-purple-800')}
            {activeTab === 'trainer' && renderMobileUsersGroup(groupedUsers.trainer, 'المدربين', 'bg-blue-100 text-blue-800')}
            {activeTab === 'student' && renderMobileUsersGroup(groupedUsers.student, 'الطلاب', 'bg-green-100 text-green-800')}
          </div>
          
          {filteredAndSortedUsers.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-8 md:p-12 text-center">
              <Users className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">لا يوجد مستخدمون متطابقون مع البحث</p>
            </div>
          )}
        </div>
        
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <div className="bg-purple-50 rounded-xl p-4 md:p-6 text-center">
            <Shield className="mx-auto text-purple-600 mb-2" size={24} />
            <p className="text-xl md:text-2xl font-bold text-purple-900">
              {users.filter(u => u.role === 'admin').length}
            </p>
            <p className="text-gray-600 text-xs md:text-sm">مدير</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 md:p-6 text-center">
            <Award className="mx-auto text-blue-600 mb-2" size={24} />
            <p className="text-xl md:text-2xl font-bold text-blue-900">
              {users.filter(u => u.role === 'trainer').length}
            </p>
            <p className="text-gray-600 text-xs md:text-sm">مدرب</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 md:p-6 text-center">
            <GraduationCap className="mx-auto text-green-600 mb-2" size={24} />
            <p className="text-xl md:text-2xl font-bold text-green-900">
              {users.filter(u => u.role === 'student').length}
            </p>
            <p className="text-gray-600 text-xs md:text-sm">طالب</p>
          </div>
          <div className="bg-pink-50 rounded-xl p-4 md:p-6 text-center">
            <span className="text-2xl mb-2 block">👩</span>
            <p className="text-xl md:text-2xl font-bold text-pink-900">
              {users.filter(u => u.gender === 'female').length}
            </p>
            <p className="text-gray-600 text-xs md:text-sm">إناث</p>
          </div>
          <div className="bg-cyan-50 rounded-xl p-4 md:p-6 text-center">
            <span className="text-2xl mb-2 block">👨</span>
            <p className="text-xl md:text-2xl font-bold text-cyan-900">
              {users.filter(u => u.gender === 'male').length}
            </p>
            <p className="text-gray-600 text-xs md:text-sm">ذكور</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersManagement;