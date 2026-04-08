import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ألوان الطباشير
const COLORS = {
  black: '#1a1a1a',
  blue: '#1d4ed8',
  red: '#dc2626',
  green: '#15803d',
  purple: '#7c3aed',
  orange: '#ea580c',
};

// صوت القلم البسيط
const playClick = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 900 + Math.random() * 200;
    g.gain.setValueAtTime(0.04, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.06);
  } catch (_) {}
};

// مكوّن سطر واحد يظهر بتسلسل حرف بحرف
const AnimatedLine = ({ text, color = COLORS.black, size = 'normal', delay = 0, onDone }) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i % 3 === 0) playClick();
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
          if (onDone) onDone();
        }
      }, 28 + Math.random() * 20);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, delay]);

  const fontSize = size === 'title' ? '26px' : size === 'formula' ? '22px' : '17px';
  const fontWeight = size === 'title' ? '900' : size === 'formula' ? '700' : '500';

  return (
    <div style={{
      color,
      fontSize,
      fontWeight,
      fontFamily: "'Cairo', 'Amiri', sans-serif",
      lineHeight: '1.9',
      minHeight: '1.9em',
      direction: 'rtl',
      textAlign: 'right',
      letterSpacing: size === 'formula' ? '1px' : '0',
      borderBottom: size === 'title' ? '2px solid ' + color + '33' : 'none',
      paddingBottom: size === 'title' ? '4px' : '0',
      marginBottom: size === 'title' ? '8px' : '2px',
    }}>
      {displayed}
      {!done && <span style={{ opacity: Math.random() > 0.5 ? 1 : 0, color, marginRight: '2px' }}>|</span>}
    </div>
  );
};

// تفسير قائمة أوامر السبورة
const parseActions = (whiteboardContent) => {
  if (!whiteboardContent) return [];
  
  try {
    const parsed = JSON.parse(whiteboardContent);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}

  // Fallback: تحويل النص العادي لأوامر WRITE
  const lines = whiteboardContent.split('\n').filter(l => l.trim());
  return lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('##')) return { type: 'WRITE', content: trimmed.replace(/^#+\s*/, ''), color: 'blue', size: 'title' };
    if (/[=×÷+\-^]/.test(trimmed) || trimmed.includes('F =') || trimmed.includes('القانون')) return { type: 'WRITE', content: trimmed, color: 'red', size: 'formula' };
    if (trimmed.startsWith('ملاحظة') || trimmed.startsWith('Note')) return { type: 'WRITE', content: trimmed, color: 'green', size: 'normal' };
    return { type: 'WRITE', content: trimmed, color: 'black', size: 'normal' };
  });
};

// مكوّن منطقة الرسم اليدوي (كانفاس)
const DrawingCanvas = ({ isActive }) => {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const src = e.touches ? e.touches[0] : e;
      return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
    };

    const start = (e) => {
      if (!isActive) return;
      e.preventDefault();
      drawing.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    };
    const move = (e) => {
      if (!drawing.current || !isActive) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y); ctx.stroke();
      if (Math.random() > 0.85) playClick();
    };
    const stop = () => { drawing.current = false; ctx.closePath(); };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('mouseleave', stop);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', stop);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', stop);
      canvas.removeEventListener('mouseleave', stop);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', stop);
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={900} height={500}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        cursor: isActive ? 'crosshair' : 'default',
        zIndex: isActive ? 10 : 0,
        opacity: 1,
      }}
    />
  );
};

