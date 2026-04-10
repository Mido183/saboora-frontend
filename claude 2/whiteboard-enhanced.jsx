import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WhiteboardEnhanced = ({ aiContent, aiImage, isWriting }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [writingProgress, setWritingProgress] = useState(0);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // أصوات السبورة
  const playPenSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  // رسم المحتوى على السبورة
  useEffect(() => {
    if (!aiContent || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // مسح السبورة
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // رسم الصورة إذا كانت موجودة
    if (aiImage && imageRef.current) {
      const img = imageRef.current;
      
      // رسم الصورة في الركن الأيمن العلوي
      const imageWidth = 200;
      const imageHeight = 150;
      const imageX = canvas.width - imageWidth - 20;
      const imageY = 20;
      
      // إطار للصورة
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.strokeRect(imageX - 5, imageY - 5, imageWidth + 10, imageHeight + 10);
      
      // رسم الصورة
      ctx.drawImage(img, imageX, imageY, imageWidth, imageHeight);
      
      // عنوان الصورة
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('صورة توضيحية', canvas.width - 20, imageY + imageHeight + 20);
    }
    
    // رسم النص بأنيميشن
    drawTextWithAnimation(ctx, aiContent);
    
  }, [aiContent, aiImage]);

  // رسم النص مع أنيميشن الكتابة
  const drawTextWithAnimation = (ctx, text) => {
    const lines = text.split('\n');
    let yPosition = aiImage ? 200 : 50; // إذا كان فيه صورة، ابدأ من تحتها
    let charIndex = 0;
    
    const drawNextChar = () => {
      if (charIndex >= text.length) {
        setWritingProgress(100);
        return;
      }
      
      // تحديد اللون بناءً على المحتوى
      let color = '#000000'; // أسود افتراضي
      const currentLine = lines.find(line => 
        text.substring(0, charIndex).endsWith(line.substring(0, line.length))
      ) || '';
      
      if (currentLine.includes('📌') || currentLine.includes('القانون') || currentLine.includes('Formula')) {
        color = '#0066CC'; // أزرق للقوانين
      } else if (currentLine.includes('✅') || currentLine.includes('الإجابة') || currentLine.includes('Answer')) {
        color = '#CC0000'; // أحمر للإجابات
      } else if (currentLine.includes('📝') || currentLine.includes('الخطوات') || currentLine.includes('Steps')) {
        color = '#00AA00'; // أخضر للخطوات
      }
      
      ctx.fillStyle = color;
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.textAlign = 'right';
      
      const char = text[charIndex];
      
      if (char === '\n') {
        yPosition += 35;
      } else {
        // إضافة تذبذب بسيط (handwriting effect)
        const wobbleX = (Math.random() - 0.5) * 1.5;
        const wobbleY = (Math.random() - 0.5) * 1.5;
        
        ctx.fillText(char, canvas.width - 40 + wobbleX, yPosition + wobbleY);
        
        // صوت القلم أحياناً
        if (Math.random() > 0.8) playPenSound();
      }
      
      charIndex++;
      setWritingProgress((charIndex / text.length) * 100);
      
      setTimeout(drawNextChar, 30); // 30ms لكل حرف
    };
    
    if (isWriting) {
      drawNextChar();
    }
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg shadow-2xl overflow-hidden">
      {/* Header السبورة */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-800 to-amber-900 h-14 flex items-center justify-between px-6 shadow-lg z-10">
        <div className="text-white font-bold text-xl flex items-center gap-3">
          <span className="text-3xl">✏️</span>
          <span>السبورة التفاعلية</span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
              }
            }}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all transform hover:scale-105"
          >
            🗑️ مسح
          </button>
          
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              if (canvas) {
                const url = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `saboora-${Date.now()}.png`;
                link.href = url;
                link.click();
              }
            }}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all transform hover:scale-105"
          >
            💾 حفظ
          </button>
        </div>
      </div>

      {/* Canvas الرئيسي */}
      <div className="absolute inset-0 top-14 flex items-start justify-center pt-6 px-6">
        <div className="relative w-full h-full">
          <canvas
            ref={canvasRef}
            width={1400}
            height={800}
            className="w-full h-full border-4 border-amber-900 rounded-lg shadow-inner bg-white"
          />
          
          {/* صورة مخفية لتحميلها */}
          {aiImage && (
            <img
              ref={imageRef}
              src={aiImage.url}
              alt={aiImage.description}
              className="hidden"
              crossOrigin="anonymous"
              onLoad={() => {
                // إعادة رسم السبورة بعد تحميل الصورة
                if (canvasRef.current && aiContent) {
                  const ctx = canvasRef.current.getContext('2d');
                  drawTextWithAnimation(ctx, aiContent);
                }
              }}
            />
          )}
        </div>
      </div>

      {/* مؤشر الكتابة */}
      <AnimatePresence>
        {isWriting && writingProgress < 100 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 right-6 bg-white px-5 py-3 rounded-full shadow-xl border-2 border-amber-600"
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-2xl"
              >
                ✍️
              </motion.div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-800">
                  المدرس يكتب على السبورة...
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {Math.round(writingProgress)}% مكتمل
                </div>
              </div>
            </div>
            
            {/* شريط التقدم */}
            <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600"
                initial={{ width: 0 }}
                animate={{ width: `${writingProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* معلومات الصورة */}
      {aiImage && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>📸</span>
            <span>
              صورة من{' '}
              <a 
                href={aiImage.photographerUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {aiImage.photographer}
              </a>
              {' '}عبر Unsplash
            </span>
          </div>
        </div>
      )}

      {/* حالة فارغة */}
      {!aiContent && !isWriting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <div className="text-8xl mb-6">📝</div>
          <p className="text-2xl font-medium">السبورة جاهزة!</p>
          <p className="text-lg mt-2">اطرح سؤالك وشاهد الشرح على السبورة</p>
        </div>
      )}
    </div>
  );
};

export default WhiteboardEnhanced;
