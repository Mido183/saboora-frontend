import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatEnhanced = ({ onWhiteboardUpdate, educationType = 'arabic' }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    // رسالة المستخدم
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      console.log('📤 Sending message to backend...');
      
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputValue,
          educationType: educationType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'فشل في الحصول على رد');
      }

      const data = await response.json();
      
      console.log('✅ Received response from backend');
      console.log('📊 Chat response length:', data.chatResponse?.length);
      console.log('📊 Whiteboard content length:', data.whiteboardContent?.length);
      console.log('📊 Image:', data.whiteboardImage ? 'Yes' : 'No');

      // رسالة الـ AI في الشات (مفصلة)
      const aiChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        type: 'chat',
        content: data.chatResponse,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiChatMessage]);

      // إرسال محتوى السبورة + الصورة للـ parent component
      if (onWhiteboardUpdate && data.whiteboardContent) {
        console.log('📝 Updating whiteboard...');
        onWhiteboardUpdate({
          content: data.whiteboardContent,
          image: data.whiteboardImage,
          isWriting: true
        });
      }

    } catch (error) {
      console.error('❌ Chat error:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        type: 'error',
        content: `عذراً، حدث خطأ: ${error.message}\n\nتأكد من:\n✅ Backend شغال\n✅ API Keys موجودة\n✅ الإنترنت متصل`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-md">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <span>الشات مع المدرس</span>
        </h2>
        <p className="text-sm opacity-90 mt-1">
          اطرح سؤالك وشاهد الشرح المفصل هنا + ملخص على السبورة
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-6xl mb-4">🎓</div>
            <p className="text-lg font-medium">مرحباً! أنا مدرسك الخاص</p>
            <p className="text-sm mt-2 text-center px-4">
              اسألني أي سؤال في الرياضيات، الفيزياء، أو الكيمياء<br />
              وسأشرح لك بالتفصيل هنا + ملخص مرئي على السبورة 📝
            </p>
            
            {/* اقتراحات سريعة */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-4">
              {[
                '📐 احسب مساحة مثلث',
                '⚡ اشرح قانون أوم',
                '🧪 ما هي الخلية؟',
                '📊 اشرح المتوسط الحسابي'
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputValue(suggestion.replace(/[📐⚡🧪📊]\s/, ''))}
                  className="px-4 py-3 bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-300 rounded-lg text-right transition-all text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-4 shadow ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.type === 'error'
                    ? 'bg-red-100 text-red-800 border-2 border-red-300'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                {/* أيقونة المرسل */}
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">
                    {message.role === 'user' ? '👤' : message.type === 'error' ? '⚠️' : '👨‍🏫'}
                  </div>
                  
                  <div className="flex-1">
                    {/* المحتوى */}
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>

                    {/* التوقيت */}
                    <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {new Date(message.timestamp).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="text-2xl">👨‍🏫</div>
                <div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    المدرس يحضر الشرح للشات والسبورة...
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
            placeholder="اكتب سؤالك هنا..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-right disabled:bg-gray-100"
            dir="rtl"
          />

          <button
            onClick={sendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full transition-colors font-medium flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>جاري الإرسال...</span>
              </>
            ) : (
              <>
                <span>📤</span>
                <span>إرسال</span>
              </>
            )}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          اضغط Enter للإرسال • سيظهر الشرح التفصيلي هنا والملخص على السبورة
        </div>
      </div>
    </div>
  );
};

export default ChatEnhanced;
