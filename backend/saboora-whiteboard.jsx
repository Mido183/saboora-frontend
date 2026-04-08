import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Whiteboard = ({ aiContent, isWriting }) => {
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [writingProgress, setWritingProgress] = useState(0);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);

  // أصوات السبورة
  const playPenSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.1);
  };

  const playEraseSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.05, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.5);
  };

  // محاكاة الكتابة اليدوية
  const simulateHandwriting = (text, ctx, x, y, color = '#000000') => {
    ctx.fillStyle = color;
    ctx.font = '24px "Segoe UI", Arial, sans-serif';
    
    let currentX = x;
    let currentY = y;
    const lineHeight = 40;
    const charWidth = 15;
    
    for (let i = 0; i < text.length; i++) {
      setTimeout(() => {
        const char = text[i];
        
        if (char === '\n') {
          currentX = x;
          currentY += lineHeight;
        } else {
          // إضافة اهتزاز بسيط لمحاكاة الكتابة اليدوية
          const wobbleX = (Math.random() - 0.5) * 2;
          const wobbleY = (Math.random() - 0.5) * 2;
          
          ctx.fillText(char, currentX + wobbleX, currentY + wobbleY);
          currentX += charWidth;
          
          // صوت القلم
          if (Math.random() > 0.7) playPenSound();
        }
        
        setWritingProgress((i + 1) / text.length);
      }, i * 50); // 50ms لكل حرف
    }
  };

  // رسم المحتوى على السبورة
  useEffect(() => {
    if (!aiContent || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // مسح السبورة مع أنيميشن
    const clearCanvas = () => {
      playEraseSound();
      let alpha = 1;
      const fadeOut = setInterval(() => {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        alpha -= 0.1;
        
        if (alpha <= 0) {
          clearInterval(fadeOut);
          drawContent();
        }
      }, 30);
    };
    
    const drawContent = () => {
      // رسم المحتوى بألوان مختلفة
      const sections = aiContent.split('##');
      let yPosition = 50;
      
      sections.forEach((section, index) => {
        const lines = section.trim().split('\n');
        
        lines.forEach((line) => {
          let color = '#000000'; // أسود افتراضي
          
          // اختيار اللون بناءً على المحتوى
          if (line.includes('قانون') || line.includes('القانون') || line.includes('Formula')) {
            color = '#0066CC'; // أزرق للقوانين
          } else if (line.includes('الحل') || line.includes('الإجابة') || line.includes('Answer')) {
            color = '#CC0000'; // أحمر للإجابات
          } else if (line.includes('ملاحظة') || line.includes('Note')) {
            color = '#00AA00'; // أخضر للملاحظات
          }
          
          simulateHandwriting(line, ctx, 30, yPosition, color);
          yPosition += 45;
        });
      });
    };
    
    if (isWriting) {
      clearCanvas();
    }
  }, [aiContent, isWriting]);

  // الانتقال بين الشرائح
  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      playEraseSound();
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-100 rounded-lg shadow-lg overflow-hidden">
      {/* Header السبورة */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-800 to-amber-900 h-12 flex items-center justify-between px-4 shadow-md">
        <div className="text-white font-bold text-lg flex items-center gap-2">
          <span className="text-2xl">✏️</span>
          <span>Saboora AI</span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              playEraseSound();
            }}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
          >
            🗑️ مسح
          </button>
          
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              const url = canvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.download = `saboora-slide-${currentSlide + 1}.png`;
              link.href = url;
              link.click();
            }}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
          >
            💾 حفظ
          </button>
        </div>
      </div>

      {/* Canvas الرئيسي */}
      <div className="absolute inset-0 top-12 flex items-center justify-center bg-white">
        <canvas
          ref={canvasRef}
          width={1200}
          height={700}
          className="border-4 border-gray-300 rounded shadow-inner"
          style={{
            background: 'linear-gradient(to bottom, #ffffff 0%, #f8f8f8 100%)',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        />
      </div>

      {/* مؤشر التقدم */}
      {isWriting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-16 right-4 bg-white px-4 py-2 rounded-full shadow-lg"
        >
          <div className="flex items-center gap-2">
            <div className="animate-spin">✍️</div>
            <span className="text-sm font-medium">
              جاري الكتابة... {Math.round(writingProgress * 100)}%
            </span>
          </div>
        </motion.div>
      )}

      {/* Slide Navigation */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-2 items-center bg-white px-4 py-2 rounded-full shadow-lg">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded transition-colors"
          >
            ◀
          </button>
          
          <span className="text-sm font-medium">
            {currentSlide + 1} / {slides.length}
          </span>
          
          <button
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded transition-colors"
          >
            ▶
          </button>
        </div>
      )}

      {/* Slide Thumbnails */}
      {slides.length > 1 && (
        <div className="absolute bottom-16 right-4 flex flex-col gap-2 max-h-96 overflow-y-auto">
          {slides.map((slide, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05 }}
              onClick={() => setCurrentSlide(index)}
              className={`w-24 h-16 rounded border-2 transition-all ${
                currentSlide === index
                  ? 'border-blue-500 shadow-lg'
                  : 'border-gray-300 opacity-50 hover:opacity-100'
              }`}
            >
              <div className="w-full h-full bg-white rounded flex items-center justify-center text-xs">
                Slide {index + 1}
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Whiteboard;
