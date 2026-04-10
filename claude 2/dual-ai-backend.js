// ============================================
// Dual AI System - Chat AI + Whiteboard AI
// ============================================

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', process.env.FRONTEND_URL],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// ============================================
// AI #1: Chat AI (Detailed Response)
// ============================================

async function getChatAIResponse(userMessage, educationType = 'arabic') {
  console.log('🗣️ Chat AI: Generating detailed response...');
  
  const systemPrompt = educationType === 'arabic' 
    ? `أنت مدرس خصوصي متخصص في شرح الرياضيات والفيزياء والكيمياء.

مهمتك: اشرح بالتفصيل الكامل للطالب في الشات.

قواعد الشرح:
1. ابدأ بمقدمة بسيطة عن الموضوع
2. اشرح الخطوات بالتفصيل
3. أعط أمثلة توضيحية
4. اذكر الملاحظات المهمة
5. أنهِ بملخص سريع

استخدم لغة عربية سهلة وواضحة.
لا تستخدم رموز رياضية معقدة، اكتبها بالعربي.

مثال:
"دعني أشرح لك كيفية حساب مساحة المثلث:

أولاً، المساحة تساوي نصف القاعدة في الارتفاع..."`
    : `You are a specialized tutor in Math, Physics, and Chemistry.

Your task: Provide a detailed explanation in the chat.

Explanation rules:
1. Start with a simple introduction
2. Explain steps in detail
3. Provide examples
4. Mention important notes
5. End with a quick summary

Use simple, clear language.`;

  try {
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

    const data = await response.json();
    console.log('✅ Chat AI: Response ready');
    return data.choices[0].message.content;

  } catch (error) {
    console.error('❌ Chat AI Error:', error.message);
    throw error;
  }
}

// ============================================
// AI #2: Whiteboard AI (Concise + Visual)
// ============================================

async function getWhiteboardAIResponse(userMessage, educationType = 'arabic') {
  console.log('📝 Whiteboard AI: Generating concise response...');
  
  const systemPrompt = educationType === 'arabic'
    ? `أنت مدرس يكتب على السبورة. مهمتك: كتابة ملخص مختصر جداً للطالب.

⚠️ قواعد مهمة جداً:
1. اكتب فقط القوانين أو المفاهيم الأساسية
2. استخدم 3-5 أسطر كحد أقصى
3. اكتب بخط واضح كبير
4. استخدم الألوان (سأضيفها لاحقاً)
5. لا تكتب شرح طويل - فقط الأساسيات!

صيغة الرد المطلوبة:

## 📌 القانون
[اكتب القانون بوضوح]

## 📝 الخطوات
1. [خطوة واحدة فقط]
2. [خطوة ثانية فقط]

## ✅ الإجابة
[الإجابة النهائية]

مثال جيد (مختصر):
## 📌 القانون
المساحة = ½ × القاعدة × الارتفاع

## 📝 الخطوات
1. القاعدة = 10 سم
2. الارتفاع = 5 سم
3. المساحة = ½ × 10 × 5

## ✅ الإجابة
المساحة = 25 سم²

مثال سيء (طويل - ممنوع):
"في البداية يجب أن نفهم أن مساحة المثلث تعتمد على القاعدة والارتفاع، وهذا القانون مهم جداً..."

تذكر: السبورة للتوضيح السريع فقط!`
    : `You are a teacher writing on a whiteboard. Your task: Write a very concise summary.

⚠️ Important rules:
1. Write only formulas or key concepts
2. Use 3-5 lines maximum
3. Write in large, clear text
4. Use colors (I'll add them later)
5. No long explanations - just the basics!

Required format:

## 📌 Formula
[Write the formula clearly]

## 📝 Steps
1. [One step only]
2. [Second step only]

## ✅ Answer
[Final answer]

Example (good - concise):
## 📌 Formula
Area = ½ × Base × Height

## 📝 Steps
1. Base = 10 cm
2. Height = 5 cm
3. Area = ½ × 10 × 5

## ✅ Answer
Area = 25 cm²

Remember: Whiteboard is for quick clarification only!`;

  try {
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
        temperature: 0.5, // أقل للمزيد من التركيز
        max_tokens: 500   // أقصر للردود المختصرة
      })
    });

    const data = await response.json();
    console.log('✅ Whiteboard AI: Response ready');
    return data.choices[0].message.content;

  } catch (error) {
    console.error('❌ Whiteboard AI Error:', error.message);
    throw error;
  }
}

// ============================================
// AI #3: Image Search for Whiteboard
// ============================================

