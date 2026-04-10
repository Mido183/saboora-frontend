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
  const isArabic = educationType === 'arabic';

  // رسالة الترحيب
  useEffect(() => {
    const welcomeMsg = isArabic
      ? `أهلاً يا **${studentName}**! 🎉\nأنا مدرسك الخاص. اسألني في أي مادة وسأشرحها لك خطوة بخطوة وأكتب أهم النقاط على السبورة! ✏️`
      : `Welcome **${studentName}**! 🎉\nI'm your personal AI tutor. Ask me anything and I'll explain step by step!`;
    setMessages([{
      id: 0,
      role: 'assistant',
      content: welcomeMsg,
      timestamp: new Date().toISOString()
    }]);
  }, []);

  // التمرير التلقائي
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // تحويل الملف لـ Base64
  const convertFileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

  // دالة استخراج النص من رد الـ AI (سواء JSON أو نص عادي)
  const parseChatResponse = (rawContent) => {
    if (!rawContent) return rawContent;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.chat_explanation) {
          return data.chat_explanation + (data.teacher_voice ? `\n\n💬 ${data.teacher_voice}` : '');
        }
      }
    } catch (e) {
      // ليس JSON، أرجع النص كما هو
    }
    // إزالة قسم السبورة إذا كان موجوداً بصيغة النصية
    const parts = rawContent.split('---WHITEBOARD---');
    return parts[0].trim();
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !selectedFile) return;

    const currentInput = inputValue;
    const currentFile = selectedFile;

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
      const API_URL = window.location.hostname === 'localhost'
        ? "http://localhost:5000"
        : "";

      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: currentInput,
          file: currentFile,
          educationType,
          gradeLevel,
          conversationHistory: messages.slice(-5).map(m => ({ role: m.role, content: parseChatResponse(m.content) }))
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server Error ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // عرض الشرح المقروء فقط في الشات
        const readableChat = parseChatResponse(data.chatResponse);

        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: readableChat,
          timestamp: new Date().toISOString()
        }]);

        // إرسال أوامر السبورة + الصورة
        if (onAIResponse && data.whiteboardContent) {
          onAIResponse(data.whiteboardContent, data.whiteboardImage || null);
        }
      } else {
        throw new Error(data.error || 'خطأ غير معروف');
      }
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        role: 'assistant',
        content: `⚠️ **خطأ في الاتصال:** ${error.message}\n\nتأكد من تشغيل السيرفر على المنفذ 5000.`,
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
      setSelectedFile({ name: file.name, type: file.type, data: base64 });
      setShowUploadMenu(false);
    } catch (err) {
      alert("فشل في قراءة الملف");
    }
  };

  // تنسيق النص (Bold وسطور جديدة)
  const formatMessage = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif", direction: isArabic ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e40af, #4f46e5)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
          <span style={{ fontSize: '22px' }}>👩‍🏫</span>
          <span style={{ fontWeight: '700', fontSize: '16px' }}>
            {isArabic ? 'دردشة المعلم الصبور' : 'Saboora AI Chat'}
          </span>
        </div>
        <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', letterSpacing: '1px' }}>
          DUAL CORE
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8faff' }}>
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', justifyContent: m.role === 'user' ? (isArabic ? 'flex-start' : 'flex-end') : (isArabic ? 'flex-end' : 'flex-start') }}
            >
              <div style={{
                maxWidth: '85%',
                padding: '12px 16px',
                borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: m.role === 'user' ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : 'white',
                color: m.role === 'user' ? 'white' : '#1e293b',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                border: m.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                lineHeight: '1.8',
                fontSize: '14px',
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
              }}>
                {m.file && (
                  <div style={{ marginBottom: '8px', fontSize: '12px', opacity: 0.8, borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '6px' }}>
                    {m.file.type?.includes('image') ? '🖼️' : '📄'} {m.file.name}
                  </div>
                )}
                <div dangerouslySetInnerHTML={{ __html: formatMessage(m.content) }} />
                <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '6px', textAlign: isArabic ? 'left' : 'right' }}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: isArabic ? 'flex-end' : 'flex-start' }}>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '18px 18px 18px 4px', padding: '12px 18px', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0, 1, 2].map(i => (
                  <motion.div key={i} animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, delay: i * 0.15, duration: 0.6 }}
                    style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
                ))}
              </div>
              <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'Cairo' }}>
                {isArabic ? '🧠 المعلم يفكر ويكتب على السبورة...' : '🧠 Teacher is thinking...'}
              </span>
            </div>
          </motion.div>
        )}

        {/* اقتراحات سريعة - تظهر فقط عند الرسالة الأولى */}
        {messages.length <= 1 && !isLoading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: isArabic ? 'flex-end' : 'flex-start', padding: '4px 0' }}>
            {(isArabic ? [
              '⚗️ شرح مكونات الذرة',
              '📐 قانون نيوتن الثاني',
              '🧮 مساحة المثلث',
              '⚡ قانون أوم',
              '🔬 الخلية الحية',
            ] : [
              '📐 Triangle Area',
              '⚡ Ohm\'s Law',
              '🔬 Cell Biology',
              '🌍 Photosynthesis',
            ]).map(q => (
              <button key={q}
                onClick={() => { setInputValue(q.replace(/^[\p{Emoji}\s]+/u, '').trim()); }}
                style={{
                  background: 'white', border: '1.5px solid #bfdbfe', color: '#1d4ed8',
                  borderRadius: '20px', padding: '6px 14px', cursor: 'pointer',
                  fontSize: '12px', fontFamily: 'Cairo', fontWeight: '600',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { e.target.style.background = '#eff6ff'; e.target.style.borderColor = '#2563eb'; }}
                onMouseLeave={e => { e.target.style.background = 'white'; e.target.style.borderColor = '#bfdbfe'; }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '12px 16px', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        {selectedFile && (
          <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 'bold', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', background: '#eff6ff', padding: '6px 12px', borderRadius: '8px' }}>
            <span>📂 {selectedFile.name}</span>
            <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>✖</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', background: '#f1f5f9', borderRadius: '16px', padding: '8px 12px', border: '2px solid transparent', transition: 'border-color 0.2s' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUploadMenu(!showUploadMenu)}
              style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'white', border: 'none', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
            >
              📎
            </button>
            <AnimatePresence>
              {showUploadMenu && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '8px', background: 'white', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0', overflow: 'hidden', zIndex: 20, minWidth: '180px' }}>
                  <button onClick={() => fileInputRef.current.click()}
                    style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Cairo', fontSize: '14px', color: '#374151' }}>
                    🖼️ {isArabic ? 'صورة / ملف PDF' : 'Image / PDF'}
                  </button>
                  <button onClick={() => { const url = prompt(isArabic ? 'أدخل رابط YouTube:' : 'Enter YouTube URL:'); if (url) { setInputValue(v => v + `\n[رابط: ${url}]`); setShowUploadMenu(false); } }}
                    style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Cairo', fontSize: '14px', color: '#374151', borderTop: '1px solid #f1f5f9' }}>
                    🎥 {isArabic ? 'رابط يوتيوب' : 'YouTube Link'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder={isArabic ? 'اسألني في أي مادة...' : 'Ask me anything...'}
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', maxHeight: '120px',
              fontFamily: "'Cairo', 'Tajawal', sans-serif", fontSize: '14px', lineHeight: '1.6',
              direction: isArabic ? 'rtl' : 'ltr', padding: '6px 4px', color: '#1e293b'
            }}
          />

          <button
            onClick={handleSendMessage}
            disabled={isLoading || (!inputValue.trim() && !selectedFile)}
            style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: (isLoading || (!inputValue.trim() && !selectedFile)) ? '#cbd5e1' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
              border: 'none', cursor: 'pointer', fontSize: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(37,99,235,0.3)'
            }}
          >
            {isLoading
              ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              : '🚀'}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} accept="image/*,application/pdf" />
    </div>
  );
};

export default Chat;
