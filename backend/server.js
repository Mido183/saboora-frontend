// ============================================
// Saboora Backend - نسخة محسّنة مع 3 AI Providers
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

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

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
// AI Providers Integration
// ============================================

// 1️⃣ Groq API (Primary - Free!)
async function callGroqAPI(userMessage, educationType = 'arabic', gradeLevel = 'sec3') {
  console.log('🚀 Trying Groq API...');
  
  try {
    const systemPrompt = createSystemPrompt(educationType, gradeLevel);
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Groq API Error:', response.status, errorText);
      throw new Error(`Groq API failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Groq API Success!');
    return data.choices[0].message.content;

  } catch (error) {
    console.error('❌ Groq Error:', error.message);
    throw error;
  }
}

// 2️⃣ Gemini API (Fallback #1)
async function callGeminiAPI(userMessage, educationType = 'arabic', gradeLevel = 'sec3') {
  console.log('🚀 Trying Gemini API...');
  
  try {
    const systemPrompt = createSystemPrompt(educationType, gradeLevel);
    const fullPrompt = `${systemPrompt}\n\nالسؤال: ${userMessage}`;
    
    // Using gemini-1.5-flash-latest for better compatibility
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: fullPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', response.status, errorText);
      throw new Error(`Gemini API failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('Gemini: No response generated');
    }
    
    console.log('✅ Gemini API Success!');
    return data.candidates[0].content.parts[0].text;

  } catch (error) {
    console.error('❌ Gemini Error:', error.message);
    throw error;
  }
}