async function getRelevantImage(userMessage, educationType = 'arabic') {
  console.log('🖼️ Finding relevant image...');
  
  try {
    // استخدام Unsplash API للصور (مجاني)
    const searchQuery = await generateImageSearchQuery(userMessage, educationType);
    
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
        }
      }
    );

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const image = data.results[0];
      console.log('✅ Image found:', image.urls.regular);
      
      return {
        url: image.urls.regular,
        thumbnail: image.urls.small,
        description: image.alt_description || searchQuery,
        photographer: image.user.name,
        photographerUrl: image.user.links.html
      };
    }
    
    console.log('⚠️ No image found, using fallback');
    return null;

  } catch (error) {
    console.error('❌ Image search error:', error.message);
    return null;
  }
}

// توليد query مناسب للبحث عن الصور
async function generateImageSearchQuery(userMessage, educationType) {
  console.log('🔍 Generating image search query...');
  
  try {
    const systemPrompt = educationType === 'arabic'
      ? `استخرج الموضوع الرئيسي من السؤال وحوّله لكلمات بحث إنجليزية مناسبة لإيجاد صورة تعليمية.

أمثلة:
سؤال: "احسب مساحة المثلث"
البحث: "triangle geometry diagram"

سؤال: "ما هي الخلية النباتية؟"
البحث: "plant cell biology diagram"

سؤال: "اشرح قانون نيوتن الثاني"
البحث: "newton second law physics"

اكتب فقط كلمات البحث بالإنجليزية، بدون أي شرح.`
      : `Extract the main topic and convert it to English search keywords for educational images.

Examples:
Question: "Calculate triangle area"
Search: "triangle geometry diagram"

Write only the search keywords in English, no explanation.`;

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
        temperature: 0.3,
        max_tokens: 50
      })
    });

    const data = await response.json();
    const searchQuery = data.choices[0].message.content.trim();
    console.log('✅ Search query:', searchQuery);
    
    return searchQuery;

  } catch (error) {
    console.error('❌ Query generation error:', error.message);
    return 'education mathematics'; // fallback
  }
}

// ============================================
// Main Chat Endpoint (Dual AI System)
// ============================================

app.post('/api/chat', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('📨 NEW CHAT REQUEST');
    console.log('='.repeat(60));
    
    const { message, educationType = 'arabic' } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('📝 User message:', message.substring(0, 100) + '...');
    console.log('🌍 Education type:', educationType);
    console.log('\n🤖 Starting dual AI processing...\n');

    // تنفيذ الثلاث عمليات بالتوازي (أسرع)
    const [chatResponse, whiteboardContent, imageData] = await Promise.all([
      getChatAIResponse(message, educationType),
      getWhiteboardAIResponse(message, educationType),
      getRelevantImage(message, educationType)
    ]);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL RESPONSES READY');
    console.log('='.repeat(60));
    console.log('📊 Chat length:', chatResponse.length, 'chars');
    console.log('📊 Whiteboard length:', whiteboardContent.length, 'chars');
    console.log('📊 Image:', imageData ? imageData.url.substring(0, 50) + '...' : 'None');
    console.log('='.repeat(60) + '\n');

    res.json({
      success: true,
      chatResponse,           // الرد التفصيلي في الشات
      whiteboardContent,      // الرد المختصر للسبورة
      whiteboardImage: imageData, // الصورة التوضيحية
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('\n❌ CHAT ERROR:', error);
    
    res.status(500).json({
      success: false,
      error: 'فشل في معالجة الرسالة',
      details: error.message
    });
  }
});

// ============================================
// Test Endpoints
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    dualAI: 'enabled',
    features: {
      chatAI: !!process.env.GROQ_API_KEY,
      whiteboardAI: !!process.env.GROQ_API_KEY,
      imageSearch: !!process.env.UNSPLASH_ACCESS_KEY
    }
  });
});

app.get('/api/test-whiteboard', async (req, res) => {
  try {
    const testMessage = 'احسب مساحة مثلث قاعدته 10 سم وارتفاعه 5 سم';
    
    console.log('\n🧪 Testing Whiteboard AI...\n');
    
    const whiteboardResponse = await getWhiteboardAIResponse(testMessage, 'arabic');
    const imageData = await getRelevantImage(testMessage, 'arabic');
    
    res.json({
      success: true,
      testQuestion: testMessage,
      whiteboardContent: whiteboardResponse,
      image: imageData
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SABOORA DUAL AI SYSTEM STARTED');
  console.log('='.repeat(60));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log('\n🤖 AI Configuration:');
  console.log(`  ${process.env.GROQ_API_KEY ? '✅' : '❌'} Chat AI (Groq)`);
  console.log(`  ${process.env.GROQ_API_KEY ? '✅' : '❌'} Whiteboard AI (Groq)`);
  console.log(`  ${process.env.UNSPLASH_ACCESS_KEY ? '✅' : '❌'} Image Search (Unsplash)`);
  console.log('\n📝 Endpoints:');
  console.log('  GET  /health                 - System status');
  console.log('  GET  /api/test-whiteboard    - Test whiteboard AI');
  console.log('  POST /api/chat               - Main chat endpoint');
  console.log('='.repeat(60) + '\n');
});

module.exports = app;
