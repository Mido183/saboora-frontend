import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Chat = ({ onAIResponse, educationType = 'arabic', gradeLevel = 'sec3', studentName = 'طالب' }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // رسالة الترحيب الأولى من الذكاء الاصطناعي
  useEffect(() => {
    const gradeLabels = {
      sec3: 'الثانوية العامة', sec2: 'الثاني الثانوي', sec1: 'الأول الثانوي',
      prep3: 'الثالث الإعدادي', prep2: 'الثاني الإعدادي', prep1: 'الأول الإعدادي',
      primary6: 'السادس الابتدائي', primary5: 'الخامس الابتدائي', primary4: 'الرابع الابتدائي',
      grade12: 'Grade 12', grade11: 'Grade 11', grade10: 'Grade 10',
      grade9: 'Grade 9', grade8: 'Grade 8', grade7: 'Grade 7',
      grade6: 'Grade 6', grade5: 'Grade 5', grade4: 'Grade 4',
    };
    const gradeName = gradeLabels[gradeLevel] || gradeLevel;
    const welcomeMsg = educationType === 'arabic'
      ? `أهلاً ${studentName}! 👋\n\nأنا مدرسك الخاص للـ ${gradeName}. سأشرح لك أي موضوع خطوة بخطوة وهتلاقي الشرح المختصر على السبورة على اليسار.\n\n📚 اسألني في أي حاجة في الرياضيات أو الفيزياء أو الكيمياء!\nمثال: "اشرح لي قانون نيوتن الثاني"`
      : `Welcome ${studentName}! 👋\n\nI'm your personal AI tutor for ${gradeName}. I'll explain any topic step by step, and you'll find a summary on the whiteboard on the left.\n\n📚 Ask me anything in Math, Physics, or Chemistry!\nExample: "Explain Newton's Second Law"`;

    setMessages([{
      id: 0,
      role: 'assistant',
      type: 'chat',
      content: welcomeMsg,
      timestamp: new Date().toISOString()
    }]);

    // 📥 استرجاع الرسائل القديمة من السيرفر (Supabase)
    const fetchHistory = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/messages', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (data.success && data.messages.length > 0) {
          // دمج الرسالة الترحيبية مع التاريخ القديم
          setMessages(prev => [...prev, ...data.messages]);
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      }
    };
    fetchHistory();
  }, []);

  // التمرير التلقائي للأسفل
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // إرسال الرسالة للـ AI
  const sendMessage = async () => {
    if (!inputValue.trim() && !selectedFile) return;

    const currentInput = inputValue;
    const currentFile = selectedFile;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: currentInput,
      file: currentFile,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setSelectedFile(null);
    setIsLoading(true);

    try {
      const API_URL = "http://localhost:3000";
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: currentInput,
          file: currentFile,
          educationType: educationType,
          gradeLevel: gradeLevel,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `خطأ ${response.status}`);
      }

      const data = await response.json();

      const aiMessageChat = {
        id: Date.now() + 1,
        role: 'assistant',
        type: 'chat',
        content: data.chatResponse,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessageChat]);

      // إرسال محتوى السبورة للـ parent
      if (onAIResponse && data.whiteboardContent) {
        onAIResponse(data.whiteboardContent);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        type: 'error',
        content: `❌ ${error.message || 'حدث خطأ. تأكد من تشغيل السيرفر وصحة الـ API Keys.'}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // رفع الملفات
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedFile({ name: file.name, type: file.type, data: reader.result });
      setShowUploadMenu(false);
    };
    reader.readAsDataURL(file);
  };

  // رفع رابط YouTube
  const handleURLUpload = () => {
    const url = prompt(educationType === 'arabic' ? 'أدخل رابط YouTube:' : 'Enter YouTube URL:');
    if (url) {
      setSelectedFile({ name: 'YouTube Video', type: 'url', data: url });
      setShowUploadMenu(false);
    }
  };

  // تنسيق نص الرسالة (Markdown بسيط)
  const formatMessage = (text) => {
    if (!text) return '';
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('## ')) return <div key={i} className="font-bold text-blue-700 mt-3 mb-1 text-base">{line.replace('## ', '')}</div>;
        if (line.startsWith('# ')) return <div key={i} className="font-bold text-blue-800 mt-3 text-lg">{line.replace('# ', '')}</div>;
        if (line.match(/^\d+\.\s/)) return <div key={i} className="mr-3 my-1">• {line.replace(/^\d+\.\s/, '')}</div>;
        if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} className="mr-3 my-1">• {line.slice(2)}</div>;
        if (line.trim() === '') return <div key={i} className="h-2" />;
        return <div key={i} className="my-0.5">{line}</div>;
      });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: 'Cairo, sans-serif' }}>

      {/* === Header === */}
      <div className="shrink-0 bg-gradient-to-r from-blue-700 to-blue-600 text-white px-4 py-3 shadow-md">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="text-xl">💬</span>
          <span>{educationType === 'arabic' ? 'اسأل مدرسك الخاص' : 'Ask Your Tutor'}</span>
        </h2>
        <p className="text-xs text-blue-200 mt-0.5">
          {educationType === 'arabic' ? '📚 الشرح المفصل يظهر هنا • السبورة على اليسار' : '📚 Full explanation here • Summary on whiteboard'}
        </p>
      </div>

      {/* === منطقة الرسائل === */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
              dir="rtl"
            >
              {/* أيقونة المدرس */}
              {message.role === 'assistant' && (
                <div className="shrink-0 ml-2 mt-1">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shadow">🎓</div>
                </div>
              )}

              <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed
                ${message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : message.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-none'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                }`}
              >
                {/* معاينة الملف */}
                {message.file && (
                  <div className="mb-2 p-2 bg-black/10 rounded-lg text-xs flex items-center gap-1">
                    <span>{message.file.type?.startsWith('image/') ? '🖼️' : message.file.type === 'url' ? '🎥' : '📄'}</span>
                    <span>{message.file.name}</span>
                  </div>
                )}

                {/* محتوى الرسالة */}
                <div className="chat-message">
                  {message.role === 'assistant' ? formatMessage(message.content) : message.content}
                </div>

                {/* الوقت */}
                <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {new Date(message.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* أيقونة المستخدم */}
              {message.role === 'user' && (
                <div className="shrink-0 mr-2 mt-1">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 text-sm shadow">👤</div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* مؤشر التحميل */}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end" dir="rtl">
            <div className="shrink-0 ml-2 mt-1">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shadow">🎓</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-5 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 150, 300].map(delay => (
                    <div key={delay} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {educationType === 'arabic' ? 'المدرس يفكر...' : 'Thinking...'}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* === معاينة الملف المختار === */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 px-4 py-2 bg-blue-50 border-t border-blue-100"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <span>{selectedFile.type?.startsWith('image/') ? '🖼️' : selectedFile.type === 'url' ? '🎥' : '📄'}</span>
                <span className="font-medium truncate max-w-[200px]">{selectedFile.name}</span>
              </div>
              <button onClick={() => setSelectedFile(null)} className="text-red-500 hover:text-red-700 font-bold text-lg leading-none">×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === منطقة الإدخال === */}
      <div className="shrink-0 p-3 bg-white border-t border-gray-200" dir="rtl">
        <div className="flex items-end gap-2">

          {/* زر الإضافة */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowUploadMenu(!showUploadMenu)}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
              title={educationType === 'arabic' ? 'إضافة ملف' : 'Add file'}
            >
              <span className="text-lg">＋</span>
            </button>

            {/* قائمة الرفع */}
            <AnimatePresence>
              {showUploadMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden w-44 z-20"
                >
                  <button onClick={() => { fileInputRef.current.accept = 'image/*'; fileInputRef.current?.click(); }}
                    className="w-full px-4 py-3 hover:bg-gray-50 text-right flex items-center gap-3 text-sm transition-colors">
                    <span>🖼️</span><span className="font-medium">إضافة صورة</span>
                  </button>
                  <button onClick={() => { fileInputRef.current.accept = '.pdf,.doc,.docx'; fileInputRef.current?.click(); }}
                    className="w-full px-4 py-3 hover:bg-gray-50 text-right flex items-center gap-3 text-sm transition-colors border-t border-gray-100">
                    <span>📄</span><span className="font-medium">إضافة ملف PDF</span>
                  </button>
                  <button onClick={handleURLUpload}
                    className="w-full px-4 py-3 hover:bg-gray-50 text-right flex items-center gap-3 text-sm transition-colors border-t border-gray-100">
                    <span>🎥</span><span className="font-medium">رابط YouTube</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
          </div>

          {/* حقل النص */}
          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={educationType === 'arabic' ? 'اكتب سؤالك هنا... (Enter للإرسال)' : 'Type your question... (Enter to send)'}
            rows={1}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-right text-sm transition-all"
            style={{
              fontFamily: 'Cairo, sans-serif',
              minHeight: '42px',
              maxHeight: '120px',
              direction: 'rtl',
            }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />

          {/* زر الإرسال */}
          <button
            onClick={sendMessage}
            disabled={isLoading || (!inputValue.trim() && !selectedFile)}
            className="shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full transition-colors shadow-md"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-lg">↑</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