// 3️⃣ BlackBox API (Fallback #2)
async function callBlackBoxAPI(userMessage, educationType = 'arabic', gradeLevel = 'sec3') {
  console.log('🚀 Trying BlackBox API...');
  
  try {
    const systemPrompt = createSystemPrompt(educationType, gradeLevel);
    
    const response = await fetch('https://api.blackbox.ai/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BLACKBOX_API_KEY}`
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        model: 'blackbox',
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ BlackBox API Error:', response.status, errorText);
      throw new Error(`BlackBox API failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ BlackBox API Success!');
    return data.response || data.message || data.choices?.[0]?.message?.content;

  } catch (error) {
    console.error('❌ BlackBox Error:', error.message);
    throw error;
  }
}

// ============================================
// System Prompt Generator
// ============================================

function createSystemPrompt(educationType, gradeLevel = 'sec3') {
  const isArabic = educationType === 'arabic';

  const gradeName = {
    sec3: 'الثانوية العامة', sec2: 'الثاني الثانوي', sec1: 'الأول الثانوي',
    prep3: 'الثالث الإعدادي', prep2: 'الثاني الإعدادي', prep1: 'الأول الإعدادي',
    primary6: 'السادس الابتدائي', primary5: 'الخامس الابتدائي', primary4: 'الرابع الابتدائي',
    grade12: 'Grade 12 (A-Level/IGCSE)', grade11: 'Grade 11', grade10: 'Grade 10',
    grade9: 'Grade 9', grade8: 'Grade 8', grade7: 'Grade 7',
    grade6: 'Grade 6', grade5: 'Grade 5', grade4: 'Grade 4',
  }[gradeLevel] || gradeLevel;

  if (isArabic) {
    return `أنت "سبورة AI"، مدرس خاص محترف ومتخصص في الرياضيات والفيزياء والكيمياء للمنهج المصري.

📌 الطالب: صف ${gradeName} - تعليم عربي

🎯 أسلوب التدريس (مهم جداً):
- لا تقدّم كل المعلومات دفعة واحدة
- مهّد للطالب أولاً بسؤال أو ربط بمعلومة يعرفها
- اشرح جزءاً واحداً صغيراً في كل مرة
- في نهاية كل رد، اسأل الطالب: "هل فهمت هذه الخطوة؟ أم تريد أشرح بطريقة تانية؟"
- إذا قال الطالب "لم أفهم" أو "مش فاهم"، اشرح بمثال مختلف وبسيط جداً

📋 تنسيق الرد الإلزامي (لا تخرج عن هذا التنسيق أبداً):
يجب أن يحتوي ردك على جزأين منفصلين:

الجزء الأول (شرح الشات):
اشرح بالتفصيل في الشات بأسلوب عربي سهل ومفهوم.
استخدم الأمثلة والخطوات الواضحة.
الهدف: الطالب يفهم الشرح من النص.

---WHITEBOARD---
الجزء الثاني (السبورة):
هذا الجزء يُكتب على السبورة مثل مدرس حقيقي.
- اكتب فقط النقاط الأساسية
- استخدم تنسيق ## للعناوين الرئيسية
- اكتب القانون بالعربي باللون الأزرق (ابدأ السطر بـ ##)
- اكتب الإجابة النهائية بوضوح (ابدأ بـ ## الإجابة)
- ملاحظات مهمة (ابدأ بـ ملاحظة:)
- يجب أن يكون مختصراً ومختلفاً عن شرح الشات
- وكأنك تكتب على سبورة حقيقية أمام الطالب
- لا تكتب أكثر من 10-12 سطراً بالمجمل

مثال على تنسيق السبورة:
## قانون الحركة
القوة = الكتلة × التسارع
F = m × a

## الخطوات
1. نحدد المعطيات من المسألة
2. نطبق القانون مباشرة
3. نحسب القيمة المطلوبة

## الإجابة
القوة = 10 × 5 = 50 نيوتن

ملاحظة: القوة دايماً في اتجاه التسارع`;
  } else {
    return `You are "Saboora AI", a professional private tutor specializing in Math, Physics, and Chemistry.

📌 Student Level: ${gradeName} - English curriculum (Language School / International)

🎯 Teaching Style (Very Important):
- Do NOT dump all information at once
- Start with a warm-up question or connect to prior knowledge
- Explain one small concept at a time
- End every response by asking: "Did you understand this step? Or would you like me to explain it differently?"
- If student says "I don't understand", use a completely different simpler example

📋 Mandatory Response Format:
Your response MUST have TWO separate parts:

Part 1 (Chat explanation):
Give a detailed, step-by-step explanation in clear English.
Use examples and analogies appropriate for the student's grade level.
Goal: The student fully understands from reading the chat.

---WHITEBOARD---
Part 2 (Whiteboard):
Write this like a real teacher on a physical whiteboard.
- Only key points and formulas
- Use ## for main titles/headings
- Write the formula clearly (start line with ##)
- Write the final answer clearly (start with ## Final Answer)
- Important notes (start with Note:)
- Must be SHORT and DIFFERENT from the chat explanation
- Maximum 10-12 lines total

Example whiteboard format:
## Newton's Second Law
Force = Mass × Acceleration
F = m × a

## Steps
1. Identify given values
2. Apply the formula
3. Calculate the result

## Final Answer
F = 10 × 5 = 50 N

Note: Force is always in the direction of acceleration`;
  }
}


// ============================================
// AI Router (with Fallback Chain)
// ============================================

async function getAIResponse(userMessage, educationType = 'arabic', gradeLevel = 'sec3') {
  const providers = [
    { name: 'Groq', fn: (msg, edu) => callGroqAPI(msg, edu, gradeLevel), enabled: !!process.env.GROQ_API_KEY },
    { name: 'Gemini', fn: (msg, edu) => callGeminiAPI(msg, edu, gradeLevel), enabled: !!process.env.GEMINI_API_KEY },
    { name: 'BlackBox', fn: (msg, edu) => callBlackBoxAPI(msg, edu, gradeLevel), enabled: !!process.env.BLACKBOX_API_KEY }
  ];
  
  console.log('\n🤖 AI Provider Status:');
  providers.forEach(p => {
    console.log(`  ${p.enabled ? '✅' : '❌'} ${p.name}`);
  });
  
  const enabledProviders = providers.filter(p => p.enabled);
  
  if (enabledProviders.length === 0) {
    throw new Error('No AI providers configured! Please add API keys to .env file.');
  }
  
  let lastError = null;
  
  for (const provider of enabledProviders) {
    try {
      console.log(`\n🔄 Attempting ${provider.name}...`);
      const response = await provider.fn(userMessage, educationType);
      
      if (response && response.trim().length > 0) {
        console.log(`✅ Success with ${provider.name}!\n`);
        return response;
      }
    } catch (error) {
      console.error(`❌ ${provider.name} failed:`, error.message);
      lastError = error;
      continue;
    }
  }
  
  // إذا فشلت كل المحاولات
  throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
}

// ============================================
// Parse Response (Chat + Whiteboard)
// ============================================

function parseAIResponse(fullResponse) {
  const separator = '---WHITEBOARD---';
  
  if (fullResponse.includes(separator)) {
    const [chatPart, whiteboardPart] = fullResponse.split(separator);
    return {
      chatResponse: chatPart.trim(),
      whiteboardContent: whiteboardPart.trim()
    };
  }
  
  // إذا لم يكن مفصول، استخرج الأقسام للسبورة
  const whiteboardSections = fullResponse.match(/##[^#]+/g) || [];
  const whiteboardContent = whiteboardSections.join('\n\n').trim();
  
  return {
    chatResponse: fullResponse,
    whiteboardContent: whiteboardContent || 'لا يوجد محتوى للسبورة'
  };
}

// ============================================
// Authentication Middleware
// ============================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // للتطوير: السماح بالطلبات بدون token أو بكلمة null
  if (!token || token === 'null' || token === 'undefined') {
    req.user = { id: 'test-user', email: 'test@test.com' };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // للسماح بالتجربة حتى لو التوكن قديم
      req.user = { id: 'test-user', email: 'test@test.com' };
      return next();
    }
    req.user = user;
    next();
  });
};

// ============================================
// Routes
// ============================================

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    env: {
      groq: !!process.env.GROQ_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      blackbox: !!process.env.BLACKBOX_API_KEY,
      supabase: !!process.env.SUPABASE_URL
    }
  });
});

// Test AI Connection
app.get('/api/test-ai', async (req, res) => {
  try {
    console.log('\n🧪 Testing AI Connection...\n');
    
    const testMessage = 'ما هو 2 + 2؟';
    const response = await getAIResponse(testMessage, 'arabic');
    
    res.json({
      success: true,
      message: 'AI is working!',
      testQuestion: testMessage,
      response: response.substring(0, 200) + '...'
    });
    
  } catch (error) {
    console.error('❌ AI Test Failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check your API keys in .env file'
    });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, educationType = 'arabic' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        password_hash: hashedPassword,
        education_type: educationType,
        subscription_tier: 'free',
        api_credits: 50
      }])
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      return res.status(400).json({ error: 'Email already exists or database error' });
    }

    const token = jwt.sign(
      { id: data.id, email: data.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        educationType: data.education_type
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, data.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: data.id, email: data.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        educationType: data.education_type
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Chat Endpoint (Main)
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    console.log('\n📨 New Chat Request');
    console.log('User:', req.user?.email || 'test user');
    
    const { message, educationType = 'arabic', gradeLevel = 'sec3' } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // استدعاء الـ AI مع الصف الدراسي
    const aiFullResponse = await getAIResponse(message, educationType, gradeLevel);
    
    // فصل الردين
    const { chatResponse, whiteboardContent } = parseAIResponse(aiFullResponse);

    // 💾 حفظ المحادثة في قاعدة البيانات (Supabase)
    // نستخدم email المستخدم إذا كان مسجلاً، وإلا نحفظه كـ guest
    const userEmail = req.user?.email || 'guest_student';
    
    await supabase.from('messages').insert([
      { 
        user_email: userEmail, 
        sender: 'user', 
        content: message, 
        grade_level: gradeLevel 
      },
      { 
        user_email: userEmail, 
        sender: 'assistant', 
        content: chatResponse, 
        whiteboard_content: whiteboardContent, 
        grade_level: gradeLevel 
      }
    ]);

    console.log('✅ Response ready and saved to DB!');


    res.json({
      success: true,
      chatResponse,
      whiteboardContent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('\n❌ Chat Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'فشل في معالجة الرسالة',
      details: error.message,
      hint: 'تأكد من صحة API Keys في ملف .env'
    });
  }
});

// 📥 استرجاع تاريخ المحادثة من Supabase
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user?.email || 'guest_student';
    
    // سحب آخر 30 رسالة
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: true })
      .limit(30);

    if (error) throw error;

    res.json({
      success: true,
      messages: data.map(msg => ({
        id: msg.id,
        role: msg.sender,
        content: msg.content,
        whiteboardContent: msg.whiteboard_content,
        timestamp: msg.created_at,
        type: 'chat'
      }))
    });

  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'فشل في تحميل المحادثات السابقة' });
  }
});

// Dashboard Stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    // إحصائيات افتراضية للتطوير
    res.json({
      totalQuestions: 0,
      totalConversations: 0,
      quizzesCompleted: 0,
      averageScore: 0,
      apiCredits: 50
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Saboora Backend Server Started!');
  console.log('='.repeat(50));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log('\n🔧 Configuration:');
  console.log(`  ${process.env.GROQ_API_KEY ? '✅' : '❌'} Groq API`);
  console.log(`  ${process.env.GEMINI_API_KEY ? '✅' : '❌'} Gemini API`);
  console.log(`  ${process.env.BLACKBOX_API_KEY ? '✅' : '❌'} BlackBox API`);
  console.log(`  ${process.env.SUPABASE_URL ? '✅' : '❌'} Supabase`);
  console.log('\n📝 Endpoints:');
  console.log('  GET  /health           - Health check');
  console.log('  GET  /api/test-ai      - Test AI connection');
  console.log('  POST /api/auth/register - Register user');
  console.log('  POST /api/auth/login    - Login');
  console.log('  POST /api/chat          - Send message');
  console.log('='.repeat(50) + '\n');
});

module.exports = app;
