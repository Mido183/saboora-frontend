import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ألوان الماركر الواقعية
const MARKER_COLORS = {
  black: '#1a1a1a',
  blue: '#2563eb',
  red: '#dc2626',
  green: '#16a34a',
  purple: '#9333ea',
};

// أصوات القلم (Pen Clicks)
const playPenSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(800 + Math.random() * 200, audioContext.currentTime);
  
  gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.05);
};

const Whiteboard = ({ aiContent, isWriting, educationType = 'arabic' }) => {
  const [slides, setSlides] = useState([[]]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const canvasRef = useRef(null);
  const drawingQueue = useRef([]);

  // تأثير اهتزاز بسيط (Jitter) للرسم اليدوي
  const getJitter = (amount = 1.5) => (Math.random() - 0.5) * amount;

  // دالة محاكاة الكتابة البشرية (Handwriting Animation)
  const drawTextHandwritten = async (ctx, text, x, y, color = MARKER_COLORS.black, fontSize = 28) => {
    ctx.font = `${fontSize}px "Gochi Hand", "Cairo", cursive`;
    ctx.fillStyle = color;
    
    let currentX = x;
    const chars = text.split('');
    
    for (const char of chars) {
      const jitterX = getJitter(1);
      const jitterY = getJitter(1);
      ctx.fillText(char, currentX + jitterX, y + jitterY);
      
      const charWidth = ctx.measureText(char).width;
      currentX += charWidth + 1;
      
      // صوت القلم
      if (Math.random() > 0.6) playPenSound();
      
      // تأخير متغير لمحاكاة السرعة البشرية
      await new Promise(r => setTimeout(r, 30 + Math.random() * 40));
    }
  };

  // رسم أشكال مع اهتزاز (Jitter) لتبدو مرسومة باليد
  const drawShapeHanddrawn = async (ctx, action) => {
    ctx.strokeStyle = MARKER_COLORS[action.color] || MARKER_COLORS.blue;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();

    const { shape, x = 400, y = 300, size = 100, label } = action;

    if (shape === 'circle') {
      // رسم دائرة مهتزة تدريجياً
      for (let i = 0; i <= Math.PI * 2; i += 0.1) {
        const radius = size + getJitter(3);
        const px = x + Math.cos(i) * radius;
        const py = y + Math.sin(i) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        ctx.stroke();
        await new Promise(r => setTimeout(r, 10));
      }
    } else if (shape === 'line') {
      const { x2, y2 } = action;
      ctx.moveTo(x + getJitter(2), y + getJitter(2));
      ctx.lineTo(x2 + getJitter(2), y2 + getJitter(2));
      ctx.stroke();
    }

    if (label) {
      await drawTextHandwritten(ctx, label, x - 20, y + size + 30, ctx.strokeStyle, 20);
    }
  };

  // إضافة صورة (Sticker)
  const drawSticker = (ctx, query, x, y, caption) => {
    const img = new Image();
    // استخدام مصدر صور تعليمي افتراضي أو Placeholder
    img.src = `https://unavatar.io/duckduckgo/${encodeURIComponent(query)}`;
    img.onload = () => {
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(0,0,0,0.1)";
      ctx.drawImage(img, x, y, 150, 150);
      ctx.shadowBlur = 0;
      if (caption) {
        drawTextHandwritten(ctx, caption, x, y + 170, MARKER_COLORS.black, 16);
      }
    };
  };

  // معالجة قائمة الأوامر (Action Processor)
  const processActions = async (actions) => {
    if (!canvasRef.current || actions.length === 0) return;
    setIsAnimating(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let currentY = 80;
    const margin = 50;

    for (const action of actions) {
      switch (action.type) {
        case 'WRITE':
          const fontSize = action.importance === 'high' ? 36 : 26;
          const color = MARKER_COLORS[action.color] || MARKER_COLORS.black;
          await drawTextHandwritten(ctx, action.content, margin, currentY, color, fontSize);
          currentY += fontSize + 20;
          break;
        case 'DRAW':
          await drawShapeHanddrawn(ctx, action);
          break;
        case 'STICKER':
          drawSticker(ctx, action.query, 450, currentY, action.caption);
          break;
        case 'CLEAR':
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          currentY = 80;
          break;
        default:
          break;
      }
      await new Promise(r => setTimeout(r, 500)); // فاصل بين الأوامر
    }
    setIsAnimating(false);
  };

  // استقبال المحتوى وتفسيره كـ JSON
  useEffect(() => {
    if (!aiContent || !isWriting) return;

    try {
      const actions = JSON.parse(aiContent);
      if (Array.isArray(actions)) {
        // إذا كان هناك محتوى جديد، نضيف شريحة جديدة
        setSlides(prev => [...prev, actions]);
        setCurrentSlideIndex(prev => prev + 1);
        processActions(actions);
      }
    } catch (e) {
      // Fallback للنص العادي إذا فشل الـ JSON
      const fallbackActions = [{ type: 'WRITE', content: aiContent, color: 'black' }];
      setSlides(prev => [...prev, fallbackActions]);
      setCurrentSlideIndex(prev => prev + 1);
      processActions(fallbackActions);
    }
  }, [aiContent, isWriting]);

  // تبديل الشرائح
  const goToSlide = (index) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlideIndex(index);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // إعادة رسم محتوى الشريحة المختارة (بدون أنيميشن طويل للسرعة)
      const actions = slides[index];
      if (actions) {
        actions.forEach(a => {
          if (a.type === 'WRITE') {
            ctx.font = `${a.importance === 'high' ? 36 : 26}px "Gochi Hand", cursive`;
            ctx.fillStyle = MARKER_COLORS[a.color] || MARKER_COLORS.black;
            ctx.fillText(a.content, 50, 80 + index * 50); // تبسيط للإعادة
          }
        });
      }
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#fffdf5] rounded-xl overflow-hidden shadow-2xl border-8 border-amber-900/10">
      
      {/* Header بنمط خشبي */}
      <div className="h-14 bg-gradient-to-r from-amber-900 to-amber-800 flex items-center justify-between px-6 shadow-lg z-10">
        <div className="flex items-center gap-3 text-white">
          <span className={`text-2xl ${isAnimating ? 'animate-bounce' : ''}`}>✏️</span>
          <h2 className="font-bold text-lg" style={{ fontFamily: 'Cairo' }}>
            {educationType === 'arabic' ? 'السبورة التفاعلية' : 'Interactive Board'}
          </h2>
        </div>
        
        <div className="flex gap-4 items-center">
           {slides.length > 1 && (
             <div className="flex gap-2 bg-white/10 px-3 py-1 rounded-full">
                <button onClick={() => goToSlide(currentSlideIndex - 1)} disabled={currentSlideIndex === 0}>◀</button>
                <span className="text-white text-xs">{currentSlideIndex + 1} / {slides.length}</span>
                <button onClick={() => goToSlide(currentSlideIndex + 1)} disabled={currentSlideIndex === slides.length - 1}>▶</button>
             </div>
           )}
           <button 
            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
            onClick={() => {
              const ctx = canvasRef.current.getContext('2d');
              ctx.clearRect(0, 0, 1200, 800);
            }}
           >
             🗑️
           </button>
        </div>
      </div>

      {/* منطقة الـ Canvas */}
      <div className="flex-1 relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:40px_40px]">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          className="w-full h-full cursor-crosshair"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* أنيميشن المسح (Wipe) */}
        <AnimatePresence>
          {isWriting && (
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              className="absolute inset-0 bg-white/40 origin-left pointer-events-none backdrop-blur-[1px]"
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* مؤشر الحالة */}
      {isAnimating && (
        <div className="absolute bottom-6 right-6 bg-white shadow-2xl rounded-2xl p-4 flex items-center gap-4 border border-blue-100 animate-pulse">
           <div className="w-4 h-4 bg-blue-600 rounded-full" />
           <span className="text-sm font-bold text-blue-900" style={{ fontFamily: 'Cairo' }}>
             {educationType === 'arabic' ? 'الأستاذ يكتب الآن...' : 'Teacher is writing...'}
           </span>
        </div>
      )}
    </div>
  );
};

export default Whiteboard;
