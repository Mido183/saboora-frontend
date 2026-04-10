// ============================================
// Saboora Backend - نظام الذكاء المزدوج المحسّن
// ============================================

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// ============================================
// Configuration
// ============================================

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'saboora-secret-key';

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ============================================
// PROMPTS - المنطق الجوهري للتدريس
// ============================================

function createChatSystemPrompt(educationType, gradeLevel) {
  const gradeName = {
    sec3: 'الثانوية العامة', sec2: 'الثاني الثانوي', sec1: 'الأول الثانوي',
    prep3: 'الثالث الإعدادي', prep2: 'الثاني الإعدادي', prep1: 'الأول الإعدادي',
    primary6: 'السادس الابتدائي', primary5: 'الخامس الابتدائي', primary4: 'الرابع الابتدائي',
    grade12: 'Grade 12', grade11: 'Grade 11', grade10: 'Grade 10 (IGCSE/A-Level)',
    grade9: 'Grade 9', grade8: 'Grade 8', grade7: 'Grade 7',
  }[gradeLevel] || gradeLevel;

  const isArabic = educationType === 'arabic';

  return `أنت مدرس خصوصي متميز (Saboora AI) متخصص في تعليم طلاب المرحلة ${gradeName}.

مهمتك: الشرح التفصيلي الكامل في رسالة الشات.

📌 قواعد الشرح:
1. ابدأ بمقدمة بسيطة تربط الموضوع بحياة الطالب
2. اشرح الخطوات بالتفصيل الكامل مع الأسباب
3. أعطِ مثالاً عملياً محلولاً بالكامل
4. اذكر النقاط الهامة والأخطاء الشائعة
5. انتهِ بسؤال للتحقق من الفهم

📌 أسلوب الكتابة:
- استخدم ${isArabic ? 'العربية الواضحة' : 'العربية للشرح والإنجليزية للمصطلحات العلمية'}
- الكتابة ودودة ومحفزة
- استخدم المعادلات بشكل واضح
- لا تكن مقتضباً - الطالب يحتاج لفهم كامل

لا تكتب "السبورة" أو محتواها، ذلك سيحدث تلقائياً.`;
}

function createWhiteboardSystemPrompt(educationType, gradeLevel) {
  return `أنت مدرس يكتب على السبورة. قاعدة صارمة: 3-6 أسطر فقط.

أعط ردك بالتنسيق التالي فقط (JSON صارم):
{
  "board_actions": [
    { "type": "WRITE", "content": "📌 عنوان الموضوع", "color": "blue", "importance": "high" },
    { "type": "WRITE", "content": "القانون أو المعادلة = ...", "color": "red", "size": "formula" },
    { "type": "STICKER", "query": "كلمات بحث إنجليزية للصورة التوضيحية", "caption": "وصف الصورة بالعربية" },
    { "type": "WRITE", "content": "الخطوة 1: ...", "color": "green" },
    { "type": "WRITE", "content": "✅ الإجابة النهائية: ...", "color": "red" }
  ]
}

قواعد الألوان:
- blue: العناوين والقوانين الأساسية
- red: الإجابات والنتائج والمعادلات
- green: الخطوات والملاحظات

قاعدة STICKER: أضف صورة واحدة فقط إذا كان الموضوع مرئياً (رياضيات/علوم/فيزياء). query يكون بالإنجليزية فقط.

لا تزيد board_actions عن 6 عناصر. لا تكتب أي نص خارج الـ JSON.`;
}

function generateImageQuery(userMessage) {
  return `أنت نظام بحث عن صور. استخرج من السؤال التالي كلمات بحث بالإنجليزية فقط (3 كلمات كحد أقصى).

السؤال: "${userMessage}"

أمثلة:
- "احسب مساحة المثلث" → "triangle geometry diagram"  
- "شرح الذرة" → "atom structure diagram"
- "قانون نيوتن" → "newton law physics"

اكتب كلمات البحث فقط، بدون أي نص آخر.`;
}

// ============================================
// AI Provider: Groq (Primary)
// ============================================

async function callGroqWithPrompt(messages, maxTokens = 2000) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq failed: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ============================================
// AI Provider: Gemini (Fallback)
// ============================================

