// server.js - Backend للموقع
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database Connection (Supabase)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'saboora-secret-key';

// ============================================
// AI Integration
// ============================================

const callGroqAPI = async (messages, educationType) => {
  try {
    const systemPrompt = educationType === 'arabic'
      ? `أنت مدرس خصوصي متخصص في الرياضيات والفيزياء والكيمياء.

التعليم: عربي
المستوى: ثانوية عامة

عند الرد:
1. الشات: اشرح بالتفصيل الكامل مع جميع الخطوات
2. السبورة: اكتب فقط القوانين والخطوات الأساسية

استخدم المصطلحات العربية في القوانين.
مثال: "المساحة = الطول × العرض"

السبورة يجب أن تحتوي على:
## القانون المستخدم
[اكتب القانون بالعربي]

## الخطوات
1. [الخطوة الأولى]
2. [الخطوة الثانية]
3. [الخطوة الثالثة]

## الإجابة النهائية
[الإجابة]

استخدم ألوان مختلفة بوضع علامات:
- للقوانين: "## قانون"
- للإجابة: "## الإجابة النهائية"
- للملاحظات: "ملاحظة:"`
      : `أنت مدرس خصوصي متخصص في الرياضيات والفيزياء والكيمياء.

التعليم: لغات (English)
المستوى: High School

عند الرد:
1. Chat: Full detailed explanation with all steps
2. Whiteboard: Only formulas and main steps

Use English terms in formulas.
Example: "Area = Length × Width"

Whiteboard format:
## Formula Used
[Write the formula in English]

## Steps
1. [First step]
2. [Second step]
3. [Third step]

## Final Answer
[Answer]

Use different sections:
- For formulas: "## Formula"
- For answer: "## Final Answer"
- For notes: "Note:"`;

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
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error('Groq API failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error('Groq API Error:', error);
    // Fallback to Gemini
    return await callGeminiAPI(messages, educationType);
  }
};

const callGeminiAPI = async (messages, educationType) => {
  try {
    const systemPrompt = educationType === 'arabic'
      ? 'أنت مدرس متخصص. رد بالتفصيل باللغة العربية.'
      : 'You are a specialized tutor. Reply in detail in English.';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: messages[messages.length - 1].content }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;

  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('All AI providers failed');
  }
};

// تحليل الصور بـ Gemini Vision
const analyzeImage = async (imageBase64) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: 'قم بتحليل هذه الصورة واستخرج المسألة الرياضية أو العلمية منها:' },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64.split(',')[1]
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;

  } catch (error) {
    console.error('Image Analysis Error:', error);
    return null;
  }
};

// فصل الرد إلى جزئين (Chat + Whiteboard)
const separateResponses = (fullResponse) => {
  // محاولة فصل المحتوى
  const parts = fullResponse.split('---WHITEBOARD---');

  if (parts.length === 2) {
    return {
      chatResponse: parts[0].trim(),
      whiteboardContent: parts[1].trim()
    };
  }

  // إذا لم يكن مفصول، نستخرج القوانين والخطوات للسبورة
  const whiteboardSections = fullResponse.match(/##[^#]+/g) || [];
  const whiteboardContent = whiteboardSections.join('\n\n');

  return {
    chatResponse: fullResponse,
    whiteboardContent: whiteboardContent || fullResponse.substring(0, 500)
  };
};

// ============================================
// Authentication Middleware
// ============================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ============================================
// Routes
// ============================================

// 1. التسجيل (Sign Up)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, educationType, gradeLevel } = req.body;

    // التحقق من البيانات
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // إضافة المستخدم للقاعدة
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          name,
          email,
          password_hash: hashedPassword,
          education_type: educationType || 'arabic',
          grade_level: gradeLevel || 'secondary'
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // إنشاء Token
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
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. تسجيل الدخول (Login)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // البحث عن المستخدم
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // التحقق من كلمة المرور
    const validPassword = await bcrypt.compare(password, data.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // تحديث آخر تسجيل دخول
    await supabase
      .from('users')
      .update({ last_login: new Date() })
      .eq('id', data.id);

    // إنشاء Token
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
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. إرسال رسالة للـ AI
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message, file, educationType, conversationHistory } = req.body;
    const userId = req.user.id;

    let finalMessage = message;

    // تحليل الصورة إذا كانت موجودة
    if (file && file.type.startsWith('image/')) {
      const imageAnalysis = await analyzeImage(file.data);
      finalMessage = `${message}\n\nمحتوى الصورة: ${imageAnalysis}`;
    }

    // بناء تاريخ المحادثة
    const messages = [
      ...(conversationHistory || []).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: finalMessage }
    ];

    // استدعاء الـ AI
    const aiResponse = await callGroqAPI(messages, educationType);

    // فصل الردين
    const { chatResponse, whiteboardContent } = separateResponses(aiResponse);

    // حفظ في القاعدة
    const { data: conversationData } = await supabase
      .from('conversations')
      .insert([{ user_id: userId, title: message.substring(0, 50) }])
      .select()
      .single();

    if (conversationData) {
      await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationData.id,
            role: 'user',
            content_chat: message,
            attachments: file ? [file] : null
          },
          {
            conversation_id: conversationData.id,
            role: 'assistant',
            content_chat: chatResponse,
            content_whiteboard: whiteboardContent
          }
        ]);
    }

    res.json({
      chatResponse,
      whiteboardContent,
      conversationId: conversationData?.id
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// 4. الحصول على الإحصائيات
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // عدد المحادثات
    const { count: conversationCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // عدد الأسئلة
    const { count: messageCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user');

    // Quiz Results
    const { data: quizData } = await supabase
      .from('quiz_results')
      .select('score')
      .eq('user_id', userId);

    const avgScore = quizData?.length > 0
      ? quizData.reduce((sum, q) => sum + q.score, 0) / quizData.length
      : 0;

    res.json({
      totalQuestions: messageCount || 0,
      totalConversations: conversationCount || 0,
      quizzesCompleted: quizData?.length || 0,
      averageScore: Math.round(avgScore)
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// 5. Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Saboora API running on port ${PORT}`);
  console.log(`📚 Education platform ready!`);
});

module.exports = app;
