// src/components/Admin/CurriculumProgressManagement.js
import React, { useState } from 'react';
import { 
  TrendingUp, Users, Target, Award, 
  XCircle, Clock, AlertCircle,
  BarChart3, Eye, RefreshCw, Search
} from 'lucide-react';
import { useCollection } from '../../hooks/useFirestore';

const CurriculumProgressManagement = () => {
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // overview, groups, students, analytics
  const [filterMode, setFilterMode] = useState('all'); // all, excellent, good, warning, critical
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: curricula } = useCollection('curricula');
  const { data: subscriptions, update: updateSubscription } = useCollection('subscriptions');
  const { data: curriculumGroups, update: updateGroup } = useCollection('curriculumGroups');
  const { data: users } = useCollection('users');
  const { data: attendanceSessions } = useCollection('curriculumAttendanceSessions', []);
  
  const students = users.filter(u => u.role === 'student');

  const calculateStudentCurrentLevelProgress = (studentId, curriculumId, currentLevel) => {
      if (!studentId || !curriculumId || !currentLevel || !attendanceSessions) {
    return 0;
  }
  
  const curriculum = curricula.find(c => c.id === curriculumId);
  if (!curriculum?.levels) return 0;
    const currentLevelData = curriculum.levels.find(l => l.order === currentLevel);
    if (!currentLevelData || !currentLevelData.sessionsCount) return 0;
    const totalSessionsInLevel = parseInt(currentLevelData.sessionsCount);
    // فلترة الجلسات التي حضرها الطالب في المرحلة الحالية
    const attendedSessionsCount = attendanceSessions.filter(session => {

        const studentAttendance = session.attendance?.find(att => att.studentId === studentId);
  return session.curriculumId === curriculumId && // إضافة هذا الشرط المهم
         session.level === currentLevel &&
         studentAttendance &&
         (studentAttendance.status === 'present' || studentAttendance.status === 'late');
}).length;

    if (totalSessionsInLevel === 0) return 100;
    const progress = (attendedSessionsCount / totalSessionsInLevel) * 100;
    return Math.min(progress, 100);
  };

  const getCurriculumProgressStats = (curriculumId) => {
    const curriculum = curricula.find(c => c.id === curriculumId);
    if (!curriculum) return null;

    const curriculumSubscriptions = subscriptions.filter(sub => 
      sub.curriculumId === curriculumId && sub.status === 'active'
    );

    const groups = curriculumGroups.filter(g => g.curriculumId === curriculumId);
    const totalLevels = curriculum.levels?.length || 0;

    const studentStats = curriculumSubscriptions.map(subscription => {
      const student = students.find(s => s.id === subscription.studentId);
      if (!student) return null;

      const currentLevel = subscription.currentLevel || 1;
      const completedLevels = subscription.progress?.completedLevels?.length || 0;
      const progressPercentage = totalLevels > 0 ? (completedLevels / totalLevels) * 100 : 0;
      
      let status = 'good';
      if (progressPercentage >= 80) status = 'excellent';
      else if (progressPercentage >= 60) status = 'good';
      else if (progressPercentage >= 30) status = 'warning';
      else status = 'critical';

      const lastUpdate = subscription.progress?.lastUpdate || subscription.activatedAt;
      const daysSinceUpdate = lastUpdate ? 
        Math.floor((new Date() - new Date(lastUpdate.toDate())) / (1000 * 60 * 60 * 24)) : 0;

      const isExpiringSoon = subscription.currentLevelAccessExpiresAt && 
          (new Date(subscription.currentLevelAccessExpiresAt.toDate()) - new Date()) < (7 * 24 * 60 * 60 * 1000);
      
      const daysLeft = subscription.currentLevelAccessExpiresAt ? 
          Math.ceil((new Date(subscription.currentLevelAccessExpiresAt.toDate()) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

      return {
        student,
        subscription,
        currentLevel,
        completedLevels,
        progressPercentage,
        status,
        daysSinceUpdate,
        isExpiringSoon,
        daysLeft
      };
    }).filter(Boolean);

    const totalStudents = studentStats.length;
    const excellentStudents = studentStats.filter(s => s.status === 'excellent').length;
    const goodStudents = studentStats.filter(s => s.status === 'good').length;
    const warningStudents = studentStats.filter(s => s.status === 'warning').length;
    const criticalStudents = studentStats.filter(s => s.status === 'critical').length;
    const avgProgress = totalStudents > 0 ? 
      studentStats.reduce((sum, s) => sum + s.progressPercentage, 0) / totalStudents : 0;

    return {
      curriculum,
      totalStudents,
      totalGroups: groups.length,
      activeGroups: groups.filter(g => g.status === 'active').length,
      totalLevels,
      avgProgress,
      excellentStudents,
      goodStudents,
      warningStudents,
      criticalStudents,
      studentStats: studentStats.sort((a, b) => b.progressPercentage - a.progressPercentage),
      expiringSoon: studentStats.filter(s => s.isExpiringSoon).length
    };
  };

  const getGroupProgressStats = (groupId) => {
    const group = curriculumGroups.find(g => g.id === groupId);
    if (!group) return null;

    const curriculum = curricula.find(c => c.id === group.curriculumId);
    const totalLevels = curriculum?.levels?.length || 0;

    const groupStudents = group.students?.map(studentId => {
      const student = students.find(s => s.id === studentId);
      const subscription = subscriptions.find(sub => 
        sub.studentId === studentId && 
        sub.curriculumId === group.curriculumId &&
        sub.status === 'active'
      );

      if (!student || !subscription) return null;

      const currentLevel = subscription.currentLevel || 1;
      const completedLevels = subscription.progress?.completedLevels?.length || 0;
      const progressPercentage = totalLevels > 0 ? (completedLevels / totalLevels) * 100 : 0;

      return {
        student,
        subscription,
        currentLevel,
        completedLevels,
        progressPercentage
      };
    }).filter(Boolean) || [];

    const avgProgress = groupStudents.length > 0 ? 
      groupStudents.reduce((sum, s) => sum + s.progressPercentage, 0) / groupStudents.length : 0;

    return {
      group,
      curriculum,
      totalStudents: groupStudents.length,
      avgProgress,
      groupStudents: groupStudents.sort((a, b) => b.progressPercentage - a.progressPercentage),
      currentGroupLevel: group.progress?.currentLevel || 1,
      groupCompletedLevels: group.progress?.completedLevels?.length || 0
    };
  };

  const promoteStudent = async (studentId, curriculumId) => {
    try {
      const subscription = subscriptions.find(sub => 
        sub.studentId === studentId && 
        sub.curriculumId === curriculumId &&
        sub.status === 'active'
      );
  
      if (!subscription) {
        alert('لم يتم العثور على اشتراك نشط للطالب');
        return;
      }
  
      const curriculum = curricula.find(c => c.id === curriculumId);
      if (!curriculum || !curriculum.levels) {
        alert('لم يتم العثور على المنهج');
        return;
      }
      
      const currentLevel = subscription.currentLevel || 1;
      const totalLevels = curriculum.levels.length;
  
      if (currentLevel >= totalLevels) {
        alert('الطالب وصل للمرحلة الأخيرة');
        return;
      }
  
      // ===== الجديد: التحقق من اكتمال المرحلة الحالية =====
      const currentLevelProgress = calculateStudentCurrentLevelProgress(studentId, curriculumId, currentLevel);
      const minimumCompletionRate = curriculum.progressSettings?.minimumCompletionRate || 80;
  
      if (currentLevelProgress < minimumCompletionRate) {
        alert(`لا يمكن ترقية الطالب. يجب إكمال ${minimumCompletionRate}% على الأقل من المرحلة الحالية. التقدم الحالي: ${currentLevelProgress.toFixed(1)}%`);
        return;
      }
  
      // التحقق من الرصيد
      const newLevel = currentLevel + 1;
      const nextLevelData = curriculum.levels.find(l => l.order === newLevel);
      const levelDuration = parseInt(nextLevelData?.durationDays) || 30;
  
      if (subscription.accessCreditDays < levelDuration) {
        alert(`لا يمكن ترقية الطالب. الرصيد المتبقي (${subscription.accessCreditDays} يوم) غير كافٍ لتغطية المرحلة التالية (${levelDuration} يوم).`);
        return;
      }
      
      const newCredit = subscription.accessCreditDays - levelDuration;
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + levelDuration);
  
      const completedLevels = subscription.progress?.completedLevels || [];
      if (!completedLevels.includes(currentLevel)) {
        completedLevels.push(currentLevel);
      }
  
      // ===== الجديد: تسجيل تفاصيل الترقية =====
      const promotionDetails = {
        promotedAt: new Date(),
        promotedBy: 'admin',
        fromLevel: currentLevel,
        toLevel: newLevel,
        progressAtPromotion: currentLevelProgress,
        creditsDeducted: levelDuration,
        remainingCredits: newCredit
      };
  
      await updateSubscription(subscription.id, {
        currentLevel: newLevel,
        accessCreditDays: newCredit,
        currentLevelAccessExpiresAt: newExpiryDate,
        progress: {
          ...subscription.progress,
          completedLevels,
          lastUpdate: new Date(),
          lastPromotion: promotionDetails
        }
      });
  
      alert(`تم ترقية الطالب للمرحلة ${newLevel} بنجاح! \nالتقدم في المرحلة السابقة: ${currentLevelProgress.toFixed(1)}% \nالرصيد المتبقي: ${newCredit} يوم`);
  
    } catch (error) {
      console.error('Error promoting student:', error);
      alert('حدث خطأ في ترقية الطالب: ' + error.message);
    }
  };

  const demoteStudent = async (studentId, curriculumId) => {
    try {
      const subscription = subscriptions.find(sub => 
        sub.studentId === studentId && 
        sub.curriculumId === curriculumId &&
        sub.status === 'active'
      );

      if (!subscription) {
        alert('لم يتم العثور على اشتراك نشط للطالب');
        return;
      }

      const currentLevel = subscription.currentLevel || 1;

      if (currentLevel <= 1) {
        alert('الطالب في المرحلة الأولى');
        return;
      }

      const newLevel = currentLevel - 1;
      const completedLevels = (subscription.progress?.completedLevels || [])
        .filter(level => level < newLevel); // الرجوع خطوة للخلف

      await updateSubscription(subscription.id, {
        currentLevel: newLevel,
        progress: {
          ...subscription.progress,
          completedLevels,
          lastUpdate: new Date(),
          demotedBy: 'admin'
        }
      });

      alert(`تم تراجع الطالب للمرحلة ${newLevel} بنجاح!`);
    } catch (error) {
      console.error('Error demoting student:', error);
      alert('حدث خطأ في تراجع الطالب');
    }
  };
  
  // --- دالة ترقية المجموعة (مُعاد هيكلتها بالكامل) ---
  const promoteGroup = async (groupId) => {
    try {
      const group = curriculumGroups.find(g => g.id === groupId);
      if (!group) return;
  
      const curriculum = curricula.find(c => c.id === group.curriculumId);
      const totalLevels = curriculum?.levels?.length || 0;
      const currentLevel = group.progress?.currentLevel || 1;
  
      if (currentLevel >= totalLevels) {
        alert('المجموعة وصلت للمرحلة الأخيرة');
        return;
      }
  
      const newLevel = currentLevel + 1;
      const nextLevelData = curriculum.levels.find(l => l.order === newLevel);
      const levelDuration = parseInt(nextLevelData?.durationDays) || 30;
  
      // ===== الجديد: التحقق من جاهزية جميع الطلاب =====
      const groupStudents = group.students || [];
      const studentsReadiness = [];
  
      for (const studentId of groupStudents) {
        const subscription = subscriptions.find(sub => sub.studentId === studentId && sub.curriculumId === group.curriculumId && sub.status === 'active');
        if (!subscription) {
          const student = users.find(u => u.id === studentId);
          studentsReadiness.push({
            studentId,
            name: student ? `${student.firstName} ${student.lastName}` : `ID: ${studentId}`,
            ready: false,
            reason: 'لا يوجد اشتراك نشط'
          });
          continue;
        }
  
        const currentLevelProgress = calculateStudentCurrentLevelProgress(studentId, group.curriculumId, currentLevel);
        const minimumCompletionRate = curriculum.progressSettings?.minimumCompletionRate || 80;
        const hasEnoughCredit = subscription.accessCreditDays >= levelDuration;
  
        const student = users.find(u => u.id === studentId);
        studentsReadiness.push({
          studentId,
          name: student ? `${student.firstName} ${student.lastName}` : `ID: ${studentId}`,
          ready: currentLevelProgress >= minimumCompletionRate && hasEnoughCredit,
          progress: currentLevelProgress,
          credit: subscription.accessCreditDays,
          reason: !hasEnoughCredit ? `رصيد غير كافٍ (${subscription.accessCreditDays} يوم)` :
                  currentLevelProgress < minimumCompletionRate ? `تقدم غير كافٍ (${currentLevelProgress.toFixed(1)}%)` : 'جاهز'
        });
      }
  
      const readyStudents = studentsReadiness.filter(s => s.ready);
      const notReadyStudents = studentsReadiness.filter(s => !s.ready);
  
      // إذا كان هناك طلاب غير جاهزين، اعرض الخيارات
      if (notReadyStudents.length > 0) {
        const notReadyList = notReadyStudents.map(s => `${s.name}: ${s.reason}`).join('\n');
        const readyList = readyStudents.map(s => s.name).join('\n');
  
        const message = `الطلاب غير الجاهزين للترقية (${notReadyStudents.length}):\n${notReadyList}\n\nالطلاب الجاهزين (${readyStudents.length}):\n${readyList}\n\nهل تريد ترقية الطلاب الجاهزين فقط؟`;
  
        if (!window.confirm(message)) {
          return;
        }
  
        // ترقية الطلاب الجاهزين فقط
        for (const readyStudent of readyStudents) {
          await promoteStudent(readyStudent.studentId, group.curriculumId);
        }
  
        alert(`تم ترقية ${readyStudents.length} طالب من أصل ${groupStudents.length}. \n${notReadyStudents.length} طالب لم يتم ترقيتهم لعدم استيفاء الشروط.`);
        return;
      }
  
      // إذا كان جميع الطلاب جاهزين، قم بترقيتهم جميعاً
      for (const studentId of groupStudents) {
        await promoteStudent(studentId, group.curriculumId);
      }
  
      // وأخيراً، قم بتحديث بيانات المجموعة نفسها
      const completedLevels = group.progress?.completedLevels || [];
      if (!completedLevels.includes(currentLevel)) {
        completedLevels.push(currentLevel);
      }
  
      await updateGroup(groupId, {
        progress: {
          ...group.progress,
          currentLevel: newLevel,
          completedLevels,
          lastUpdate: new Date(),
          promotedBy: 'admin'
        }
      });
  
      alert(`تم ترقية المجموعة وجميع طلابها للمرحلة ${newLevel} بنجاح!`);
    } catch (error) {
      console.error('Error promoting group:', error);
      alert('حدث خطأ أثناء ترقية المجموعة');
    }
  };

  const resetStudentProgress = async (studentId, curriculumId) => {
    if (!window.confirm('هل أنت متأكد من إعادة تعيين تقدم الطالب؟ سيتم العودة للمرحلة الأولى.')) {
      return;
    }

    try {
      const subscription = subscriptions.find(sub => 
        sub.studentId === studentId && 
        sub.curriculumId === curriculumId &&
        sub.status === 'active'
      );

      if (!subscription) return;

      await updateSubscription(subscription.id, {
        currentLevel: 1,
        progress: {
          completedLevels: [],
          lastUpdate: new Date(),
          resetBy: 'admin',
          resetAt: new Date()
        }
      });

      alert('تم إعادة تعيين تقدم الطالب بنجاح!');
    } catch (error) {
      console.error('Error resetting progress:', error);
      alert('حدث خطأ في إعادة تعيين التقدم');
    }
  };

  const getFilteredStudents = (studentStats) => {
    let filtered = studentStats.map(studentStat => {
        // إضافة حساب التقدم في المرحلة الحالية
        const currentLevelProgress = calculateStudentCurrentLevelProgress(
            studentStat.student.id,
            selectedCurriculum.id,
            studentStat.currentLevel
        );
        return {
            ...studentStat,
            currentLevelProgress,
            canPromote: currentLevelProgress >= (selectedCurriculum.progressSettings?.minimumCompletionRate || 80)
        };
    });
    if (filterMode !== 'all') {
        filtered = filtered.filter(s => s.status === filterMode);
    }
    if (searchTerm) {
        filtered = filtered.filter(s =>
            s.student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.student.phone.includes(searchTerm)
        );
    }
    return filtered;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-300';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'excellent': return 'ممتاز';
      case 'good': return 'جيد';
      case 'warning': return 'يحتاج متابعة';
      case 'critical': return 'يحتاج تدخل';
      default: return 'غير محدد';
    }
  };
  
  // (بقية الكود الخاص بعرض الواجهة لم يتغير وسيتم إضافته كاملاً هنا)
  
  const OverviewTab = () => {
    if (!selectedCurriculum) return null;
    
    const stats = getCurriculumProgressStats(selectedCurriculum.id);
    if (!stats) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <Users className="mx-auto text-blue-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-blue-900">{stats.totalStudents}</p>
            <p className="text-gray-600 text-sm">إجمالي الطلاب</p>
          </div>
          
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <TrendingUp className="mx-auto text-green-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-green-900">{stats.avgProgress.toFixed(1)}%</p>
            <p className="text-gray-600 text-sm">متوسط التقدم</p>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <Award className="mx-auto text-purple-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-purple-900">{stats.excellentStudents}</p>
            <p className="text-gray-600 text-sm">طلاب ممتازين</p>
          </div>
          
          <div className="bg-yellow-50 rounded-xl p-4 text-center">
            <AlertCircle className="mx-auto text-yellow-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-yellow-900">{stats.warningStudents}</p>
            <p className="text-gray-600 text-sm">يحتاجون متابعة</p>
          </div>
          
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <XCircle className="mx-auto text-red-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-red-900">{stats.criticalStudents}</p>
            <p className="text-gray-600 text-sm">يحتاجون تدخل</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">توزيع التقدم</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-green-600 font-bold text-lg">{stats.excellentStudents}</span>
              </div>
              <p className="font-semibold text-green-800">ممتاز (80%+)</p>
              <p className="text-sm text-gray-600">تقدم ممتاز</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold text-lg">{stats.goodStudents}</span>
              </div>
              <p className="font-semibold text-blue-800">جيد (60-79%)</p>
              <p className="text-sm text-gray-600">تقدم جيد</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-yellow-600 font-bold text-lg">{stats.warningStudents}</span>
              </div>
              <p className="font-semibold text-yellow-800">متابعة (30-59%)</p>
              <p className="text-sm text-gray-600">يحتاج متابعة</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-red-600 font-bold text-lg">{stats.criticalStudents}</span>
              </div>
              <p className="font-semibold text-red-800">حرج (أقل من 30%)</p>
              <p className="text-sm text-gray-600">يحتاج تدخل</p>
            </div>
          </div>
        </div>

        {(stats.expiringSoon > 0 || stats.criticalStudents > 0) && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-red-600">تنبيهات مهمة</h3>
            
            <div className="space-y-3">
              {stats.expiringSoon > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="text-orange-600" size={20} />
                    <span className="font-semibold text-orange-800">
                      {stats.expiringSoon} طالب سينتهي وصولهم للمرحلة الحالية خلال أسبوع
                    </span>
                  </div>
                  <p className="text-orange-700 text-sm mt-1">
                    يُنصح بالتواصل معهم لإضافة رصيد أيام
                  </p>
                </div>
              )}
              
              {stats.criticalStudents > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-red-600" size={20} />
                    <span className="font-semibold text-red-800">
                      {stats.criticalStudents} طالب تقدمهم ضعيف جداً
                    </span>
                  </div>
                  <p className="text-red-700 text-sm mt-1">
                    يحتاجون لتدخل ومتابعة مكثفة
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">أفضل 5 طلاب</h3>
          
          <div className="space-y-3">
            {stats.studentStats.slice(0, 5).map((studentStat, index) => (
              <div key={studentStat.student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {studentStat.student.firstName} {studentStat.student.lastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      المرحلة {studentStat.currentLevel} من {stats.totalLevels}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    {studentStat.progressPercentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {studentStat.completedLevels} مرحلة مكتملة
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const StudentsTab = () => {
    if (!selectedCurriculum) return null;
    
    const stats = getCurriculumProgressStats(selectedCurriculum.id);
    if (!stats) return null;

    const filteredStudents = getFilteredStudents(stats.studentStats);

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute right-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="ابحث عن طالب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border rounded-lg pr-12 pl-4 py-2 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
            >
              <option value="all">جميع الطلاب</option>
              <option value="excellent">ممتاز (80%+)</option>
              <option value="good">جيد (60-79%)</option>
              <option value="warning">يحتاج متابعة (30-59%)</option>
              <option value="critical">يحتاج تدخل (أقل من 30%)</option>
            </select>

            <div className="text-sm text-gray-600">
              عرض {filteredStudents.length} من {stats.totalStudents} طالب
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الطالب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المرحلة الحالية</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التقدم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">انتهاء الوصول</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map(studentStat => (
                  <tr key={studentStat.student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-purple-600">
                            {studentStat.student.firstName.charAt(0)}{studentStat.student.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {studentStat.student.firstName} {studentStat.student.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{studentStat.student.phone}</p>
                          <p className="text-xs text-blue-600 font-semibold">
                             رصيد: {studentStat.subscription.accessCreditDays || 0} يوم
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-center">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {studentStat.currentLevel} / {stats.totalLevels}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {studentStat.completedLevels} مكتملة
                        </p>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="w-full">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{studentStat.progressPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              studentStat.status === 'excellent' ? 'bg-green-500' :
                              studentStat.status === 'good' ? 'bg-blue-500' :
                              studentStat.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${studentStat.progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(studentStat.status)}`}>
                        {getStatusLabel(studentStat.status)}
                      </span>
                      {studentStat.daysSinceUpdate > 7 && (
                        <p className="text-xs text-gray-500 mt-1">
                          آخر تحديث: {studentStat.daysSinceUpdate} يوم
                        </p>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {studentStat.isExpiringSoon ? (
                          <span className="text-red-600 font-semibold">
                            {studentStat.daysLeft} يوم
                          </span>
                        ) : (
                          <span className="text-gray-600">
                            {studentStat.daysLeft} يوم
                          </span>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(studentStat.subscription.currentLevelAccessExpiresAt.toDate()).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {studentStat.currentLevel < stats.totalLevels && (
                          <button
                            onClick={() => promoteStudent(studentStat.student.id, selectedCurriculum.id)}
                            className="text-green-600 hover:text-green-900 p-1 rounded"
                            title="ترقية للمرحلة التالية"
                          >
                            <TrendingUp size={16} />
                          </button>
                        )}
                        
                        {studentStat.currentLevel > 1 && (
                          <button
                            onClick={() => demoteStudent(studentStat.student.id, selectedCurriculum.id)}
                            className="text-yellow-600 hover:text-yellow-900 p-1 rounded"
                            title="تراجع للمرحلة السابقة"
                          >
                            <TrendingUp size={16} className="rotate-180" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => resetStudentProgress(studentStat.student.id, selectedCurriculum.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="إعادة تعيين التقدم"
                        >
                          <RefreshCw size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">
                {searchTerm || filterMode !== 'all' 
                  ? 'لا توجد نتائج تطابق المعايير المحددة'
                  : 'لا توجد طلاب في هذا المنهج'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const GroupsTab = () => {
    if (!selectedCurriculum) return null;
    
    const curriculumGroups_filtered = curriculumGroups.filter(g => g.curriculumId === selectedCurriculum.id);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {curriculumGroups_filtered.map(group => {
            const groupStats = getGroupProgressStats(group.id);
            if (!groupStats) return null;

            return (
              <div key={group.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold">{group.name}</h4>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    group.status === 'active' ? 'bg-green-100 text-green-800' :
                    group.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {group.status === 'active' ? 'مفعلة' :
                     group.status === 'pending' ? 'قيد الإنشاء' : 'غير مفعلة'}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-blue-600">{groupStats.totalStudents}</p>
                      <p className="text-sm text-gray-600">طالب</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-green-600">{groupStats.avgProgress.toFixed(1)}%</p>
                      <p className="text-sm text-gray-600">متوسط التقدم</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>تقدم المجموعة</span>
                      <span>المرحلة {groupStats.currentGroupLevel}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${(groupStats.currentGroupLevel / (groupStats.curriculum?.levels?.length || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.status === 'active' && (
                      <button
                        onClick={() => promoteGroup(group.id)}
                        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <TrendingUp size={16} />
                        ترقية المجموعة
                      </button>
                    )}
                    
                    <button
                      onClick={() => setSelectedGroup(group)}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye size={16} />
                      عرض التفاصيل
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {curriculumGroups_filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="mx-auto mb-4" size={48} />
            <p>لا توجد مجموعات لهذا المنهج</p>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">تقدم الطلاب في المناهج</h2>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">اختر المنهج</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {curricula.filter(c => c.isActive).map(curriculum => {
            const stats = getCurriculumProgressStats(curriculum.id);
            
            return (
              <div
                key={curriculum.id}
                onClick={() => setSelectedCurriculum(curriculum)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedCurriculum?.id === curriculum.id 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h4 className="font-semibold">{curriculum.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{curriculum.category}</p>
                {stats && (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm">
                      <span className="text-gray-600">الطلاب:</span>
                      <span className="font-semibold ml-2">{stats.totalStudents}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-600">متوسط التقدم:</span>
                      <span className="font-semibold ml-2 text-green-600">{stats.avgProgress.toFixed(1)}%</span>
                    </p>
                    {stats.criticalStudents > 0 && (
                      <p className="text-sm text-red-600">
                        ⚠️ {stats.criticalStudents} طالب يحتاج تدخل
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedCurriculum && (
        <>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setViewMode('overview')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  viewMode === 'overview' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <BarChart3 size={18} />
                نظرة عامة
              </button>
              
              <button
                onClick={() => setViewMode('students')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  viewMode === 'students' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Users size={18} />
                الطلاب
              </button>
              
              <button
                onClick={() => setViewMode('groups')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  viewMode === 'groups' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Target size={18} />
                المجموعات
              </button>
            </div>
          </div>

          {viewMode === 'overview' && <OverviewTab />}
          {viewMode === 'students' && <StudentsTab />}
          {viewMode === 'groups' && <GroupsTab />}
        </>
      )}

      {selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">تفاصيل المجموعة: {selectedGroup.name}</h3>
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={24} />
                </button>
              </div>
              
              {(() => {
                const groupStats = getGroupProgressStats(selectedGroup.id);
                if (!groupStats) return <p>خطأ في تحميل بيانات المجموعة</p>;

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <Users className="mx-auto text-blue-600 mb-2" size={24} />
                        <p className="text-2xl font-bold text-blue-900">{groupStats.totalStudents}</p>
                        <p className="text-gray-600 text-sm">عدد الطلاب</p>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <TrendingUp className="mx-auto text-green-600 mb-2" size={24} />
                        <p className="text-2xl font-bold text-green-900">{groupStats.avgProgress.toFixed(1)}%</p>
                        <p className="text-gray-600 text-sm">متوسط التقدم</p>
                      </div>
                      
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <Target className="mx-auto text-purple-600 mb-2" size={24} />
                        <p className="text-2xl font-bold text-purple-900">{groupStats.currentGroupLevel}</p>
                        <p className="text-gray-600 text-sm">المرحلة الحالية</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold mb-4">تقدم الطلاب</h4>
                      <div className="space-y-3">
                        {groupStats.groupStudents.map(studentData => (
                          <div key={studentData.student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="font-semibold text-purple-600">
                                  {studentData.student.firstName.charAt(0)}{studentData.student.lastName.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">
                                  {studentData.student.firstName} {studentData.student.lastName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  المرحلة {studentData.currentLevel} - {studentData.completedLevels} مكتملة
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="font-bold text-green-600">
                                {studentData.progressPercentage.toFixed(1)}%
                              </p>
                              <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${studentData.progressPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {selectedGroup.status === 'active' && (
                        <button
                          onClick={() => {
                            promoteGroup(selectedGroup.id);
                            setSelectedGroup(null);
                          }}
                          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <TrendingUp size={18} />
                          ترقية المجموعة كاملة
                        </button>
                      )}
                      
                      <button
                        onClick={() => setSelectedGroup(null)}
                        className="bg-gray-400 text-white px-6 py-3 rounded-lg hover:bg-gray-500 transition-colors"
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CurriculumProgressManagement;