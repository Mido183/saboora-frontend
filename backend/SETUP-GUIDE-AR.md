# 🎓 دليل تشغيل موقع Saboora - للمبتدئين تماماً

## 📋 المحتويات
1. [المتطلبات الأساسية](#المتطلبات-الأساسية)
2. [إعداد قاعدة البيانات](#إعداد-قاعدة-البيانات-supabase)
3. [الحصول على API Keys](#الحصول-على-api-keys)
4. [تشغيل البرنامج محلياً](#تشغيل-البرنامج-محلياً)
5. [رفع الموقع على الإنترنت](#رفع-الموقع-على-الإنترنت)
6. [شراء الدومين وربطه](#شراء-الدومين-وربطه)
7. [نظام الباقات والدفع](#نظام-الباقات-والدفع)

---

## 1️⃣ المتطلبات الأساسية

### أولاً: تثبيت البرامج المطلوبة

#### أ) Node.js (للبرمجة)
1. افتح الموقع: https://nodejs.org
2. اضغط على "Download" للنسخة LTS (الموصى بها)
3. قم بتثبيت البرنامج (اضغط Next على كل شيء)
4. للتأكد من التثبيت، افتح **Command Prompt** واكتب:
   ```bash
   node --version
   ```
   لو ظهر رقم الإصدار (مثل v20.11.0) يبقى تمام ✅

#### ب) Git (لإدارة الكود)
1. افتح الموقع: https://git-scm.com/download/win
2. حمّل النسخة لويندوز وثبتها
3. للتأكد:
   ```bash
   git --version
   ```

#### ج) VS Code (محرر الكود - اختياري لكن موصى به)
1. افتح: https://code.visualstudio.com
2. حمّل وثبت البرنامج
3. افتحه وثبت الإضافات التالية:
   - ES7+ React/Redux/React-Native snippets
   - Prettier - Code formatter
   - Arabic Language Pack (للدعم العربي)

---

## 2️⃣ إعداد قاعدة البيانات (Supabase)

### لماذا Supabase؟
- **مجاني** للبداية (حتى 500 MB)
- سهل جداً في الاستخدام
- قاعدة بيانات PostgreSQL قوية
- Authentication (تسجيل دخول) جاهز

### الخطوات:

#### أ) إنشاء حساب
1. اذهب إلى: https://supabase.com
2. اضغط "Start your project"
3. سجّل بإيميل Gmail
4. ادخل على Dashboard

#### ب) إنشاء مشروع جديد
1. اضغط "New Project"
2. املأ البيانات:
   - **Name**: saboora-db
   - **Database Password**: اختر باسورد قوي واحفظه! 🔐
   - **Region**: اختر أقرب منطقة (مثل Frankfurt لمصر)
3. اضغط "Create new project"
4. انتظر 2-3 دقائق حتى يتم إنشاء القاعدة

#### ج) إنشاء الجداول (Tables)

1. من القائمة الجانبية، اختر **"SQL Editor"**
2. اضغط "New query"
3. انسخ والصق الكود التالي:

```sql
-- جدول المستخدمين
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  education_type VARCHAR(50) DEFAULT 'arabic',
  grade_level VARCHAR(50) DEFAULT 'secondary',
  subscription_tier VARCHAR(20) DEFAULT 'free',
  api_credits INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- جدول المحادثات
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- جدول الرسائل
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content_chat TEXT,
  content_whiteboard JSONB,
  attachments JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- جدول نتائج الاختبارات
CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  quiz_data JSONB,
  score FLOAT,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- جدول الإحصائيات
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(100),
  event_data JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- جدول الاشتراكات
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_name VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  payment_method VARCHAR(50)
);

-- إضافة indexes للأداء الأفضل
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_analytics_user ON analytics(user_id);
```

4. اضغط **"Run"** أو اضغط F5
5. لو ظهر "Success. No rows returned" يبقى تمام ✅

#### د) الحصول على API Keys
1. اذهب إلى **Settings** > **API**
2. هتلاقي:
   - **Project URL** (مثل: https://xxxxx.supabase.co)
   - **anon public key** (مفتاح عام)
   - **service_role key** (مفتاح خاص - لا تشاركه!)
3. احفظ الاتنين في مكان آمن 📝

---

## 3️⃣ الحصول على API Keys

### أ) Groq API (مجاني! 🎉)

1. اذهب إلى: https://console.groq.com
2. سجّل دخول بإيميل Gmail
3. اذهب إلى **API Keys**
4. اضغط **"Create API Key"**
5. اكتب اسم: "Saboora-Production"
6. احفظ الـ Key (مثل: gsk_xxxxxxxxxxxxx)

**ملاحظة**: Groq حالياً مجاني بالكامل! 🚀

### ب) Gemini API (مجاني حتى حد معين)

1. اذهب إلى: https://makersuite.google.com/app/apikey
2. سجّل دخول بحساب Google
3. اضغط **"Create API Key"**
4. اختر **"Create API key in new project"**
5. احفظ الـ Key (مثل: AIzaSyxxxxxxxxxxxxxxxxx)

**الحد المجاني**: 60 طلب/دقيقة

### ج) ElevenLabs (Text-to-Speech) - اختياري

1. اذهب إلى: https://elevenlabs.io
2. سجّل حساب جديد
3. اذهب إلى **Profile** > **API Keys**
4. احفظ الـ API Key

**السعر**: $5/شهر للخطة الأساسية (10,000 حرف شهرياً)

---

## 4️⃣ تشغيل البرنامج محلياً (على جهازك)

### الخطوة 1: تحميل الكود

1. افتح **Command Prompt** أو **PowerShell**
2. اذهب إلى المجلد اللي تحب تشتغل فيه:
   ```bash
   cd Desktop
   mkdir saboora-project
   cd saboora-project
   ```

3. حمّل الكود (لو عندك GitHub):
   ```bash
   git clone https://github.com/your-username/saboora.git
   cd saboora
   ```

   أو أنشئ المشروع يدوياً:
   ```bash
   mkdir frontend
   mkdir backend
   ```

### الخطوة 2: إعداد الـ Backend

```bash
cd backend
npm init -y
```

ثبّت المكتبات المطلوبة:
```bash
npm install express cors dotenv jsonwebtoken bcryptjs @supabase/supabase-js
```

انشئ ملف `.env` وحط فيه:
```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-key-here

# JWT
JWT_SECRET=your-super-secret-key-change-this

# AI APIs
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxx

# ElevenLabs (Optional)
ELEVENLABS_API_KEY=your-key-here

# Server
PORT=3000
```

**⚠️ مهم جداً**: غيّر `JWT_SECRET` لكلمة سر قوية!

شغّل السيرفر:
```bash
node server.js
```

لو ظهر:
```
🚀 Saboora API running on port 3000
📚 Education platform ready!
```
يبقى تمام! ✅

### الخطوة 3: إعداد الـ Frontend

افتح terminal تاني (خلي السيرفر شغال):
```bash
cd ../frontend
```

أنشئ مشروع React:
```bash
npx create-react-app .
```

ثبّت المكتبات:
```bash
npm install framer-motion axios react-router-dom
```

شغّل الـ Frontend:
```bash
npm start
```

هيفتح الموقع على: http://localhost:3000 🎉

---

## 5️⃣ رفع الموقع على الإنترنت (Deployment)

### الطريقة الأسهل: استخدام منصات No-Code

#### الخيار 1: Vercel (للـ Frontend) - **موصى به** ⭐

**المميزات**:
- مجاني تماماً للبداية
- سريع جداً (CDN عالمي)
- سهل جداً في الاستخدام

**الخطوات**:

1. اذهب إلى: https://vercel.com
2. اضغط "Sign Up" وسجّل بـ GitHub
3. اضغط "New Project"
4. اربط GitHub repo أو ارفع المجلد يدوياً
5. Vercel هيكتشف إنه React تلقائياً
6. اضغط "Deploy"
7. انتظر دقيقة - خلاص الموقع شغال! 🚀

**الرابط النهائي**: https://saboora.vercel.app

#### الخيار 2: Railway (للـ Backend) - **موصى به** ⭐

**المميزات**:
- مجاني أول 500 ساعة/شهر
- PostgreSQL مدمج
- سهل جداً

**الخطوات**:

1. اذهب إلى: https://railway.app
2. سجّل بـ GitHub
3. اضغط "New Project"
4. اختر "Deploy from GitHub repo"
5. اختار الـ backend folder
6. أضف المتغيرات (Environment Variables):
   - SUPABASE_URL
   - SUPABASE_KEY
   - GROQ_API_KEY
   - إلخ...
7. اضغط "Deploy"

**الرابط النهائي**: https://saboora-api.up.railway.app

### ربط الـ Frontend بالـ Backend

في Frontend، غيّر الـ API URL:

```javascript
// src/config.js
export const API_URL = 'https://saboora-api.up.railway.app';
```

---

## 6️⃣ شراء الدومين وربطه

### أ) شراء الدومين

**الأماكن الموصى بها**:

| الموقع | السعر السنوي | المميزات |
|--------|--------------|----------|
| **Namecheap** | $8-12 | رخيص + سهل |
| **Hostinger** | $7-10 | رخيص جداً |
| **Google Domains** | $12 | موثوق |

**الخطوات** (مثال: Namecheap):

1. اذهب إلى: https://www.namecheap.com
2. ابحث عن الدومين المطلوب:
   - saboora.com
   - saboora.io
   - mysaboora.com
   - saboora-ai.com
3. لو متاح، اضغط "Add to Cart"
4. اشتري بكريدت كارد أو PayPal
5. السعر تقريباً: **$10/سنة**

### ب) ربط الدومين بـ Vercel

1. في Vercel Dashboard، اذهب للمشروع
2. اضغط على **"Settings"** > **"Domains"**
3. اكتب الدومين (مثل: saboora.com)
4. Vercel هيطلب منك تعديل DNS Records
5. ارجع لـ Namecheap:
   - اذهب لـ "Domain List" > "Manage"
   - اختر "Advanced DNS"
   - أضف Records اللي Vercel طلبها
6. انتظر 5-10 دقائق
7. خلاص! موقعك على: **www.saboora.com** 🎉

---

## 7️⃣ نظام الباقات والدفع 💰

### مخطط الباقات المقترح:

```
┌─────────────────────────────────────────┐
│           Free Plan (مجاني)            │
├─────────────────────────────────────────┤
│ ✅ 50 سؤال/شهر                         │
│ ✅ وصول للسبورة التفاعلية              │
│ ✅ 3 اختبارات/شهر                      │
│ ❌ بدون صوت                            │
│ ❌ بدون حفظ المحادثات أكثر من 7 أيام  │
│                                         │
│ السعر: $0/شهر                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│        Student Plan (طالب)             │
├─────────────────────────────────────────┤
│ ✅ 300 سؤال/شهر                        │
│ ✅ السبورة + الصوت (Text-to-Speech)    │
│ ✅ اختبارات غير محدودة                 │
│ ✅ حفظ المحادثات للأبد                 │
│ ✅ تحليل الصور والملفات                │
│ ✅ أولوية في الردود                    │
│                                         │
│ السعر: $9.99/شهر                       │
│ ($99/سنة - وفّر 17%)                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│       Premium Plan (بريميوم)           │
├─────────────────────────────────────────┤
│ ✅ أسئلة غير محدودة                    │
│ ✅ كل مميزات Student Plan              │
│ ✅ إمكانية تحميل كل الشروحات PDF       │
│ ✅ دعم فني ذو أولوية                   │
│ ✅ وصول مبكر للمميزات الجديدة          │
│ ✅ إحصائيات متقدمة                     │
│                                         │
│ السعر: $19.99/شهر                      │
│ ($199/سنة - وفّر 17%)                  │
└─────────────────────────────────────────┘
```

### حساب الأرباح المتوقعة:

**السيناريو المتحفظ** (بعد 6 أشهر):
- 1000 مستخدم مجاني
- 50 Student Plan ($9.99) = $500/شهر
- 10 Premium Plan ($19.99) = $200/شهر

**إجمالي الدخل**: **$700/شهر** 💰

**التكاليف**:
- Vercel: $20
- Railway: $20
- Supabase: $0 (مجاني حتى الآن)
- Groq API: $0 (مجاني)
- Gemini API: $0
- ElevenLabs: $50 (للصوت)
- Domain: $1/شهر

**التكلفة الإجمالية**: ~$91/شهر

**صافي الربح**: **$609/شهر** 🎉

### كيفية إضافة نظام الدفع:

#### أ) استخدام Stripe (الأفضل)

1. اذهب إلى: https://stripe.com
2. أنشئ حساب
3. ثبّت المكتبة:
   ```bash
   npm install stripe
   ```

4. أضف في Backend:
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/create-checkout', async (req, res) => {
  const { plan } = req.body;
  
  const prices = {
    student_monthly: 'price_xxxxx',
    student_yearly: 'price_xxxxx',
    premium_monthly: 'price_xxxxx',
    premium_yearly: 'price_xxxxx'
  };
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: prices[plan],
      quantity: 1
    }],
    mode: 'subscription',
    success_url: 'https://saboora.com/success',
    cancel_url: 'https://saboora.com/pricing'
  });
  
  res.json({ url: session.url });
});
```

5. في Frontend:
```javascript
const handleSubscribe = async (plan) => {
  const response = await fetch('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan })
  });
  
  const { url } = await response.json();
  window.location.href = url;
};
```

#### ب) بديل: Paddle أو LemonSqueezy
- أسهل في الإعداد
- يتعاملوا مع الضرائب تلقائياً
- جيدين للأسواق الدولية

---

## 8️⃣ نظام النقاط (API Credits)

### الفكرة:
كل سؤال يستهلك نقاط بناءً على:
- طول السؤال
- وجود صور
- استخدام الصوت

### التطبيق:

```javascript
// في Backend
const calculateCredits = (message, hasImage, hasVoice) => {
  let credits = 1; // سؤال عادي
  
  if (hasImage) credits += 2;
  if (hasVoice) credits += 1;
  if (message.length > 500) credits += 1;
  
  return credits;
};

app.post('/api/chat', authenticateToken, async (req, res) => {
  const user = await getUserById(req.user.id);
  const creditsNeeded = calculateCredits(req.body.message, req.body.file, false);
  
  if (user.api_credits < creditsNeeded) {
    return res.status(402).json({ 
      error: 'Insufficient credits',
      message: 'رصيدك من النقاط غير كافٍ. قم بالترقية للباقة المدفوعة.'
    });
  }
  
  // خصم النقاط
  await supabase
    .from('users')
    .update({ 
      api_credits: user.api_credits - creditsNeeded 
    })
    .eq('id', user.id);
  
  // ... باقي الكود
});
```

### نظام إعادة تعبئة النقاط:

```javascript
// تجديد النقاط شهرياً
const resetMonthlyCredits = async () => {
  const plans = {
    free: 50,
    student: 300,
    premium: -1 // غير محدود
  };
  
  await supabase
    .from('users')
    .update({ 
      api_credits: plans[user.subscription_tier]
    });
};
```

---

## 9️⃣ Checklist قبل الإطلاق 🚀

### الأمان:
- [ ] تغيير JWT_SECRET لشيء عشوائي قوي
- [ ] عدم مشاركة API Keys في GitHub
- [ ] تفعيل HTTPS (Vercel بيعملها تلقائياً)
- [ ] إضافة rate limiting (حد أقصى للطلبات)

### الأداء:
- [ ] ضغط الصور قبل الرفع
- [ ] استخدام CDN للملفات الثابتة
- [ ] تفعيل caching في Backend

### التجربة:
- [ ] اختبار على موبايل
- [ ] اختبار Dark Mode
- [ ] اختبار السبورة مع محتوى طويل
- [ ] اختبار الدفع (Stripe Test Mode)

### قانوني:
- [ ] إضافة Privacy Policy
- [ ] إضافة Terms of Service
- [ ] الامتثال لـ GDPR (إذا كان لديك مستخدمين أوروبيين)

---

## 🆘 حل المشاكل الشائعة

### المشكلة: "Cannot connect to database"
**الحل**: تأكد من صحة SUPABASE_URL و SUPABASE_KEY في ملف .env

### المشكلة: "CORS error"
**الحل**: أضف في Backend:
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'https://saboora.vercel.app']
}));
```

### المشكلة: "AI response too slow"
**الحل**: 
- استخدم Groq (أسرع)
- قلل `max_tokens` في API call
- أضف loading indicator

---

## 📞 الدعم والمساعدة

إذا واجهتك أي مشكلة:

1. راجع الـ Console في المتصفح (F12)
2. شوف الـ Logs في Railway/Vercel
3. ابحث في Google عن رسالة الخطأ
4. اسأل في:
   - Stack Overflow
   - Reddit: r/webdev
   - Discord: الكثير من communities للمطورين

---

## 🎉 تهانينا!

إذا وصلت هنا، يبقى موقعك شغال على الإنترنت! 🚀

**الخطوات التالية**:
1. شارك الموقع مع أصدقائك لأول 100 مستخدم
2. اطلب feedback
3. حسّن بناءً على المراجعات
4. ابدأ التسويق
5. راقب الإحصائيات وطوّر باستمرار

**حظ موفق! 🌟**
