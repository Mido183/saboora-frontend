import React, { useState } from 'react';
import Chat from './components/Chat';
import Whiteboard from './components/Whiteboard';
import './App.css';

// ====================================================
// شاشة الترحيب واختيار نوع التعليم
// ====================================================
const OnboardingScreen = ({ onComplete }) => {
  const [educationType, setEducationType] = useState('arabic');
  const [gradeLevel, setGradeLevel] = useState('');
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState('');

  const grades = {
    arabic: [
      { value: 'primary4', label: 'الصف الرابع الابتدائي' },
      { value: 'primary5', label: 'الصف الخامس الابتدائي' },
      { value: 'primary6', label: 'الصف السادس الابتدائي' },
      { value: 'prep1', label: 'الصف الأول الإعدادي' },
      { value: 'prep2', label: 'الصف الثاني الإعدادي' },
      { value: 'prep3', label: 'الصف الثالث الإعدادي' },
      { value: 'sec1', label: 'الصف الأول الثانوي' },
      { value: 'sec2', label: 'الصف الثاني الثانوي' },
      { value: 'sec3', label: 'الثانوية العامة (أكتوبر)' },
    ],
    english: [
      { value: 'grade4', label: 'Grade 4' },
      { value: 'grade5', label: 'Grade 5' },
      { value: 'grade6', label: 'Grade 6' },
      { value: 'grade7', label: 'Grade 7 (Middle School)' },
      { value: 'grade8', label: 'Grade 8' },
      { value: 'grade9', label: 'Grade 9' },
      { value: 'grade10', label: 'Grade 10 (High School)' },
      { value: 'grade11', label: 'Grade 11' },
      { value: 'grade12', label: 'Grade 12 (IGCSE / A-Level)' },
    ]
  };

  const handleStart = () => {
    if (!studentName.trim()) { setError('من فضلك أدخل اسمك'); return; }
    if (!gradeLevel) { setError('من فضلك اختر صفك الدراسي'); return; }
    onComplete({ educationType, gradeLevel, studentName: studentName.trim() });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900"
      dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🎓</div>
          <h1 className="text-3xl font-bold text-blue-800" style={{ fontFamily: 'Cairo, sans-serif' }}>
            Saboora AI
          </h1>
          <p className="text-gray-500 mt-2 text-sm" style={{ fontFamily: 'Cairo, sans-serif' }}>
            مدرسك الخاص بالذكاء الاصطناعي
          </p>
        </div>

        {/* حقل الاسم */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo, sans-serif' }}>
            👤 ما اسمك؟
          </label>
          <input
            type="text"
            value={studentName}
            onChange={e => setStudentName(e.target.value)}
            placeholder="أدخل اسمك هنا..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-right transition-colors"
            style={{ fontFamily: 'Cairo, sans-serif', fontSize: '16px' }}
          />
        </div>

        {/* اختيار نوع التعليم */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-3"
            style={{ fontFamily: 'Cairo, sans-serif' }}>
            📚 نوع التعليم
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setEducationType('arabic'); setGradeLevel(''); }}
              className={`py-4 rounded-xl border-2 font-bold transition-all text-center
                ${educationType === 'arabic'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-105'
                  : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              style={{ fontFamily: 'Cairo, sans-serif' }}
            >
              🇪🇬 تعليم عربي
            </button>
            <button
              onClick={() => { setEducationType('english'); setGradeLevel(''); }}
              className={`py-4 rounded-xl border-2 font-bold transition-all text-center
                ${educationType === 'english'
                  ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md scale-105'
                  : 'border-gray-200 text-gray-600 hover:border-purple-300'
                }`}
              style={{ fontFamily: 'Cairo, sans-serif' }}
            >
              🇬🇧 تعليم لغات
            </button>
          </div>
        </div>

        {/* اختيار الصف */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo, sans-serif' }}>
            🏫 الصف الدراسي
          </label>
          <select
            value={gradeLevel}
            onChange={e => setGradeLevel(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-right appearance-none transition-colors bg-white"
            style={{ fontFamily: 'Cairo, sans-serif', fontSize: '15px' }}
          >
            <option value="">-- اختر صفك الدراسي --</option>
            {grades[educationType].map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        {/* رسالة الخطأ */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center"
            style={{ fontFamily: 'Cairo, sans-serif' }}>
            ⚠️ {error}
          </div>
        )}

        {/* زر البدء */}
        <button
          onClick={handleStart}
          className="w-full py-4 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 text-lg"
          style={{ fontFamily: 'Cairo, sans-serif' }}
        >
          🚀 ابدأ التعلم!
        </button>

        <p className="text-center text-xs text-gray-400 mt-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
          لا حاجة لتسجيل دخول • ابدأ فوراً!
        </p>
      </div>
    </div>
  );
};

// ====================================================
// التطبيق الرئيسي
// ====================================================
function App() {
  // 1. محاولة استعادة الملف الشخصي من ذاكرة المتصفح
  const [studentProfile, setStudentProfile] = useState(() => {
    const saved = localStorage.getItem('saboora_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [aiContent, setAiContent] = useState('');
  const [isWriting, setIsWriting] = useState(false);

  // 2. دالة حفظ الملف الشخصي الجديد
  const saveProfile = (profile) => {
    setStudentProfile(profile);
    localStorage.setItem('saboora_profile', JSON.stringify(profile));
  };

  // 3. دالة المسح عند الخروج
  const logout = () => {
    localStorage.removeItem('saboora_profile');
    setStudentProfile(null);
  };

  const handleAIResponse = (content) => {
    if (!content) return;
    setAiContent(content);
    setIsWriting(true);
    setTimeout(() => {
      setIsWriting(false);
    }, Math.min((content?.length || 0) * 40, 8000));
  };

  // عرض شاشة الترحيب إذا لم يكن موجوداً
  if (!studentProfile) {
    return <OnboardingScreen onComplete={saveProfile} />;
  }

  const gradeLabels = {
    sec3: 'الثانوية العامة', sec2: 'الثاني الثانوي', sec1: 'الأول الثانوي',
    prep3: 'الثالث الإعدادي', prep2: 'الثاني الإعدادي', prep1: 'الأول الإعدادي',
    primary6: 'السادس الابتدائي', primary5: 'الخامس الابتدائي', primary4: 'الرابع الابتدائي',
    grade12: 'Grade 12', grade11: 'Grade 11', grade10: 'Grade 10',
    grade9: 'Grade 9', grade8: 'Grade 8', grade7: 'Grade 7',
    grade6: 'Grade 6', grade5: 'Grade 5', grade4: 'Grade 4',
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" dir="rtl"
      style={{ fontFamily: 'Cairo, sans-serif', background: 'var(--color-bg)' }}>

      {/* ========== Header ========== */}
      <header className="shrink-0 h-14 bg-gradient-to-l from-blue-900 to-indigo-800 flex items-center justify-between px-6 shadow-lg z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Cairo, sans-serif' }}>
            Saboora AI
          </h1>
        </div>

        {/* بيانات الطالب */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-white text-sm font-semibold">{studentProfile.studentName}</div>
            <div className="text-blue-200 text-xs">
              {gradeLabels[studentProfile.gradeLevel] || studentProfile.gradeLevel} •
              {studentProfile.educationType === 'arabic' ? ' تعليم عربي 🇪🇬' : ' تعليم لغات 🇬🇧'}
            </div>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs transition-colors"
          >
            تغيير الملف
          </button>
        </div>
      </header>

      {/* ========== Main Layout ========== */}
      <main className="flex-1 flex overflow-hidden">

        {/* قسم الشات - 40% */}
        <section className="w-full md:w-[42%] h-full border-l border-gray-200 bg-white shrink-0 overflow-hidden">
          <Chat
            onAIResponse={handleAIResponse}
            educationType={studentProfile.educationType}
            gradeLevel={studentProfile.gradeLevel}
            studentName={studentProfile.studentName}
          />
        </section>

        {/* قسم السبورة - 58% */}
        <section className="hidden md:flex flex-1 h-full p-3 bg-gray-100 overflow-hidden">
          <div className="w-full h-full rounded-xl overflow-hidden shadow-xl border border-gray-200">
            <Whiteboard
              aiContent={aiContent}
              isWriting={isWriting}
              educationType={studentProfile.educationType}
            />
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;
