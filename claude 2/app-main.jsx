import React, { useState } from 'react';
import ChatEnhanced from './chat-enhanced';
import WhiteboardEnhanced from './whiteboard-enhanced';

function App() {
  const [whiteboardData, setWhiteboardData] = useState({
    content: '',
    image: null,
    isWriting: false
  });
  const [educationType, setEducationType] = useState('arabic');
  const [darkMode, setDarkMode] = useState(false);

  // تحديث السبورة عند وصول رد من الـ AI
  const handleWhiteboardUpdate = (data) => {
    console.log('🎨 Whiteboard update received:', data);
    setWhiteboardData(data);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="text-4xl">📚</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Saboora</h1>
                <p className="text-sm text-gray-600">مدرسك الخاص المدعوم بالذكاء الاصطناعي</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {/* اختيار نوع التعليم */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setEducationType('arabic')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    educationType === 'arabic'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🇪🇬 تعليم عربي
                </button>
                <button
                  onClick={() => setEducationType('language')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    educationType === 'language'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🌍 تعليم لغات
                </button>
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <span className="text-2xl">{darkMode ? '☀️' : '🌙'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
          {/* Chat Section */}
          <div className="h-full">
            <ChatEnhanced
              onWhiteboardUpdate={handleWhiteboardUpdate}
              educationType={educationType}
            />
          </div>

          {/* Whiteboard Section */}
          <div className="h-full">
            <WhiteboardEnhanced
              aiContent={whiteboardData.content}
              aiImage={whiteboardData.image}
              isWriting={whiteboardData.isWriting}
            />
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🤖</span>
              <div>
                <h3 className="font-bold text-gray-800">ذكاء اصطناعي مزدوج</h3>
                <p className="text-sm text-gray-600">شرح تفصيلي في الشات + ملخص مرئي على السبورة</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-green-500">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🖼️</span>
              <div>
                <h3 className="font-bold text-gray-800">صور توضيحية تلقائية</h3>
                <p className="text-sm text-gray-600">صورة مناسبة لكل موضوع تظهر على السبورة</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-purple-500">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✍️</span>
              <div>
                <h3 className="font-bold text-gray-800">كتابة واقعية</h3>
                <p className="text-sm text-gray-600">أنيميشن كتابة يدوية مع أصوات القلم</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