async function callGeminiWithPrompt(systemPrompt, userMessage, fileData = null) {
  const parts = [{ text: `${systemPrompt}\n\nالسؤال: ${userMessage}` }];

  if (fileData && fileData.data) {
    const base64Content = fileData.data.split(',')[1];
    parts.push({
      inline_data: {
        mime_type: fileData.type || "image/jpeg",
        data: base64Content
      }
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] })
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini failed: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// ============================================
// Dual AI Call (Chat + Whiteboard) in Parallel
// ============================================

async function getDualAIResponse(userMessage, educationType, gradeLevel, fileData = null) {
  const chatPrompt = createChatSystemPrompt(educationType, gradeLevel);
  const boardPrompt = createWhiteboardSystemPrompt(educationType, gradeLevel);

  console.log('🤖 Starting dual AI calls in parallel...');

  // استدعاء الـ AI للشات والسبورة بالتوازي
  const [chatResult, boardResult] = await Promise.allSettled([
    // Chat AI
    (async () => {
      if (process.env.GROQ_API_KEY) {
        return await callGroqWithPrompt([
          { role: 'system', content: chatPrompt },
          { role: 'user', content: fileData ? `${userMessage}\n[الطالب أرفق صورة/ملف]` : userMessage }
        ], 2000);
      } else if (process.env.GEMINI_API_KEY) {
        return await callGeminiWithPrompt(chatPrompt, userMessage, fileData);
      }
      throw new Error('No chat AI provider');
    })(),

    // Whiteboard AI (أسرع - رد مختصر)
    (async () => {
      if (process.env.GROQ_API_KEY) {
        return await callGroqWithPrompt([
          { role: 'system', content: boardPrompt },
          { role: 'user', content: userMessage }
        ], 600);
      } else if (process.env.GEMINI_API_KEY) {
        return await callGeminiWithPrompt(boardPrompt, userMessage);
      }
      throw new Error('No board AI provider');
    })()
  ]);

  // معالجة نتيجة الشات
  let chatResponse = '';
  if (chatResult.status === 'fulfilled') {
    chatResponse = chatResult.value;
    console.log('✅ Chat AI: Success');
  } else {
    console.error('❌ Chat AI failed:', chatResult.reason);
    chatResponse = 'عذراً، حدث خطأ في الاتصال. الرجاء المحاولة مرة أخرى.';
  }

  // معالجة نتيجة السبورة
  let boardActions = [];
  if (boardResult.status === 'fulfilled') {
    console.log('✅ Board AI: Success');
    boardActions = parseBoardActions(boardResult.value, userMessage);
  } else {
    console.error('❌ Board AI failed:', boardResult.reason);
    // Fallback: استخرج من رد الشات
    boardActions = autoGenerateBoardActions(chatResponse, userMessage);
  }

  return { chatResponse, boardActions };
}

// ============================================
// Parse Board Actions from AI response
// ============================================

function parseBoardActions(rawResponse, userMessage) {
  try {
    // تنظيف markdown code blocks
    const cleaned = rawResponse
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      if (data.board_actions && Array.isArray(data.board_actions) && data.board_actions.length > 0) {
        console.log(`📋 Board: ${data.board_actions.length} actions parsed from JSON`);
        return data.board_actions;
      }
    }
  } catch (e) {
    console.log('⚠️ Board JSON parse failed, using auto-generator');
  }

  return autoGenerateBoardActions(rawResponse, userMessage);
}

// توليد أوامر سبورة تلقائياً من نص عادي
function autoGenerateBoardActions(text, userMessage) {
  const lines = text.split('\n').filter(l => l.trim().length > 3);
  const actions = [];

  // عنوان من السؤال
  const topic = userMessage.length < 40 ? userMessage : userMessage.substring(0, 40) + '...';
  actions.push({ type: 'WRITE', content: `📌 ${topic}`, color: 'blue', importance: 'high' });

  // استخراج أهم 4 أسطر
  lines.slice(0, 5).forEach(line => {
    const t = line.replace(/^[#*\-•\d.]\s*/, '').trim();
    if (!t || t.length < 3) return;

    if (/[=×÷²³]|القانون|Answer|Formula|Result/i.test(t)) {
      actions.push({ type: 'WRITE', content: t, color: 'red', size: 'formula' });
    } else if (/الخطوة|Step|خط|أولاً|ثانياً|ثالثاً/i.test(t)) {
      actions.push({ type: 'WRITE', content: t, color: 'green' });
    } else {
      actions.push({ type: 'WRITE', content: t, color: 'black' });
    }
  });

  return actions;
}

// ============================================
// Image Search via Unsplash
// ============================================

async function searchImage(query) {
  if (!process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY === 'your-unsplash-key') {
    // fallback: استخدام Pollinations AI كصديل مجاني
    return {
      url: `https://image.pollinations.ai/prompt/${encodeURIComponent(query + ' educational diagram white background')}?width=400&height=300&nologo=true&seed=${Date.now()}`,
      description: query,
      attribution: 'AI Generated'
    };
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
    );
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const img = data.results[0];
      return {
        url: img.urls.regular,
        description: img.alt_description || query,
        attribution: `Photo by ${img.user.name} on Unsplash`
      };
    }
  } catch (e) {
    console.log('Unsplash failed, using Pollinations');
  }

  return {
    url: `https://image.pollinations.ai/prompt/${encodeURIComponent(query + ' educational diagram')}?width=400&height=300&nologo=true`,
    description: query,
    attribution: 'AI Generated'
  };
}

