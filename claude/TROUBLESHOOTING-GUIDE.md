# 🔧 دليل حل مشاكل Saboora - خطوة بخطوة

## ❌ المشكلة: "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى"

---

## 📋 الخطوات التشخيصية

### ✅ الخطوة 1: تحقق من تشغيل Backend

افتح Terminal وشغّل Backend:

```bash
cd backend
node saboora-backend-fixed.js
```

**لو شغال صح، هتشوف**:
```
==================================================
🚀 Saboora Backend Server Started!
==================================================
📍 Port: 3000
🌐 URL: http://localhost:3000

🔧 Configuration:
  ✅ Groq API
  ✅ Gemini API
  ✅ BlackBox API
  ✅ Supabase
```

**لو فيه ❌ قدام أي API**:
- معناه الـ API Key غلط أو مش موجود
- راجع ملف `.env`

---

### ✅ الخطوة 2: اختبر الـ Backend

افتح المتصفح واذهب إلى:
```
http://localhost:3000/health
```

**لو شغال صح، هتشوف**:
```json
{
  "status": "OK",
  "timestamp": "2026-04-08T...",
  "env": {
    "groq": true,
    "gemini": true,
    "blackbox": true,
    "supabase": true
  }
}
```

---

### ✅ الخطوة 3: اختبر الـ AI

افتح المتصفح:
```
http://localhost:3000/api/test-ai
```

**لو شغال صح**:
```json
{
  "success": true,
  "message": "AI is working!",
  "response": "..."
}
```

**لو فيه مشكلة**:
```json
{
  "success": false,
  "error": "All AI providers failed...",
  "hint": "Check your API keys in .env file"
}
```

---

### ✅ الخطوة 4: تحقق من Frontend

افتح **Console** في المتصفح (F12 > Console)

ابحث عن:
```
❌ Failed to fetch
❌ Network error
❌ CORS policy
❌ 500 Internal Server Error
```

---

## 🛠️ الحلول حسب نوع الخطأ

### ❌ الخطأ: "Failed to fetch" / "Network error"

**السبب**: Frontend مش عارف يوصل للـ Backend

**الحل**:

1. تأكد إن Backend شغال على `http://localhost:3000`

2. في Frontend، افتح ملف `Chat.jsx` وتأكد من:
```javascript
const response = await fetch('http://localhost:3000/api/chat', {
  // ... باقي الكود
});
```

3. تأكد من CORS في Backend:
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
```

---

### ❌ الخطأ: "401 Unauthorized" / "403 Forbidden"

**السبب**: مشكلة في الـ Authentication Token

**الحل**:

1. في Backend، تأكد من middleware:
```javascript
const authenticateToken = (req, res, next) => {
  // للتطوير: السماح بدون token
  if (!token) {
    req.user = { id: 'test-user' };
    return next();
  }
  // ... باقي الكود
};
```

2. أو احذف الـ Authentication مؤقتاً:
```javascript
// بدلاً من:
app.post('/api/chat', authenticateToken, async (req, res) => {

// استخدم:
app.post('/api/chat', async (req, res) => {
```

---

### ❌ الخطأ: "All AI providers failed"

**السبب**: كل الـ API Keys غلط أو مش شغالة

**الحل**:

1. **تحقق من Groq API Key**:
```bash
# في Terminal
echo $GROQ_API_KEY
```

لو فاضي، معناه `.env` مش متحمل.

2. **حمّل `.env` يدوياً**:
```bash
# في بداية server.js
require('dotenv').config();

# تأكد من المسار
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'موجود' : 'مفقود');
```

3. **اختبر API Key يدوياً**:

**Groq Test**:
```bash
curl https://api.groq.com/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GROQ_KEY" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Gemini Test**:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_GEMINI_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Hello"}]
    }]
  }'
```

---

### ❌ الخطأ: "CORS policy"

**السبب**: Frontend على port مختلف

**الحل**:

في `saboora-backend-fixed.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',  // React default
    'http://localhost:5173',  // Vite default
    'http://localhost:8080',  // أي port آخر
    process.env.FRONTEND_URL
  ],
  credentials: true
}));
```

---

## 🔍 Debug Mode - طباعة كل شيء

أضف هذا في Backend لطباعة كل التفاصيل:

```javascript
app.post('/api/chat', async (req, res) => {
  try {
    // طباعة الطلب
    console.log('\n=== DEBUG MODE ===');
    console.log('1. Request Body:', JSON.stringify(req.body, null, 2));
    console.log('2. Message:', req.body.message);
    console.log('3. Education Type:', req.body.educationType);
    
    // طباعة API Keys
    console.log('4. API Keys Status:');
    console.log('   GROQ:', process.env.GROQ_API_KEY ? '✅ موجود' : '❌ مفقود');
    console.log('   GEMINI:', process.env.GEMINI_API_KEY ? '✅ موجود' : '❌ مفقود');
    console.log('   BLACKBOX:', process.env.BLACKBOX_API_KEY ? '✅ موجود' : '❌ مفقود');
    
    // استدعاء AI مع طباعة
    console.log('5. Calling AI...');
    const response = await getAIResponse(req.body.message, req.body.educationType);
    
    console.log('6. AI Response Length:', response.length);
    console.log('7. First 200 chars:', response.substring(0, 200));
    
    // إرسال الرد
    const parsed = parseAIResponse(response);
    console.log('8. Parsed Chat Length:', parsed.chatResponse.length);
    console.log('9. Parsed Whiteboard Length:', parsed.whiteboardContent.length);
    console.log('=== END DEBUG ===\n');
    
    res.json(parsed);
    
  } catch (error) {
    console.error('\n=== ERROR DEBUG ===');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('=== END ERROR ===\n');
    
    res.status(500).json({
      error: 'حدث خطأ',
      details: error.message,
      stack: error.stack
    });
  }
});
```

---

## 📝 Checklist النهائي

قبل ما تشغل الموقع، تأكد من:

### Backend:
- [ ] ملف `.env` موجود في مجلد backend
- [ ] فيه على الأقل Groq API Key
- [ ] `require('dotenv').config()` في أول الملف
- [ ] Backend شغال على `http://localhost:3000`
- [ ] `/health` يرجع `200 OK`
- [ ] `/api/test-ai` يرجع response من AI

### Frontend:
- [ ] API URL صحيح: `http://localhost:3000/api/chat`
- [ ] CORS مسموح
- [ ] Console مفيهوش أخطاء

### API Keys:
- [ ] Groq API Key صحيح
- [ ] أو Gemini API Key صحيح
- [ ] أو BlackBox API Key صحيح
- [ ] على الأقل واحد منهم شغال!

---

## 🆘 لو لسه مش شغال

### جرّب الكود البسيط ده:

```javascript
// test-ai.js - اختبار بسيط للـ AI
require('dotenv').config();

async function testGroq() {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'قل مرحبا' }]
    })
  });
  
  const data = await response.json();
  console.log('Groq Response:', data);
}

testGroq().catch(console.error);
```

شغّله:
```bash
node test-ai.js
```

---

## 📞 اتصل بي

لو جربت كل ده ولسه فيه مشكلة، ابعت لي:

1. **Output** من Backend console (لما تبعت رسالة)
2. **Error** من Frontend console (F12)
3. **Screenshot** من `/health` endpoint
4. **محتوى** ملف `.env` (بدون الـ API Keys الحقيقية!)

وهساعدك أحل المشكلة! 🚀
