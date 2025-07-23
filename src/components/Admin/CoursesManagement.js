// src/components/Admin/CoursesManagement.js
import React, { useState } from 'react';
import { Plus, Edit, Trash2, DollarSign, Clock, BookOpen, Users, Code, Bot, X } from 'lucide-react';
import { useCollection } from '../../hooks/useFirestore';
import { where } from 'firebase/firestore';

const CoursesManagement = () => {
  const { data: courses, loading, add, update, remove } = useCollection('courses');
  const { data: trainers } = useCollection('users', [where('role', '==', 'trainer')]);
  
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    price: '',
    duration: '',
    sessionsCount: '', // عدد الحصص (اختياري)
    image: '',
    category: '', // سيتم إدخالها يدوياً
    ageRangeFrom: '', // من عمر
    ageRangeTo: '', // إلى عمر
    level: 'beginner',
    prerequisites: ''
  });
  const [editingCourse, setEditingCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [newCategory, setNewCategory] = useState(''); // للإضافة السريعة

  const levelLabels = {
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم'
  };

  // استخراج الفئات الموجودة
  const getExistingCategories = () => {
    const categories = new Set();
    courses.forEach(course => {
      if (course.category) {
        categories.add(course.category);
      }
    });
    return Array.from(categories);
  };

  // تصفية الكورسات
  const getFilteredCourses = () => {
    let filtered = courses;
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(course => course.category === categoryFilter);
    }
    
    return filtered;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const courseData = {
        title: editingCourse ? editingCourse.title : newCourse.title,
        description: editingCourse ? editingCourse.description : newCourse.description,
        price: parseInt(editingCourse ? editingCourse.price : newCourse.price),
        duration: editingCourse ? editingCourse.duration : newCourse.duration,
        sessionsCount: (editingCourse ? editingCourse.sessionsCount : newCourse.sessionsCount) ? 
          parseInt(editingCourse ? editingCourse.sessionsCount : newCourse.sessionsCount) : null,
        image: editingCourse ? editingCourse.image : newCourse.image,
        category: editingCourse ? editingCourse.category : newCourse.category,
        ageRangeFrom: parseInt(editingCourse ? editingCourse.ageRangeFrom : newCourse.ageRangeFrom),
        ageRangeTo: parseInt(editingCourse ? editingCourse.ageRangeTo : newCourse.ageRangeTo),
        level: editingCourse ? editingCourse.level : newCourse.level,
        prerequisites: editingCourse ? editingCourse.prerequisites : newCourse.prerequisites,
        trainerId: editingCourse ? editingCourse.trainerId : null
      };

      // التحقق من صحة البيانات
      if (!courseData.category.trim()) {
        alert('يرجى إدخال فئة الكورس');
        setIsLoading(false);
        return;
      }

      if (courseData.ageRangeFrom >= courseData.ageRangeTo) {
        alert('العمر "من" يجب أن يكون أقل من العمر "إلى"');
        setIsLoading(false);
        return;
      }
      
      if (editingCourse) {
        await update(editingCourse.id, courseData);
        setEditingCourse(null);
        alert('تم تحديث الكورس بنجاح');
      } else {
        await add(courseData);
        alert('تم إضافة الكورس بنجاح');
      }
      
      setNewCourse({ 
        title: '', 
        description: '', 
        price: '', 
        duration: '', 
        sessionsCount: '',
        image: '',
        category: '',
        ageRangeFrom: '',
        ageRangeTo: '',
        level: 'beginner',
        prerequisites: ''
      });
    } catch (error) {
      console.error('Error saving course:', error);
      alert('حدث خطأ في حفظ الكورس');
    }
    
    setIsLoading(false);
  };

  const handleEdit = (course) => {
    setEditingCourse({
      ...course,
      price: course.price.toString(),
      sessionsCount: course.sessionsCount?.toString() || '',
      ageRangeFrom: course.ageRangeFrom?.toString() || '',
      ageRangeTo: course.ageRangeTo?.toString() || '',
      category: course.category || '',
      level: course.level || 'beginner',
      prerequisites: course.prerequisites || ''
    });
    setNewCourse({
      title: course.title,
      description: course.description,
      price: course.price.toString(),
      duration: course.duration,
      sessionsCount: course.sessionsCount?.toString() || '',
      image: course.image || '',
      category: course.category || '',
      ageRangeFrom: course.ageRangeFrom?.toString() || '',
      ageRangeTo: course.ageRangeTo?.toString() || '',
      level: course.level || 'beginner',
      prerequisites: course.prerequisites || ''
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الكورس؟')) {
      try {
        await remove(id);
        alert('تم حذف الكورس بنجاح');
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('حدث خطأ في حذف الكورس');
      }
    }
  };

  const handleAssignTrainer = async (courseId, trainerId) => {
    try {
      await update(courseId, { trainerId: trainerId || null });
      alert('تم تحديد المدرب بنجاح');
    } catch (error) {
      console.error('Error assigning trainer:', error);
      alert('حدث خطأ في تحديد المدرب');
    }
  };

  // إضافة فئة جديدة بسرعة
  const addQuickCategory = () => {
    if (newCategory.trim()) {
      if (editingCourse) {
        setEditingCourse({...editingCourse, category: newCategory.trim()});
      } else {
        setNewCourse({...newCourse, category: newCategory.trim()});
      }
      setNewCategory('');
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  const filteredCourses = getFilteredCourses();
  const existingCategories = getExistingCategories();

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">إدارة الكورسات</h2>
      
      {/* فلاتر البحث */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block font-medium mb-2">الفئة:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
            >
              <option value="all">جميع الفئات</option>
              {existingCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div className="ml-auto">
            <div className="bg-gray-100 px-4 py-8 rounded-lg">
              <span className="font-semibold">{filteredCourses.length}</span> كورس
            </div>
          </div>
        </div>
      </div>
      
      {/* Add/Edit Course Form */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">
          {editingCourse ? 'تعديل الكورس' : 'إضافة كورس جديد'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* المعلومات الأساسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="عنوان الكورس"
              value={editingCourse ? editingCourse.title : newCourse.title}
              onChange={(e) => {
                if (editingCourse) {
                  setEditingCourse({...editingCourse, title: e.target.value});
                } else {
                  setNewCourse({...newCourse, title: e.target.value});
                }
              }}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              required
              disabled={isLoading}
            />
            <input
              type="number"
              placeholder="السعر"
              value={editingCourse ? editingCourse.price : newCourse.price}
              onChange={(e) => {
                if (editingCourse) {
                  setEditingCourse({...editingCourse, price: e.target.value});
                } else {
                  setNewCourse({...newCourse, price: e.target.value});
                }
              }}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="المدة (مثال: 3 أشهر)"
              value={editingCourse ? editingCourse.duration : newCourse.duration}
              onChange={(e) => {
                if (editingCourse) {
                  setEditingCourse({...editingCourse, duration: e.target.value});
                } else {
                  setNewCourse({...newCourse, duration: e.target.value});
                }
              }}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              required
              disabled={isLoading}
            />
            
            <input
              type="number"
              placeholder="عدد الحصص (اختياري)"
              value={editingCourse ? editingCourse.sessionsCount : newCourse.sessionsCount}
              onChange={(e) => {
                if (editingCourse) {
                  setEditingCourse({...editingCourse, sessionsCount: e.target.value});
                } else {
                  setNewCourse({...newCourse, sessionsCount: e.target.value});
                }
              }}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              min="1"
              disabled={isLoading}
            />
            
            {/* المستوى */}
            <select
              value={editingCourse ? editingCourse.level : newCourse.level}
              onChange={(e) => {
                if (editingCourse) {
                  setEditingCourse({...editingCourse, level: e.target.value});
                } else {
                  setNewCourse({...newCourse, level: e.target.value});
                }
              }}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              required
              disabled={isLoading}
            >
              <option value="beginner">مبتدئ</option>
              <option value="intermediate">متوسط</option>
              <option value="advanced">متقدم</option>
            </select>
          </div>

          {/* فئة الكورس */}
          <div>
            <label className="block font-medium mb-3">فئة الكورس:</label>
            <div className="space-y-3">
              {/* اختيار من الموجود */}
              {existingCategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">اختر من الفئات الموجودة:</label>
                  <select
                    value={editingCourse ? editingCourse.category : newCourse.category}
                    onChange={(e) => {
                      if (editingCourse) {
                        setEditingCourse({...editingCourse, category: e.target.value});
                      } else {
                        setNewCourse({...newCourse, category: e.target.value});
                      }
                    }}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    disabled={isLoading}
                  >
                    <option value="">-- اختر فئة موجودة --</option>
                    {existingCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* إضافة فئة جديدة */}
              <div>
                <label className="block text-sm font-medium mb-2">أو أضف فئة جديدة:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="اكتب فئة جديدة (مثال: البرمجة، التصميم، التسويق)"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={addQuickCategory}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={!newCategory.trim() || isLoading}
                  >
                    إضافة
                  </button>
                </div>
              </div>
              
              {/* إدخال مباشر */}
              <div>
                <label className="block text-sm font-medium mb-2">أو اكتب الفئة مباشرة:</label>
                <input
                  type="text"
                  placeholder="فئة الكورس"
                  value={editingCourse ? editingCourse.category : newCourse.category}
                  onChange={(e) => {
                    if (editingCourse) {
                      setEditingCourse({...editingCourse, category: e.target.value});
                    } else {
                      setNewCourse({...newCourse, category: e.target.value});
                    }
                  }}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* الفئة العمرية */}
          <div>
            <label className="block font-medium mb-3">الفئة العمرية المستهدفة:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">من عمر:</label>
                <input
                  type="number"
                  placeholder="6"
                  value={editingCourse ? editingCourse.ageRangeFrom : newCourse.ageRangeFrom}
                  onChange={(e) => {
                    if (editingCourse) {
                      setEditingCourse({...editingCourse, ageRangeFrom: e.target.value});
                    } else {
                      setNewCourse({...newCourse, ageRangeFrom: e.target.value});
                    }
                  }}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  min="3"
                  max="100"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">إلى عمر:</label>
                <input
                  type="number"
                  placeholder="99"
                  value={editingCourse ? editingCourse.ageRangeTo : newCourse.ageRangeTo}
                  onChange={(e) => {
                    if (editingCourse) {
                      setEditingCourse({...editingCourse, ageRangeTo: e.target.value});
                    } else {
                      setNewCourse({...newCourse, ageRangeTo: e.target.value});
                    }
                  }}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  min="4"
                  max="100"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              مثال: من عمر 6 إلى عمر 12 للأطفال، أو من عمر 18 إلى عمر 99 للبالغين
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <textarea
              placeholder="وصف الكورس"
              value={editingCourse ? editingCourse.description : newCourse.description}
              onChange={(e) => {
                if (editingCourse) {
                  setEditingCourse({...editingCourse, description: e.target.value});
                } else {
                  setNewCourse({...newCourse, description: e.target.value});
                }
              }}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              rows="3"
              required
              disabled={isLoading}
            />
            
            <textarea
              placeholder="المتطلبات المسبقة (اختياري)"
              value={editingCourse ? editingCourse.prerequisites : newCourse.prerequisites}
              onChange={(e) => {
                if (editingCourse) {
                  setEditingCourse({...editingCourse, prerequisites: e.target.value});
                } else {
                  setNewCourse({...newCourse, prerequisites: e.target.value});
                }
              }}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              rows="2"
              disabled={isLoading}
            />
            
            <input
              type="url"
              placeholder="رابط الصورة"
              value={editingCourse ? editingCourse.image : newCourse.image}
              onChange={(e) => {
                if (editingCourse) {
                  setEditingCourse({...editingCourse, image: e.target.value});
                } else {
                  setNewCourse({...newCourse, image: e.target.value});
                }
              }}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? 'جاري...' : editingCourse ? 'تحديث' : <><Plus size={18} /> إضافة</>}
            </button>
            {editingCourse && (
              <button
                type="button"
                onClick={() => {
                  setEditingCourse(null);
                  setNewCourse({ 
                    title: '', 
                    description: '', 
                    price: '', 
                    duration: '', 
                    sessionsCount: '',
                    image: '',
                    category: '',
                    ageRangeFrom: '',
                    ageRangeTo: '',
                    level: 'beginner',
                    prerequisites: ''
                  });
                }}
                className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition-colors"
                disabled={isLoading}
              >
                إلغاء
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map(course => (
          <div key={course.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            {course.image && (
              <img src={course.image} alt={course.title} className="w-full h-48 object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="text-blue-600" size={20} />
                <span className="text-sm font-medium text-gray-600">
                  {course.category}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  course.level === 'beginner' ? 'bg-green-100 text-green-800' :
                  course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {levelLabels[course.level]}
                </span>
              </div>
              
              <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
              <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
              
              {/* الفئة العمرية */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">الفئة العمرية:</p>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                  من {course.ageRangeFrom} إلى {course.ageRangeTo} سنة
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-500 mb-4">
                <p className="flex items-center gap-2">
                  <DollarSign size={16} />
                  {course.price} جنيه
                </p>
                <p className="flex items-center gap-2">
                  <Clock size={16} />
                  {course.duration}
                </p>
                {course.sessionsCount && (
                  <p className="flex items-center gap-2">
                    <BookOpen size={16} />
                    {course.sessionsCount} حصة
                  </p>
                )}
              </div>
              
              {/* المتطلبات المسبقة */}
              {course.prerequisites && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-1">المتطلبات المسبقة:</p>
                  <p className="text-xs text-gray-600">{course.prerequisites}</p>
                </div>
              )}
              
              {/* Assign Trainer */}
              <div className="mb-4">
                <select
                  value={course.trainerId || ''}
                  onChange={(e) => handleAssignTrainer(course.id, e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  disabled={isLoading}
                >
                  <option value="">اختر مدرب</option>
                  {trainers.map(trainer => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.firstName} {trainer.lastName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(course)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  disabled={isLoading}
                >
                  <Edit size={16} />
                  تعديل
                </button>
                <button
                  onClick={() => handleDelete(course.id)}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  disabled={isLoading}
                >
                  <Trash2 size={16} />
                  حذف
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredCourses.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">
            {courses.length === 0 ? 'لا توجد كورسات حتى الآن' : 'لا توجد كورسات تطابق المعايير المحددة'}
          </p>
          {courses.length === 0 && (
            <p className="text-gray-500 text-sm mt-2">ابدأ بإضافة أول كورس</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CoursesManagement;