import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Chat = ({ onAIResponse, educationType = 'arabic' }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // إرسال الرسالة للـ AI
  const sendMessage = async () => {
    if (!inputValue.trim() && !selectedFile) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue,
      file: selectedFile,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setSelectedFile(null);
    setIsLoading(true);

    try {
      // استدعاء الـ API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: inputValue,
          file: selectedFile,
          educationType: educationType,
          conversationHistory: messages
        })
      });

      const data = await response.json();

      // الرد من الـ AI - جزئين
      const aiMessageChat = {
        id: Date.now() + 1,
        role: 'assistant',
        type: 'chat',
        content: data.chatResponse,
        timestamp: new Date().toISOString()
      };

      const aiMessageWhiteboard = {
        id: Date.now() + 2,
        role: 'assistant',
        type: 'whiteboard',
        content: data.whiteboardContent,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessageChat]);
      
      // إرسال محتوى السبورة للـ parent component
      if (onAIResponse) {
        onAIResponse(data.whiteboardContent);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        type: 'error',
        content: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
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
    if (file) {
      // تحويل الملف لـ base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile({
          name: file.name,
          type: file.type,
          data: reader.result
        });
        setShowUploadMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // رفع رابط YouTube
  const handleURLUpload = () => {
    const url = prompt('أدخل رابط YouTube:');
    if (url) {
      setSelectedFile({
        name: 'YouTube Video',
        type: 'url',
        data: url
      });
      setShowUploadMenu(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-md">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <span>اسأل مدرسك الخاص</span>
        </h2>
        <p className="text-sm opacity-90 mt-1">
          {educationType === 'arabic' ? 'تعليم عربي' : 'تعليم لغات'}
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-lg font-medium">ابدأ المحادثة مع مدرسك!</p>
            <p className="text-sm mt-2">اسأل أي سؤال في الرياضيات، الفيزياء، أو الكيمياء</p>
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
                className={`max-w-[80%] rounded-lg p-4 shadow ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.type === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                {/* File Preview */}
                {message.file && (
                  <div className="mb-2 p-2 bg-opacity-20 bg-black rounded">
                    <span className="text-xs">📎 {message.file.name}</span>
                  </div>
                )}

                {/* Message Content */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>

                {/* Timestamp */}
                <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {new Date(message.timestamp).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
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
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-gray-600">المدرس يفكر...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {selectedFile.type.startsWith('image/') ? '🖼️' : selectedFile.type === 'url' ? '🎥' : '📄'}
              </span>
              <span className="text-sm font-medium text-blue-800">{selectedFile.name}</span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          {/* Upload Button */}
          <div className="relative">
            <button
              onClick={() => setShowUploadMenu(!showUploadMenu)}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <span className="text-xl">➕</span>
            </button>

            {/* Upload Menu */}
            <AnimatePresence>
              {showUploadMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 hover:bg-gray-50 text-right flex items-center gap-3 transition-colors"
                  >
                    <span className="text-xl">📷</span>
                    <span className="text-sm font-medium">إضافة صورة</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 hover:bg-gray-50 text-right flex items-center gap-3 transition-colors border-t border-gray-100"
                  >
                    <span className="text-xl">📁</span>
                    <span className="text-sm font-medium">إضافة ملف</span>
                  </button>

                  <button
                    onClick={handleURLUpload}
                    className="w-full px-4 py-3 hover:bg-gray-50 text-right flex items-center gap-3 transition-colors border-t border-gray-100"
                  >
                    <span className="text-xl">🔗</span>
                    <span className="text-sm font-medium">إضافة رابط YouTube</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="اكتب سؤالك هنا..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
            dir="rtl"
          />

          {/* Send Button */}
          <button
            onClick={sendMessage}
            disabled={isLoading || (!inputValue.trim() && !selectedFile)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full transition-colors font-medium"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
