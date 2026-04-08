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

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware
app.use(cors({
  origin: '*', // للسماح بكل الاتصالات أثناء التطوير
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
async function callGeminiAPI(userMessage, educationType = 'arabic', gradeLevel = 'sec3', fileData = null) {
  console.log('🚀 Trying Gemini API (with Multi-modal support)...');
  
  try {
    const systemPrompt = createSystemPrompt(educationType, gradeLevel);
    
    // إعداد محتوى الرسالة
    const parts = [{ text: `${systemPrompt}\n\nالسؤال: ${userMessage}` }];

    // إذا كان هناك ملف (Base64)
    if (fileData && fileData.data) {
      console.log('📎 Adding file to Gemini request:', fileData.name);
      const base64Content = fileData.data.split(',')[1];
      parts.push({
        inline_data: {
          mime_type: fileData.type || "image/jpeg",
          data: base64Content
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2500 }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0]) throw new Error('Gemini: No response');
    
    console.log('✅ Gemini API Content Received!');
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
  }[gradeLevel] || gradeLevel;

  return `You are "Saboora AI", a professional multi-modal tutor. 
  Student Level: ${gradeName} - ${isArabic ? 'Arabic' : 'English'} Curriculum.

  CRITICAL: You MUST respond in a strict JSON format. No extra text before or after the JSON.
  
  JSON Structure:
  {
    "chat_explanation": "Detailed, friendly pedagogical explanation for the chat box (HTML supported).",
    "board_actions": [
      { "type": "WRITE", "content": "Topic Title", "color": "blue", "importance": "high" },
      { "type": "DRAW", "shape": "circle", "label": "Atom Core" },
      { "type": "WRITE", "content": "Formula: E=mc²", "color": "red" },
      { "type": "STICKER", "query": "human cell diagram", "caption": "Cell Structure" }
    ],
    "teacher_voice": "Short encouragement or warm-up question."
  }

  Rules:
  1. chat_explanation: Detailed, step-by-step.
  2. board_actions: Concise, visual-only. Use Blue for titles, Red for results, Green for notes.
  3. Never repeat chat text on the board. The board is for summaries/visuals.
  4. Use ${isArabic ? 'Arabic' : 'English'} for all text content.`;
}

/**
 * دالة ذكية لتحليل الرد سواء كان JSON أو نص عادي
 */
function parseAIResponse(aiFullResponse) {
  try {
    // محاولة استخراج JSON من بين أي نصوص زائدة
    const jsonMatch = aiFullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        chatResponse: data.chat_explanation + (data.teacher_voice ? `\n\n_${data.teacher_voice}_` : ""),
        whiteboardContent: JSON.stringify(data.board_actions) // نرسلها كـ JSON للـ Frontend ليترجمها لأوامر
      };
    }
  } catch (e) {
    console.error("JSON Parsing failed, falling back to regex", e);
  }

  // Fallback if AI fails to give JSON
  const parts = aiFullResponse.split('---WHITEBOARD---');
  return {
    chatResponse: parts[0].trim(),
    whiteboardContent: parts[1] ? parts[1].trim() : ""
  };
}


// ============================================
// AI Router (with Fallback Chain)
// ============================================

async function getAIResponse(userMessage, educationType = 'arabic', gradeLevel = 'sec3', fileData = null) {
  const providers = [
    { name: 'Groq', fn: (msg, edu) => callGroqAPI(msg, edu, gradeLevel), enabled: !!process.env.GROQ_API_KEY },
    { name: 'Gemini', fn: (msg, edu) => callGeminiAPI(msg, edu, gradeLevel, fileData), enabled: !!process.env.GEMINI_API_KEY },
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
    
    const { message, educationType = 'arabic', gradeLevel = 'sec3', file = null } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // استدعاء الـ AI مع الصف الدراسي والملف
    const aiFullResponse = await getAIResponse(message, educationType, gradeLevel, file);
    
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
