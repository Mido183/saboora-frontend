import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// ألوان الطباشير (متوافقة مع التصميم)
// ============================================
const COLORS = {
  black: '#111827',
  blue: '#0066CC',
  red: '#CC0000',
  green: '#00AA00',
  purple: '#7c3aed',
};

// ============================================
// صوت القلم
// ============================================
const playPenSound = () => {
  if (Math.random() > 0.2) return; // 80% من الوقت
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 800 + Math.random() * 300;
    g.gain.setValueAtTime(0.03, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.05);
  } catch (_) {}
};

// ============================================
// مكوّن سطر متحرك - يكتب حرفاً بحرف
// ============================================
const AnimatedLine = ({ text, color = COLORS.black, size = 'normal', delay = 0, onWritingDone }) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const startTimer = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        // تذبذب بسيط بالحروف (محاكاة خط اليد)
        setDisplayed(text.slice(0, i));
        playPenSound();
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
          if (onWritingDone) onWritingDone();
        }
      }, 30 + Math.random() * 15); // 30ms per char
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(startTimer);
  }, [text, delay]);

  const styles = {
    title: { fontSize: '22px', fontWeight: '800', borderBottom: `2px solid ${color}44`, paddingBottom: '6px', marginBottom: '10px' },
    formula: { fontSize: '20px', fontWeight: '700', letterSpacing: '1px', fontFamily: "'Courier New', monospace" },
    normal: { fontSize: '16px', fontWeight: '500' },
  };

  return (
    <div style={{
      color,
      direction: 'rtl',
      textAlign: 'right',
      lineHeight: '2',
      minHeight: '1.8em',
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
      // تذبذب خفيف لمحاكاة الكتابة اليدوية
      transform: done ? 'translateX(0)' : `translateX(${(Math.random() - 0.5) * 0.5}px)`,
      transition: 'transform 0.1s',
      ...styles[size] || styles.normal,
    }}>
      {displayed}
      {!done && (
        <span style={{
          display: 'inline-block', width: '2px', height: '1em',
          background: color, marginRight: '2px',
          animation: 'blink 0.5s step-end infinite', verticalAlign: 'text-bottom'
        }} />
      )}
    </div>
  );
};

// ============================================
// مكوّن منطقة الرسم اليدوي
// ============================================
const DrawingCanvas = ({ isActive, color, isEraser, eraserSize = 24 }) => {
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
      return {
        x: (src.clientX - rect.left) * scaleX,
        y: (src.clientY - rect.top) * scaleY
      };
    };

    const start = (e) => {
      if (!isActive) return;
      e.preventDefault();
      drawing.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = eraserSize;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    const move = (e) => {
      if (!drawing.current || !isActive) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      playPenSound();
    };

    const stop = () => {
      drawing.current = false;
      ctx.globalCompositeOperation = 'source-over';
      ctx.closePath();
    };

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
  }, [isActive, color, isEraser, eraserSize]);

  return (
    <canvas
      ref={canvasRef}
      width={1200} height={700}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        zIndex: isActive ? 10 : 0,
        cursor: isEraser && isActive ? 'cell' : isActive ? 'crosshair' : 'default',
      }}
    />
  );
};

