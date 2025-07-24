// src/components/Student/StudentCurriculumPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Play, CheckCircle, Lock, Clock,
  Star, Award, Target, MessageCircle, Calendar,
  ChevronRight, ChevronDown, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useCollection } from '../../hooks/useFirestore';
import { where } from 'firebase/firestore';
import ChatWindow from '../Chat/ChatWindow';

const StudentCurriculumPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [chatWithAdmin, setChatWithAdmin] = useState(false);

  const { data: subscriptions } = useCollection('subscriptions', [
    where('studentId', '==', userProfile.id),
    where('curriculumId', '==', id),
    where('status', '==', 'active')
  ]);

  const { data: users } = useCollection('users');

  // --- جديد: جلب جلسات الحضور الخاصة بالطالب لهذا المنهج ---
  const { data: attendanceSessions } = useCollection(
  'curriculumAttendanceSessions', 
  id ? [where('curriculumId', '==', id)] : []
  );

  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const curriculumDoc = await getDoc(doc(db, 'curricula', id));
        if (curriculumDoc.exists()) {
          const curriculumData = { id: curriculumDoc.id, ...curriculumDoc.data() };
          setCurriculum(curriculumData);
        } else {
          navigate('/curricula');
        }
      } catch (error) {
        console.error('Error fetching curriculum:', error);
      }
      setLoading(false);
    };

    fetchCurriculum();
  }, [id, navigate]);

  const activeSubscription = subscriptions.find(sub =>
    sub.currentLevelAccessExpiresAt && new Date(sub.currentLevelAccessExpiresAt.toDate()) > new Date()
  );

  const calculateOverallProgress = () => {
    if (!activeSubscription || !curriculum?.levels) return 0;
  
    const totalLevels = curriculum.levels.length;
    const completedLevels = activeSubscription.progress?.completedLevels?.length || 0;
    const currentLevel = activeSubscription.currentLevel || 1;
  
    // حساب التقدم بناءً على المراحل المكتملة + تقدم المرحلة الحالية
    let overallProgress = (completedLevels / totalLevels) * 100;
  
    // إضافة تقدم المرحلة الحالية إذا لم تكن مكتملة بعد
    if (currentLevel <= totalLevels && !activeSubscription.progress?.completedLevels?.includes(currentLevel)) {
      const currentLevelProgress = calculateCurrentLevelProgress();
      const currentLevelWeight = (1 / totalLevels) * 100; // وزن المرحلة الحالية
      overallProgress += (currentLevelProgress / 100) * currentLevelWeight;
    }
  
    return Math.min(overallProgress, 100);
  };

  const calculateCurrentLevelProgress = () => {
      if (!activeSubscription || !curriculum?.levels || !attendanceSessions || !userProfile?.id) {
    return 0;
  }
  
    const currentLevelNumber = activeSubscription.currentLevel || 1;
  
    // التحقق من أن المرحلة مكتملة بالفعل
    if (activeSubscription.progress?.completedLevels?.includes(currentLevelNumber)) {
      return 100; // المرحلة مكتملة
    }
  
    const currentLevelData = curriculum.levels.find(l => l.order === currentLevelNumber);
    if (!currentLevelData || !currentLevelData.sessionsCount) return 0;
  
    const totalSessionsInLevel = parseInt(currentLevelData.sessionsCount);
    if (totalSessionsInLevel === 0) return 100;
  
    // فلترة الجلسات التي حضرها الطالب في المرحلة الحالية
const attendedSessionsCount = attendanceSessions.filter(session => {
  const studentAttendance = session.attendance?.find(att => att.studentId === userProfile.id);
  return session.curriculumId === id && // ← إضافة هذا السطر
         session.level === currentLevelNumber &&
         studentAttendance &&
         (studentAttendance.status === 'present' || studentAttendance.status === 'late');
}).length;
  
    const progress = (attendedSessionsCount / totalSessionsInLevel) * 100;
    return Math.min(progress, 100);
  };

  const canPromoteToNextLevel = () => {
    if (!activeSubscription || !curriculum?.levels) return false;
  
    const currentLevel = activeSubscription.currentLevel || 1;
    const totalLevels = curriculum.levels.length;
  
    // التحقق من وجود مرحلة تالية
    if (currentLevel >= totalLevels) return false;
  
    // التحقق من التقدم في المرحلة الحالية
    const currentLevelProgress = calculateCurrentLevelProgress();
    const minimumCompletionRate = curriculum.progressSettings?.minimumCompletionRate || 80;
  
    if (currentLevelProgress < minimumCompletionRate) return false;
  
    // التحقق من رصيد الأيام
    const nextLevelData = curriculum.levels.find(l => l.order === currentLevel + 1);
    const requiredDays = parseInt(nextLevelData?.durationDays) || 30;
  
    return (activeSubscription.accessCreditDays || 0) >= requiredDays;
  };

  const getRemainingDaysInCurrentLevel = () => {
    if (!activeSubscription?.currentLevelAccessExpiresAt) return null;
  
    const now = new Date();
    const expiry = new Date(activeSubscription.currentLevelAccessExpiresAt.toDate());
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
    return diffDays;
  };

  const canAccessLevel = (levelIndex) => {
    if (!activeSubscription) return false;
    
    const currentLevel = activeSubscription.currentLevel || 1;
    return levelIndex + 1 <= currentLevel;
  };

  const isLevelCompleted = (levelIndex) => {
    if (!activeSubscription) return false;
    
    const completedLevels = activeSubscription.progress?.completedLevels || [];
    return completedLevels.includes(levelIndex + 1);
  };

  const getAdmin = () => {
    return users.find(u => u.role === 'admin');
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  if (!curriculum) {
    return <div className="text-center py-8">المنهج غير موجود</div>;
  }

  if (!activeSubscription) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <Lock className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">انتهت صلاحية الوصول</h2>
          <p className="text-gray-600 mb-6">
            لقد انتهت المدة المخصصة لك في هذه المرحلة. يجب إكمال كل مرحلة خلال مدتها المحددة.
            <br/>
            يرجى التواصل مع الإدارة لإعادة تفعيل وصولك أو إضافة رصيد أيام.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate(`/my-curricula`)}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              العودة لمناهجي
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentLevelProgress = calculateCurrentLevelProgress();
  const overallProgress = calculateOverallProgress();
  const canPromote = canPromoteToNextLevel();
  const remainingDays = getRemainingDaysInCurrentLevel();
  const admin = getAdmin();

  if (chatWithAdmin && admin) {
    return (
      <div className="space-y-6">
        <ChatWindow 
          otherUser={admin} 
          onClose={() => setChatWithAdmin(false)} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/my-curricula')} className="text-purple-600 hover:text-purple-700 flex items-center gap-2">
          <ArrowLeft size={20} /> العودة لمناهجي
        </button>
        <div className="flex items-center gap-4">
{remainingDays !== null && remainingDays >= 0 && (
  <div className={`px-4 py-2 rounded-lg ${remainingDays <= 7 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
    <Calendar size={16} className="inline ml-2" />
    {remainingDays > 0 ? `${remainingDays} يوم متبقي للوصول لهذه المرحلة` : 'آخر يوم للوصول'}
  </div>
)}

        </div>
      </div>
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold mb-4">{curriculum.title}</h1>
            <p className="text-purple-100 mb-6">{curriculum.description}</p>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span>التقدم في المرحلة الحالية</span>
                <span className={`font-semibold ${canPromote ? 'text-green-600' : 'text-blue-600'}`}>
                  {currentLevelProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    canPromote ? 'bg-green-400' : 'bg-blue-400'
                  }`}
                  style={{ width: `${currentLevelProgress}%` }}
                ></div>
              </div>
              {canPromote && (
                <div className="flex items-center gap-1 mt-1 text-xs text-green-200">
                  <CheckCircle size={12} />
                  <span>جاهز للترقية للمرحلة التالية</span>
                </div>
              )}
              {!canPromote && currentLevelProgress < 80 && (
                <div className="flex items-center gap-1 mt-1 text-xs text-yellow-200">
                  <Clock size={12} />
                  <span>
                    يحتاج {(80 - currentLevelProgress).toFixed(1)}% إضافية للترقية
                  </span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span>التقدم الإجمالي في المنهج</span>
                <span>{overallProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div 
                  className="bg-white h-3 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-bold">{activeSubscription.currentLevel}</p>
                <p className="text-sm text-purple-100">المرحلة الحالية</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-bold">{activeSubscription.progress?.completedLevels?.length || 0}</p>
                <p className="text-sm text-purple-100">مراحل مكتملة</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-bold">{curriculum.levels?.length || 0}</p>
                <p className="text-sm text-purple-100">إجمالي المراحل</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            {curriculum.image && (
              <img src={curriculum.image} alt={curriculum.title} className="w-full h-32 object-cover rounded-lg mb-4" />
            )}
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-3">معلومات الاشتراك</h3>
              <div className="space-y-2 text-sm text-purple-100">
                <div className="flex justify-between">
                  <span>رصيد الأيام المتبقي:</span>
                  <span className="font-bold text-white">
                    {activeSubscription.accessCreditDays || 0} يوم
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>انتهاء المرحلة الحالية:</span>
                  <span className={`font-medium ${remainingDays <= 7 ? 'text-red-200' : 'text-white'}`}>
                    {remainingDays > 0 ? `${remainingDays} يوم` : 'انتهى اليوم'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>حالة الترقية:</span>
                  <span className={`font-medium ${canPromote ? 'text-green-200' : 'text-yellow-200'}`}>
                    {canPromote ? '✅ جاهز للمرحلة التالية' : '⏳ يحتاج مزيد من التقدم'}
                  </span>
                </div>
                <div className="text-xs text-purple-200 mt-2 pt-2 border-t border-white/20">
                  تاريخ انتهاء المرحلة: {new Date(activeSubscription.currentLevelAccessExpiresAt.toDate()).toLocaleDateString('ar-EG')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">المراحل التعليمية</h2>
            
            <div className="space-y-4">
              {curriculum.levels?.map((level, index) => {
                const canAccess = canAccessLevel(index);
                const isCompleted = isLevelCompleted(index);
                const isCurrent = activeSubscription.currentLevel === index + 1;
                
                // إضافة حساب التقدم لكل مرحلة
                let levelProgress = 0;
                if (isCompleted) {
                  levelProgress = 100;
                } else if (isCurrent) {
                  levelProgress = calculateCurrentLevelProgress();
                }

                const isReadyForPromotion = isCurrent && canPromoteToNextLevel();

                return (
                  <div 
                    key={index}
                    className={`border rounded-xl p-6 transition-all ${
                      isReadyForPromotion ? 'border-green-500 bg-green-50 shadow-lg' :
                      isCurrent ? 'border-purple-500 bg-purple-50' :
                      isCompleted ? 'border-green-500 bg-green-50' :
                      canAccess ? 'border-blue-500 bg-blue-50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                          isCompleted ? 'bg-green-600 text-white' :
                          isReadyForPromotion ? 'bg-green-600 text-white animate-pulse' :
                          isCurrent ? 'bg-purple-600 text-white' :
                          canAccess ? 'bg-blue-600 text-white' :
                          'bg-gray-400 text-white'
                        }`}>
                          {isCompleted ? <CheckCircle size={24} /> : 
                           isReadyForPromotion ? <Award size={24} /> : 
                           isCurrent ? <Play size={24} /> : 
                           <Lock size={24} />}
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-semibold">
                            المرحلة {index + 1}: {level.title}
                          </h3>
                          {level.durationDays && (
                            <p className="text-sm text-gray-600">
                              المدة المخصصة: {level.durationDays} يوم ({level.sessionsCount} جلسة)
                            </p>
                          )}
                          {isCurrent && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all ${
                                      levelProgress >= 80 ? 'bg-green-500' : 'bg-purple-500'
                                    }`}
                                    style={{ width: `${levelProgress}%` }}
                                  ></div>
                                </div>
                                <span className={`font-medium ${levelProgress >= 80 ? 'text-green-600' : 'text-purple-600'}`}>
                                  {levelProgress.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                            مكتملة
                          </span>
                        )}
                        {isReadyForPromotion && (
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold animate-pulse">
                            🎉 جاهز للترقية!
                          </span>
                        )}
                        {isCurrent && !isReadyForPromotion && (
                          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                            جاري التعلم
                          </span>
                        )}
                        
                        <button
                          onClick={() => setExpandedLevel(expandedLevel === index ? null : index)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {expandedLevel === index ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4">{level.description}</p>

                    {expandedLevel === index && (
                      <div className="space-y-4">
                        {level.topics?.filter(topic => topic.trim()).length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">الموضوعات:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {level.topics.filter(topic => topic.trim()).map((topic, topicIndex) => (
                                <div key={topicIndex} className="flex items-center gap-2 p-2 bg-white rounded border">
                                  <BookOpen size={16} className="text-gray-500" />
                                  <span className="text-sm">{topic}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-4 border-t">
                          {canAccess ? (
                            <>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertCircle className="text-blue-600" size={20} />
                                  <span className="font-semibold text-blue-800">ملاحظة مهمة</span>
                                </div>
                                <p className="text-blue-700 text-sm">
                                  هذا المنهج تحت التطوير. للحصول على المحتوى التعليمي والمساعدة، يرجى التواصل مع الإدارة.
                                </p>
                              </div>
                              
                              <button
                                onClick={() => setChatWithAdmin(true)}
                                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                              >
                                تواصل مع الإدارة
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-500">
                              <Lock size={16} />
                              <span>يتم فتح هذه المرحلة بعد إكمال المراحل السابقة</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="text-yellow-600" size={20} />
              إنجازاتك
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">البداية القوية</span>
                <CheckCircle className="text-green-600" size={16} />
              </div>
              
              {overallProgress >= 25 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">ربع الطريق</span>
                  <CheckCircle className="text-green-600" size={16} />
                </div>
              )}
              
              {overallProgress >= 50 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">منتصف الطريق</span>
                  <CheckCircle className="text-green-600" size={16} />
                </div>
              )}
              
              {overallProgress >= 75 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">تقدم ممتاز</span>
                  <CheckCircle className="text-green-600" size={16} />
                </div>
              )}
              
              {overallProgress >= 100 && (
                <div className="flex items-center justify-between p-3 bg-green-100 rounded-lg">
                  <span className="text-sm font-semibold text-green-800">إكمال المنهج</span>
                  <Star className="text-yellow-500" size={16} />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="text-blue-600" size={20} />
              الدعم والمساعدة
            </h3>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="text-blue-600" size={24} />
              </div>
              <h4 className="font-semibold">تواصل مع الإدارة</h4>
              <p className="text-sm text-gray-600 mb-4">
                للحصول على المحتوى والإرشادات
              </p>
              
              <button 
                onClick={() => setChatWithAdmin(true)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} />
                محادثاتي
              </button>
            </div>
          </div>

          {curriculum.learningOutcomes?.filter(outcome => outcome.trim()).length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="text-green-600" size={20} />
                أهداف التعلم
              </h3>
              
              <ul className="space-y-2">
                {curriculum.learningOutcomes.filter(outcome => outcome.trim()).map((outcome, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentCurriculumPage;