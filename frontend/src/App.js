import React, { useState } from 'react';
import Chat from './components/Chat';
import Whiteboard from './components/Whiteboard';
import './App.css';

function App() {
  const [aiContent, setAiContent] = useState('');
  const [isWriting, setIsWriting] = useState(false);

  const handleAIResponse = (content) => {
    if (!content) return;
    setAiContent(content);
    setIsWriting(true);
    // Simulate writing duration based on content length
    setTimeout(() => {
      setIsWriting(false);
    }, Math.min((content?.length || 0) * 50, 5000));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 z-10 relative">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎓</span>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Saboora AI
          </h1>
        </div>
        <nav className="flex gap-4">
          <div className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer">الرئيسية</div>
          <div className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 cursor-pointer transition-colors">
            حسابي
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex w-full relative h-[calc(100vh-4rem)]">
        {/* Chat Section - 40% */}
        <section className="w-full md:w-[40%] h-full p-4 border-l border-gray-200 bg-white">
          <Chat onAIResponse={handleAIResponse} educationType="arabic" />
        </section>

        {/* Whiteboard Section - 60% */}
        <section className="hidden md:block w-[60%] h-full p-4 relative bg-gray-100">
          <div className="w-full h-full relative rounded-xl overflow-hidden shadow-inner border border-gray-200">
            <Whiteboard aiContent={aiContent} isWriting={isWriting} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
