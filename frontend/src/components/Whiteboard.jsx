import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ====================================================
// ألوان الطباشير - غيرها هنا لتغيير ألوان السبورة
// ====================================================
const CHALK_COLORS = {
  black:  '#1a1a2e',  // لون العناوين والنص العام
  blue:   '#1d4ed8',  // لون القوانين والمعادلات
  red:    '#dc2626',  // لون الإجابات والنتائج
  green:  '#16a34a',  // لون الملاحظات والتنبيهات
};

// ====================================================
// دالة تحليل المحتوى وتقطيعه إلى شرائح منطقية
// ====================================================
function parseContentToSlides(content) {
  if (!content) return [];
  const slideSeparators = /(?=##\s)/g;
  const rawSections = content.split(slideSeparators).filter(s => s.trim());

  if (rawSections.length <= 1) {
    // إذا لم يكن هناك تقسيم واضح، نقسم على 8 أسطر لكل شريحة
    const lines = content.split('\n').filter(l => l.trim());
    const slides = [];
    for (let i = 0; i < lines.length; i += 7) {
      slides.push(lines.slice(i, i + 7).join('\n'));
    }
    return slides.length > 0 ? slides : [content];
  }

  return rawSections;
}

// ====================================================
// تحديد لون النص بناءً على محتواه
// ====================================================
function getLineColor(line) {
  const lowerLine = line.toLowerCase();
  if (
    line.startsWith('##') ||
    line.includes('قانون') || line.includes('Formula') ||
    line.includes('القانون') || line.includes('معادلة')
  ) return CHALK_COLORS.blue;

  if (
    line.includes('الإجابة') || line.includes('الجواب') ||
    line.includes('Answer') || line.includes('النتيجة') ||
    line.includes('إذن') || line.includes('∴')
  ) return CHALK_COLORS.red;

  if (
    line.includes('ملاحظة') || line.includes('Note') ||
    line.includes('تذكر') || line.includes('⚠️') ||
    line.includes('💡')
  ) return CHALK_COLORS.green;

  return CHALK_COLORS.black;
}

// ====================================================
// المكوّن الرئيسي للسبورة
// ====================================================
const Whiteboard = ({ aiContent, isWriting, educationType = 'arabic' }) => {
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [visibleLines, setVisibleLines] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef(null);

  // تقسيم المحتوى إلى شرائح عند تغيير المحتوى
  useEffect(() => {
    if (!aiContent) return;
    const parsed = parseContentToSlides(aiContent);
    setSlides(parsed);
    setCurrentSlide(0);
    setVisibleLines([]);
  }, [aiContent]);

  // تشغيل أنيميشن الكتابة عند تغيير الشريحة
  useEffect(() => {
    if (slides.length === 0) return;
    const currentContent = slides[currentSlide];
    if (!currentContent) return;

    // إلغاء أي أنيميشن سابق
    if (animationRef.current) clearTimeout(animationRef.current);
    setVisibleLines([]);
    setIsAnimating(true);

    const lines = currentContent
      .split('\n')
      .filter(l => l.trim())
      .map(line => ({
        text: line.trim(),
        color: getLineColor(line),
        isTitle: line.startsWith('##'),
        isBold: line.startsWith('**') || line.startsWith('#'),
      }));

    let i = 0;
    const addNextLine = () => {
      if (i < lines.length) {
        const currentLine = lines[i];
        setVisibleLines(prev => [...prev, currentLine]);
        i++;
        const delay = currentLine.isTitle ? 600 : 350;
        animationRef.current = setTimeout(addNextLine, delay);
      } else {
        setIsAnimating(false);
      }
    };
    animationRef.current = setTimeout(addNextLine, 200);

    return () => { if (animationRef.current) clearTimeout(animationRef.current); };
  }, [slides, currentSlide]);

  const goToSlide = (index) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
    }
  };

  // تنسيق النص: إزالة الماركداون البسيط وتنظيفه
  const formatText = (text) => {
    return text
      .replace(/^#{1,3}\s*/, '')   // إزالة ## من العناوين
      .replace(/\*\*/g, '')        // إزالة **Bold**
      .replace(/^\d+\.\s*/, match => match) // الحفاظ على الأرقام
      .trim();
  };

  return (
    <div className="relative w-full h-full flex flex-col rounded-xl overflow-hidden shadow-xl"
      style={{ background: 'var(--color-whiteboard-bg, #fffdf5)' }}>

      {/* ============ Header شريط العنوان ============ */}
      <div className="whiteboard-header flex items-center justify-between px-5 py-3 shrink-0">
        <div className="text-white font-bold text-lg flex items-center gap-2"
          style={{ fontFamily: 'Cairo, sans-serif' }}>
          <span className="text-2xl">✏️</span>
          <span>السبورة</span>
          {isAnimating && (
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full animate-pulse">
              يكتب...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* مؤشر الشريحة */}
          {slides.length > 1 && (
            <span className="text-white/80 text-sm" style={{ fontFamily: 'Cairo, sans-serif' }}>
              شريحة {currentSlide + 1} / {slides.length}
            </span>
          )}

          {/* أزرار */}
          <button
            onClick={() => { setVisibleLines([]); setSlides([]); setIsAnimating(false); }}
            className="px-3 py-1 bg-red-500/80 hover:bg-red-600 text-white rounded text-sm transition-colors"
            title="مسح السبورة"
          >
            🗑️ مسح
          </button>
        </div>
      </div>

      {/* ============ منطقة المحتوى الرئيسية ============ */}
      <div className="flex-1 flex overflow-hidden">

        {/* شريط الشرائح الجانبي */}
        {slides.length > 1 && (
          <div className="w-20 shrink-0 bg-gray-100 border-l border-gray-200 flex flex-col gap-2 p-2 overflow-y-auto">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-full aspect-video rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all
                  ${currentSlide === index
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                    : 'border-gray-300 bg-white text-gray-500 hover:border-blue-300'
                  }`}
                style={{ fontFamily: 'Cairo, sans-serif' }}
              >
                {index + 1}
              </button>
            ))}
          </div>
        )}

        {/* منطقة الكتابة */}
        <div className="flex-1 overflow-y-auto p-8 relative"
          style={{
            backgroundImage: `repeating-linear-gradient(transparent, transparent 39px, #e5e0d0 39px, #e5e0d0 40px)`,
            backgroundPositionY: '8px',
          }}>

          {/* حالة فارغة */}
          {slides.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <div className="text-7xl mb-4">📋</div>
              <p className="text-xl" style={{ fontFamily: 'Cairo, sans-serif' }}>
                ابدأ المحادثة وسيظهر الشرح هنا
              </p>
              <p className="text-sm mt-2" style={{ fontFamily: 'Cairo, sans-serif' }}>
                سيقوم المدرس بكتابة أهم النقاط على السبورة
              </p>
            </div>
          )}

          {/* الأسطر بالأنيميشن */}
          <div className="max-w-3xl mx-auto" dir="rtl">
            <AnimatePresence>
              {visibleLines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="writing-line mb-1"
                  style={{
                    color: line.color,
                    fontFamily: line.isTitle ? "'Cairo', sans-serif" : "'Cairo', 'Tajawal', sans-serif",
                    fontSize: line.isTitle ? '26px' : '20px',
                    fontWeight: line.isTitle ? '700' : '400',
                    lineHeight: '40px',
                    letterSpacing: '0.3px',
                    textDecoration: line.isTitle ? 'underline' : 'none',
                    textUnderlineOffset: '4px',
                    paddingBottom: line.isTitle ? '4px' : '0',
                    marginTop: line.isTitle ? '12px' : '0',
                  }}
                >
                  {/* أيقونة للعناوين */}
                  {line.isTitle && <span className="ml-2">📌</span>}
                  {formatText(line.text)}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ============ أزرار التنقل بين الشرائح ============ */}
      {slides.length > 1 && (
        <div className="shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-center gap-4">
          <button
            onClick={() => goToSlide(currentSlide - 1)}
            disabled={currentSlide === 0}
            className="px-5 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm text-sm"
            style={{ fontFamily: 'Cairo, sans-serif' }}
          >
            ◀ السابق
          </button>

          {/* دوائر التنقل */}
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`w-3 h-3 rounded-full transition-all ${
                  i === currentSlide ? 'bg-blue-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => goToSlide(currentSlide + 1)}
            disabled={currentSlide === slides.length - 1}
            className="px-5 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm text-sm"
            style={{ fontFamily: 'Cairo, sans-serif' }}
          >
            التالي ▶
          </button>
        </div>
      )}
    </div>
  );
};

export default Whiteboard;