// المكوّن الرئيسي للسبورة
const Whiteboard = ({ aiContent, isWriting, educationType = 'arabic' }) => {
  const [slides, setSlides] = useState([[]]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [markerColor, setMarkerColor] = useState('#1d4ed8');
  const isArabic = educationType === 'arabic';

  // استقبال محتوى جديد من الـ AI
  useEffect(() => {
    if (!aiContent || !isWriting) return;
    const actions = parseActions(aiContent);
    if (actions.length === 0) return;

    setSlides(prev => {
      const newSlides = [...prev, actions];
      // الانتقال تلقائياً للشريحة الجديدة
      setTimeout(() => setCurrentSlide(newSlides.length - 1), 100);
      return newSlides;
    });
  }, [aiContent, isWriting]);

  // عرض محتوى الشريحة الحالية
  useEffect(() => {
    if (slides[currentSlide]?.length > 0) setIsAnimating(true);
    const t = setTimeout(() => setIsAnimating(false), 3000);
    return () => clearTimeout(t);
  }, [currentSlide]);

  const currentActions = slides[currentSlide] || [];

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: '#fefce8',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.08)',
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
    }}>

      {/* شريط الأدوات */}
      <div style={{
        height: '52px', minHeight: '52px',
        background: 'linear-gradient(135deg, #78350f, #92400e)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 5,
      }}>
        {/* أدوات اليسار */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>{isAnimating ? '✏️' : '🖊️'}</span>
          <span style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>
            {isArabic ? 'السبورة التفاعلية' : 'Interactive Board'}
          </span>
        </div>

        {/* أزرار الشرائح */}
        {slides.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '20px', padding: '4px 10px' }}>
            <button onClick={() => setCurrentSlide(i => Math.max(0, i - 1))} disabled={currentSlide === 0}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', opacity: currentSlide === 0 ? 0.3 : 1 }}>◀</button>
            <span style={{ color: 'white', fontSize: '12px', fontFamily: 'Cairo', minWidth: '50px', textAlign: 'center' }}>
              {currentSlide + 1} / {slides.length}
            </span>
            <button onClick={() => setCurrentSlide(i => Math.min(slides.length - 1, i + 1))} disabled={currentSlide === slides.length - 1}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', opacity: currentSlide === slides.length - 1 ? 0.3 : 1 }}>▶</button>
          </div>
        )}

        {/* أدوات اليمين */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* ألوان الماركر */}
          {Object.entries({ blue: '#1d4ed8', red: '#dc2626', green: '#15803d', black: '#1a1a1a' }).map(([name, hex]) => (
            <button key={name}
              onClick={() => { setMarkerColor(hex); setDrawMode(true); }}
              style={{
                width: '20px', height: '20px', borderRadius: '50%', background: hex, border: markerColor === hex && drawMode ? '3px solid white' : '2px solid rgba(255,255,255,0.4)',
                cursor: 'pointer', transition: 'transform 0.1s',
              }}
            />
          ))}

          {/* زر الرسم */}
          <button onClick={() => setDrawMode(d => !d)}
            style={{
              background: drawMode ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.4)', color: 'white',
              borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontFamily: 'Cairo',
            }}>
            {drawMode ? (isArabic ? '🖱️ ماوس' : '🖱️ Mouse') : (isArabic ? '✏️ ارسم' : '✏️ Draw')}
          </button>

          {/* مسح */}
          <button onClick={() => setSlides(prev => { const updated = [...prev]; updated[currentSlide] = []; return updated; })}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>
            🗑️
          </button>
        </div>
      </div>

      {/* منطقة الكتابة */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* الخطوط الأفقية */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 39px, #d4c596 39px, #d4c596 40px)',
          backgroundSize: '100% 40px',
          backgroundPositionY: '20px',
          opacity: 0.4,
        }} />

        {/* كانفاس الرسم اليدوي */}
        <DrawingCanvas isActive={drawMode} />

        {/* محتوى الـ AI (HTML مع دعم RTL) */}
        <div style={{
          position: 'relative', zIndex: drawMode ? 0 : 5,
          padding: '24px 32px', height: '100%', overflowY: 'auto',
          direction: 'rtl',
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: isArabic ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isArabic ? 20 : -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentActions.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4, paddingTop: '60px', gap: '16px' }}>
                  <span style={{ fontSize: '60px' }}>📝</span>
                  <p style={{ fontSize: '18px', color: '#78350f', fontFamily: 'Cairo', fontWeight: '600' }}>
                    {isArabic ? 'السبورة تنتظر سؤالك...' : 'Waiting for your question...'}
                  </p>
                  <p style={{ fontSize: '13px', color: '#a16207', fontFamily: 'Cairo' }}>
                    {isArabic ? 'يمكنك أيضاً الرسم مباشرة بالضغط على زر "ارسم"' : 'You can also draw directly by clicking "Draw"'}
                  </p>
                </div>
              ) : (
                currentActions.map((action, idx) => {
                  if (action.type === 'WRITE' || !action.type) {
                    return (
                      <AnimatedLine
                        key={`${currentSlide}-${idx}`}
                        text={action.content || ''}
                        color={COLORS[action.color] || COLORS.black}
                        size={action.size || (action.importance === 'high' ? 'title' : 'normal')}
                        delay={idx * 400}
                      />
                    );
                  }
                  if (action.type === 'DRAW') {
                    return (
                      <div key={`${currentSlide}-${idx}`} style={{ margin: '12px 0', padding: '8px', borderRadius: '8px', background: 'rgba(37,99,235,0.05)', border: '1px dashed #93c5fd', color: '#1d4ed8', fontSize: '13px', fontFamily: 'Cairo', direction: 'rtl' }}>
                        🖊️ شكل: {action.shape} {action.label ? `- ${action.label}` : ''}
                      </div>
                    );
                  }
                  return null;
                })
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* مؤشر الكتابة */}
      <AnimatePresence>
        {isWriting && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', bottom: '16px', right: '16px', zIndex: 20,
              background: 'white', borderRadius: '16px', padding: '10px 18px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid #bfdbfe',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i} animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, delay: i * 0.2, duration: 0.8 }}
                  style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb' }} />
              ))}
            </div>
            <span style={{ fontSize: '13px', fontFamily: 'Cairo', fontWeight: '600', color: '#1e40af' }}>
              {isArabic ? 'الأستاذ يكتب...' : 'Teacher is writing...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Whiteboard;