// ============================================
// Auth Middleware
// ============================================

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token || token === 'null' || token === 'undefined') {
    req.user = { id: 'guest', email: 'guest@saboora.ai' };
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    req.user = err ? { id: 'guest', email: 'guest@saboora.ai' } : user;
    next();
  });
};

// ============================================
// Routes
// ============================================

app.get('/', (req, res) => {
  res.json({ message: 'Saboora AI Backend is running! 🎓', port: PORT });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    env: {
      groq: !!process.env.GROQ_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      unsplash: !!(process.env.UNSPLASH_ACCESS_KEY && process.env.UNSPLASH_ACCESS_KEY !== 'your-unsplash-key'),
      supabase: !!process.env.SUPABASE_URL
    }
  });
});

// ============================================
// Main Chat Endpoint
// ============================================

app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    console.log('\n📨 New Chat Request from:', req.user?.email);

    const {
      message,
      educationType = 'arabic',
      gradeLevel = 'sec3',
      file = null
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. استدعاء نظام الذكاء المزدوج
    const { chatResponse, boardActions } = await getDualAIResponse(
      message, educationType, gradeLevel, file
    );

    // 2. البحث عن صور توضيحية
    let whiteboardImage = null;
    const stickerAction = boardActions.find(a => a.type === 'STICKER');

    if (stickerAction?.query) {
      console.log('🖼️ Searching for image:', stickerAction.query);
      whiteboardImage = await searchImage(stickerAction.query);
    } else {
      // توليد تلقائي لاستعلام الصورة
      try {
        let imgQuery = message.length < 50 ? message : message.substring(0, 50);
        // تبسيط الاستعلام للإنجليزية
        const queryMap = {
          'مثلث': 'triangle geometry', 'دائرة': 'circle geometry', 'مربع': 'square geometry',
          'ذرة': 'atom structure diagram', 'خلية': 'cell biology diagram',
          'نيوتن': 'newton physics law', 'كيمياء': 'chemistry lab',
          'فيزياء': 'physics diagram', 'رياضيات': 'mathematics'
        };
        for (const [ar, en] of Object.entries(queryMap)) {
          if (message.includes(ar)) { imgQuery = en; break; }
        }
        if (/[\u0600-\u06FF]/.test(imgQuery)) {
          imgQuery = 'educational diagram science'; // fallback عربي
        }
        whiteboardImage = await searchImage(imgQuery);
      } catch (e) {
        console.log('Image search failed:', e.message);
      }
    }

    // 3. حفظ في Supabase
    const userEmail = req.user?.email || 'guest';
    try {
      await supabase.from('messages').insert([
        { user_email: userEmail, sender: 'user', content: message, grade_level: gradeLevel },
        { user_email: userEmail, sender: 'assistant', content: chatResponse, grade_level: gradeLevel }
      ]);
    } catch (dbErr) {
      console.log('⚠️ DB save failed (non-critical):', dbErr.message);
    }

    console.log('✅ Dual response ready!');

    res.json({
      success: true,
      chatResponse,
      whiteboardContent: JSON.stringify(boardActions),
      whiteboardImage
    });

  } catch (error) {
    console.error('❌ Chat Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check API keys and server logs'
    });
  }
});

// ============================================
// Auth Routes
// ============================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, educationType = 'arabic' } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields required' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, password_hash: hashedPassword, education_type: educationType }])
      .select().single();

    if (error) return res.status(400).json({ error: 'Email already exists' });

    const token = jwt.sign({ id: data.id, email: data.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: data.id, name: data.name, email: data.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !data) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, data.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: data.id, email: data.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: data.id, name: data.name, email: data.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log('\n==================================================');
  console.log('🚀 Saboora Dual-AI Backend Started!');
  console.log('==================================================');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log('\n🔧 Configuration:');
  console.log(`  ${process.env.GROQ_API_KEY ? '✅' : '❌'} Groq API (Chat + Board)`);
  console.log(`  ${process.env.GEMINI_API_KEY ? '✅' : '❌'} Gemini API (Fallback)`);
  console.log(`  ${process.env.UNSPLASH_ACCESS_KEY && process.env.UNSPLASH_ACCESS_KEY !== 'your-unsplash-key' ? '✅' : '⚡'} Unsplash (${process.env.UNSPLASH_ACCESS_KEY ? 'configured' : 'using Pollinations fallback'})`);
  console.log(`  ${process.env.SUPABASE_URL ? '✅' : '❌'} Supabase`);
  console.log('\n📝 Endpoints:');
  console.log('  GET  /health       - Health check');
  console.log('  POST /api/chat     - Dual AI chat + board');
  console.log('  POST /api/auth/register');
  console.log('  POST /api/auth/login');
  console.log('==================================================\n');
});
