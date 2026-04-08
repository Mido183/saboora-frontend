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

  // التمرير التلقائي
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // دالة تحويل الملف لـ Base64
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !selectedFile) return;

    const currentInput = inputValue;
    const currentFile = selectedFile;
    
    // إضافة رسالة المستخدم فوراً
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: currentInput,
      file: currentFile,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
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
          file: currentFile, // يحتوي على Base64 إذا كان صورة
          educationType,
          gradeLevel,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // إضافة رد الشات
        const aiMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.chatResponse,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMsg]);

        // تنفيذ أوامر السبورة
        if (onAIResponse && data.whiteboardContent) {
          onAIResponse(data.whiteboardContent);
        }
      } else {
        throw new Error(data.error || 'خطأ في الاتصال');
      }
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        role: 'assistant',
        content: "⚠️ عذراً، واجهت مشكلة في الاتصال بالسيرفر. تأكد من تشغيل الـ Backend.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const base64 = await convertFileToBase64(file);
      setSelectedFile({
        name: file.name,
        type: file.type,
        data: base64
      });
      setShowUploadMenu(false);
    } catch (err) {
      alert("فشل في معالجة الملف");
    }
  };

  const handleYoutubeURL = () => {
    const url = prompt(educationType === 'arabic' ? 'أدخل رابط YouTube للتحليل:' : 'Enter YouTube URL to analyze:');
    if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
      setInputValue(prev => `${prev}\n[تحليل فيديو يوتيوب: ${url}]`);
      setShowUploadMenu(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-inner relative" style={{ fontFamily: 'Cairo' }}>
      
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 font-bold">
          <span className="text-xl">👩‍🏫</span>
          <span>{educationType === 'arabic' ? 'دردشة المعلم الصبور' : 'Saboora AI Chat'}</span>
        </div>
        <div className="text-[10px] bg-white/20 px-2 py-1 rounded-full uppercase tracking-widest">Dual Core</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                m.role === 'user' ? 'bg-blue-600 text-white rounded-tl-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tr-none'
              }`}>
                {m.file && (
                  <div className="mb-2 border-b border-white/20 pb-2 flex items-center gap-2 text-xs">
                    {m.file.type.includes('image') ? '🖼️' : '📄'} {m.file.name}
                  </div>
                )}
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                <div className="text-[10px] mt-2 opacity-50 text-right">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 relative">
        {selectedFile && (
          <div className="absolute bottom-full left-0 right-0 p-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between text-xs text-blue-700 font-bold">
             <div className="flex items-center gap-2">📂 {selectedFile.name}</div>
             <button onClick={() => setSelectedFile(null)}>✖</button>
          </div>
        )}

        <div className="flex gap-2 items-end bg-gray-100 p-2 rounded-2xl border border-gray-200 focus-within:border-blue-400 transition-all">
          
          <div className="relative">
            <button 
              onClick={() => setShowUploadMenu(!showUploadMenu)}
              className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-gray-50 text-xl text-gray-400"
            >
              📎
            </button>
            
            <AnimatePresence>
              {showUploadMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-2xl border border-gray-100 w-48 overflow-hidden z-20"
                >
                  <button onClick={() => fileInputRef.current.click()} className="w-full p-4 hover:bg-blue-50 flex items-center gap-3 text-sm text-gray-700">
                    <span>🖼️</span> {educationType === 'arabic' ? 'صورة / ملف' : 'Image / File'}
                  </button>
                  <button onClick={handleYoutubeURL} className="w-full p-4 hover:bg-red-50 flex items-center gap-3 text-sm text-gray-700 border-t border-gray-50">
                    <span>🎥</span> {educationType === 'arabic' ? 'رابط يوتيوب' : 'YouTube Link'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder={educationType === 'arabic' ? 'اشغلني بأسئلتك...' : 'Ask me anything...'}
            rows={1}
            className="flex-1 bg-transparent p-2 outline-none text-sm resize-none max-h-32"
          />

          <button 
            onClick={handleSendMessage}
            disabled={isLoading || (!inputValue.trim() && !selectedFile)}
            className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 disabled:bg-gray-300 transition-all"
          >
            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🚀'}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
    </div>
  );
};

export default Chat;