// ============================================
// تفسير أوامر السبورة
// ============================================
const parseActions = (whiteboardContent) => {
  if (!whiteboardContent) return [];
  try {
    const parsed = JSON.parse(whiteboardContent);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}

  // نص عادي → أوامر تلقائية
  const lines = whiteboardContent.split('\n').filter(l => l.trim());
  return lines.slice(0, 6).map(line => {
    const t = line.replace(/^[#*\-•]\s*/, '').trim();
    if (!t) return null;
    if (/القانون|Formula|=|÷|×/i.test(t)) return { type: 'WRITE', content: t, color: 'red', size: 'formula' };
    if (/الخطوة|Step|📝|✅/i.test(t)) return { type: 'WRITE', content: t, color: 'green' };
    if (t.includes('📌') || t.length < 35) return { type: 'WRITE', content: t, color: 'blue', importance: 'high' };
    return { type: 'WRITE', content: t, color: 'black' };
  }).filter(Boolean);
};

// ============================================
// المكوّن الرئيسي للسبورة
// ============================================
const Whiteboard = ({ aiContent, isWriting, whiteboardImage, educationType = 'arabic' }) => {
  const [slides, setSlides] = useState([[]]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [drawMode, setDrawMode] = useState(false);
  const [eraserMode, setEraserMode] = useState(false);
  const [markerColor, setMarkerColor] = useState(COLORS.blue);
  const [lastContentId, setLastContentId] = useState('');
  const [writingProgress, setWritingProgress] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [doneLines, setDoneLines] = useState(0);
  const boardRef = useRef(null);
  const isArabic = educationType === 'arabic';

  // استقبال محتوى جديد من AI
  useEffect(() => {
    if (!aiContent) return;
    const contentId = aiContent.substring(0, 80);
    if (contentId === lastContentId) return;
    setLastContentId(contentId);

    const actions = parseActions(aiContent);
    if (actions.length === 0) return;

    const writeActions = actions.filter(a => a.type === 'WRITE');
    setTotalLines(writeActions.length);
    setDoneLines(0);
    setWritingProgress(0);

    setSlides(prev => {
      const newSlides = [...prev, actions];
      setTimeout(() => setCurrentSlide(newSlides.length - 1), 100);
      return newSlides;
    });
  }, [aiContent]);

  // تحديث شريط التقدم
  const handleLineDone = useCallback(() => {
    setDoneLines(d => {
      const newDone = d + 1;
      setWritingProgress(Math.round((newDone / Math.max(totalLines, 1)) * 100));
      return newDone;
    });
  }, [totalLines]);

  // حفظ السبورة كـ PNG
  const saveBoard = () => {
    if (!boardRef.current) return;
    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(boardRef.current).then(canvas => {
        const link = document.createElement('a');
        link.download = `saboora-board-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      });
    }).catch(() => {
      alert('لتفعيل ميزة الحفظ، شغّل: npm install html2canvas');
    });
  };

  const currentActions = slides[currentSlide] || [];
  const writeActions = currentActions.filter(a => a.type === 'WRITE');
  const stickerAction = currentActions.find(a => a.type === 'STICKER');

  // الصورة التوضيحية: من وسيط API أو من STICKER في الأوامر
  const displayImage = whiteboardImage || (stickerAction ? {
    url: `https://image.pollinations.ai/prompt/${encodeURIComponent(stickerAction.query + ' educational diagram')}?width=300&height=200&nologo=true`,
    description: stickerAction.caption || '',
    attribution: 'AI Generated'
  } : null);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fefce8', borderRadius: '12px', overflow: 'hidden', fontFamily: "'Cairo', sans-serif" }}>

      {/* شريط الأدوات */}
      <div style={{
        height: '56px', minHeight: '56px',
        background: 'linear-gradient(135deg, #78350f, #92400e)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', boxShadow: '0 3px 10px rgba(0,0,0,0.25)', zIndex: 5, flexShrink: 0,
      }}>
        {/* العنوان */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
          <span style={{ fontSize: '20px' }}>{isWriting ? '✏️' : '📋'}</span>
          <span style={{ fontWeight: '700', fontSize: '14px', fontFamily: 'Cairo' }}>
            {isArabic ? 'السبورة التفاعلية' : 'Interactive Board'}
          </span>
          {isWriting && (
            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px', fontFamily: 'Cairo' }}>
              الأستاذ يكتب...
            </span>
          )}
        </div>

        {/* شريط التقدم - وسط */}
        {isWriting && totalLines > 0 && (
          <div style={{ flex: 1, maxWidth: '200px', margin: '0 16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${writingProgress}%` }}
                style={{ height: '100%', background: 'white', borderRadius: '10px' }}
              />
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '10px', textAlign: 'center', marginTop: '2px' }}>
              {writingProgress}%
            </div>
          </div>
        )}

        {/* أزرار التحكم */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* الشرائح */}
          {slides.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '16px', padding: '3px 8px', marginLeft: '6px' }}>
              <button onClick={() => setCurrentSlide(i => Math.max(0, i - 1))} disabled={currentSlide === 0}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px', opacity: currentSlide === 0 ? 0.3 : 1 }}>◀</button>
              <span style={{ color: 'white', fontSize: '11px', fontFamily: 'Cairo', minWidth: '40px', textAlign: 'center' }}>
                {currentSlide + 1} / {slides.length}
              </span>
              <button onClick={() => setCurrentSlide(i => Math.min(slides.length - 1, i + 1))} disabled={currentSlide === slides.length - 1}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px', opacity: currentSlide === slides.length - 1 ? 0.3 : 1 }}>▶</button>
            </div>
          )}

          {/* ألوان أقلام */}
          {[['blue', COLORS.blue], ['red', COLORS.red], ['green', COLORS.green], ['black', COLORS.black]].map(([n, hex]) => (
            <button key={n}
              onClick={() => { setMarkerColor(hex); setDrawMode(true); setEraserMode(false); }}
              style={{
                width: '18px', height: '18px', borderRadius: '50%', background: hex,
                border: markerColor === hex && drawMode && !eraserMode ? '3px solid white' : '2px solid rgba(255,255,255,0.3)',
                cursor: 'pointer', flexShrink: 0,
              }} />
          ))}

          {/* قلم */}
          <button onClick={() => { setDrawMode(d => !d); setEraserMode(false); }}
            title="قلم / ماوس"
            style={{ background: drawMode && !eraserMode ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontFamily: 'Cairo' }}>
            ✏️
          </button>

          {/* ممحاة */}
          <button onClick={() => { setEraserMode(e => !e); setDrawMode(true); }}
            title="ممحاة"
            style={{ background: eraserMode ? 'rgba(255,200,200,0.4)' : 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>
            🧹
          </button>

          {/* مسح */}
          <button onClick={() => setSlides(prev => { const u = [...prev]; u[currentSlide] = []; return u; })}
            title="مسح السبورة"
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>
            🗑️
          </button>

          {/* حفظ */}
          <button onClick={saveBoard}
            title="حفظ كصورة"
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>
            💾
          </button>
        </div>
      </div>

      {/* منطقة المحتوى */}
      <div ref={boardRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* خطوط السبورة */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 39px, #d4c59633 39px, #d4c59633 40px)',
          backgroundSize: '100% 40px', backgroundPositionY: '20px',
        }} />

        {/* كانفاس الرسم */}
        <DrawingCanvas isActive={drawMode} color={markerColor} isEraser={eraserMode} />

        {/* الصورة التوضيحية (أعلى اليمين) */}
        {displayImage && currentActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              position: 'absolute', top: '16px', left: '16px', zIndex: 6,
              width: '190px',
              background: 'white',
              borderRadius: '12px',
              border: '3px solid #92400e',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              overflow: 'hidden',
            }}
          >
            <img
              src={displayImage.url}
              alt={displayImage.description}
              style={{ width: '100%', height: '130px', objectFit: 'cover', display: 'block' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div style={{ padding: '6px 8px', background: '#fef3c7' }}>
              <div style={{ fontSize: '11px', color: '#78350f', fontWeight: '700', textAlign: 'center', fontFamily: 'Cairo' }}>
                🖼️ صورة توضيحية
              </div>
              {displayImage.attribution && displayImage.attribution !== 'AI Generated' && (
                <div style={{ fontSize: '9px', color: '#a16207', textAlign: 'center', marginTop: '2px' }}>
                  {displayImage.attribution}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* محتوى الشرح */}
        <div style={{
          position: 'relative', zIndex: drawMode ? 0 : 5,
          padding: '20px 24px 20px', paddingLeft: displayImage ? '220px' : '24px',
          height: '100%', overflowY: 'auto', direction: 'rtl',
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {currentActions.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', opacity: 0.45, gap: '10px' }}>
                  <span style={{ fontSize: '52px' }}>📝</span>
                  <p style={{ fontSize: '17px', color: '#78350f', fontFamily: 'Cairo', fontWeight: '700' }}>
                    {isArabic ? 'السبورة تنتظر سؤالك...' : 'Ask me something!'}
                  </p>
                  <p style={{ fontSize: '13px', color: '#a16207', fontFamily: 'Cairo' }}>
                    {isArabic ? 'سأكتب الملخص والقوانين هنا بعد شرحك في الشات' : 'Summary and formulas will appear here'}
                  </p>
                </div>
              ) : (
                <>
                  {writeActions.map((action, idx) => (
                    <AnimatedLine
                      key={`${currentSlide}-${idx}`}
                      text={action.content || ''}
                      color={COLORS[action.color] || COLORS.black}
                      size={action.importance === 'high' ? 'title' : (action.size || 'normal')}
                      delay={idx * 400}
                      onWritingDone={handleLineDone}
                    />
                  ))}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* شريط التقدم السفلي */}
      {isWriting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            height: '4px', background: '#e2d5b0', flexShrink: 0,
          }}
        >
          <motion.div
            animate={{ width: `${writingProgress}%` }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #2563eb, #7c3aed)', borderRadius: '2px' }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      )}
    </div>
  );
};

export default Whiteboard;
