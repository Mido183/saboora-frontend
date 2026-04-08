// subscription-system.js - نظام الباقات والدفع الكامل

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');
const router = express.Router();

// ============================================
// خطط الاشتراك (Pricing Plans)
// ============================================

const PLANS = {
  free: {
    name: 'Free',
    nameAr: 'مجاني',
    price: 0,
    credits: 50,
    features: {
      questions: 50,
      quizzes: 3,
      voiceEnabled: false,
      historyDays: 7,
      imageAnalysis: false,
      priority: false
    },
    limits: {
      questionsPerDay: 5,
      questionsPerMonth: 50
    }
  },
  
  student_monthly: {
    name: 'Student Monthly',
    nameAr: 'طالب - شهري',
    price: 9.99,
    priceId: 'price_student_monthly', // من Stripe
    credits: 300,
    features: {
      questions: 300,
      quizzes: 'unlimited',
      voiceEnabled: true,
      historyDays: 'unlimited',
      imageAnalysis: true,
      priority: true
    },
    limits: {
      questionsPerDay: 20,
      questionsPerMonth: 300
    }
  },
  
  student_yearly: {
    name: 'Student Yearly',
    nameAr: 'طالب - سنوي',
    price: 99.00,
    priceId: 'price_student_yearly',
    credits: 300,
    savings: '17%',
    features: {
      questions: 300,
      quizzes: 'unlimited',
      voiceEnabled: true,
      historyDays: 'unlimited',
      imageAnalysis: true,
      priority: true
    },
    limits: {
      questionsPerDay: 20,
      questionsPerMonth: 300
    }
  },
  
  premium_monthly: {
    name: 'Premium Monthly',
    nameAr: 'بريميوم - شهري',
    price: 19.99,
    priceId: 'price_premium_monthly',
    credits: -1, // unlimited
    features: {
      questions: 'unlimited',
      quizzes: 'unlimited',
      voiceEnabled: true,
      historyDays: 'unlimited',
      imageAnalysis: true,
      priority: true,
      pdfExport: true,
      advancedAnalytics: true,
      earlyAccess: true
    },
    limits: {
      questionsPerDay: 100,
      questionsPerMonth: -1 // unlimited
    }
  },
  
  premium_yearly: {
    name: 'Premium Yearly',
    nameAr: 'بريميوم - سنوي',
    price: 199.00,
    priceId: 'price_premium_yearly',
    credits: -1,
    savings: '17%',
    features: {
      questions: 'unlimited',
      quizzes: 'unlimited',
      voiceEnabled: true,
      historyDays: 'unlimited',
      imageAnalysis: true,
      priority: true,
      pdfExport: true,
      advancedAnalytics: true,
      earlyAccess: true
    },
    limits: {
      questionsPerDay: 100,
      questionsPerMonth: -1
    }
  }
};

// ============================================
// إنشاء جلسة دفع (Stripe Checkout)
// ============================================

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { planId, userId } = req.body;
    
    if (!PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    const plan = PLANS[planId];
    
    // إنشاء Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: req.user.email,
      client_reference_id: userId,
      payment_method_types: ['card'],
      
      line_items: [
        {
          price: plan.priceId,
          quantity: 1
        }
      ],
      
      mode: 'subscription',
      
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      
      metadata: {
        userId: userId,
        planId: planId
      },
      
      subscription_data: {
        metadata: {
          userId: userId,
          planId: planId
        }
      }
    });
    
    res.json({ 
      sessionId: session.id,
      url: session.url 
    });
    
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ============================================
// Webhook من Stripe (عند نجاح الدفع)
// ============================================

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // معالجة الأحداث المختلفة
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;
      
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionCancel(event.data.object);
      break;
      
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }
  
  res.json({ received: true });
});

// ============================================
// معالج إتمام الدفع
// ============================================

async function handleCheckoutComplete(session) {
  const userId = session.metadata.userId;
  const planId = session.metadata.planId;
  const plan = PLANS[planId];
  
  // تحديث الاشتراك في القاعدة
  const { error } = await supabase
    .from('subscriptions')
    .insert([
      {
        user_id: userId,
        plan_name: planId,
        status: 'active',
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer,
        started_at: new Date(),
        expires_at: calculateExpiryDate(planId)
      }
    ]);
  
  if (error) {
    console.error('Subscription insert error:', error);
    return;
  }
  
  // تحديث بيانات المستخدم
  await supabase
    .from('users')
    .update({
      subscription_tier: planId,
      api_credits: plan.credits
    })
    .eq('id', userId);
  
  // إرسال إيميل ترحيب
  await sendWelcomeEmail(userId, planId);
  
  console.log(`✅ Subscription activated for user ${userId}: ${planId}`);
}

// ============================================
// حساب تاريخ انتهاء الاشتراك
// ============================================

function calculateExpiryDate(planId) {
  const now = new Date();
  
  if (planId.includes('yearly')) {
    return new Date(now.setFullYear(now.getFullYear() + 1));
  } else if (planId.includes('monthly')) {
    return new Date(now.setMonth(now.getMonth() + 1));
  }
  
  return null; // للخطة المجانية
}

// ============================================
// معالج تحديث الاشتراك
// ============================================

async function handleSubscriptionUpdate(subscription) {
  const userId = subscription.metadata.userId;
  
  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      updated_at: new Date()
    })
    .eq('stripe_subscription_id', subscription.id);
  
  console.log(`📝 Subscription updated for ${userId}`);
}

// ============================================
// معالج إلغاء الاشتراك
// ============================================

async function handleSubscriptionCancel(subscription) {
  const userId = subscription.metadata.userId;
  
  // تحديث حالة الاشتراك
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date()
    })
    .eq('stripe_subscription_id', subscription.id);
  
  // إرجاع المستخدم للخطة المجانية
  await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      api_credits: PLANS.free.credits
    })
    .eq('id', userId);
  
  console.log(`❌ Subscription canceled for ${userId}`);
}

// ============================================
// معالج فشل الدفع
// ============================================

async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;
  
  // البحث عن المستخدم
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();
  
  if (subscription) {
    // إرسال إيميل تنبيه
    await sendPaymentFailedEmail(subscription.user_id);
  }
  
  console.log(`⚠️ Payment failed for customer ${customerId}`);
}

// ============================================
// نظام النقاط (Credits System)
// ============================================

async function deductCredits(userId, amount) {
  // جلب بيانات المستخدم
  const { data: user } = await supabase
    .from('users')
    .select('api_credits, subscription_tier')
    .eq('id', userId)
    .single();
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Premium لديه نقاط غير محدودة
  if (user.api_credits === -1) {
    return true;
  }
  
  // التحقق من وجود نقاط كافية
  if (user.api_credits < amount) {
    throw new Error('Insufficient credits');
  }
  
  // خصم النقاط
  const { error } = await supabase
    .from('users')
    .update({
      api_credits: user.api_credits - amount
    })
    .eq('id', userId);
  
  if (error) {
    throw new Error('Failed to deduct credits');
  }
  
  return true;
}

// حساب تكلفة السؤال
function calculateQuestionCost(message, options = {}) {
  let cost = 1; // السؤال الأساسي
  
  if (options.hasImage) cost += 2;
  if (options.hasVoice) cost += 1;
  if (options.hasFile) cost += 1;
  if (message.length > 500) cost += 1;
  
  return cost;
}

// ============================================
// تجديد النقاط الشهري (Cron Job)
// ============================================

async function resetMonthlyCredits() {
  // جلب كل المستخدمين
  const { data: users } = await supabase
    .from('users')
    .select('id, subscription_tier');
  
  for (const user of users) {
    const plan = PLANS[user.subscription_tier];
    
    if (plan && plan.credits !== -1) {
      await supabase
        .from('users')
        .update({
          api_credits: plan.credits
        })
        .eq('id', user.id);
    }
  }
  
  console.log('✅ Monthly credits reset completed');
}

// تشغيل كل شهر (استخدم cron job أو Vercel Cron)
// في production، استخدم: https://vercel.com/docs/cron-jobs

// ============================================
// إدارة الاشتراك (Customer Portal)
// ============================================

router.post('/create-portal-session', async (req, res) => {
  try {
    const { userId } = req.body;
    
    // جلب Stripe Customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();
    
    if (!subscription || !subscription.stripe_customer_id) {
      return res.status(404).json({ error: 'No active subscription' });
    }
    
    // إنشاء Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/dashboard`
    });
    
    res.json({ url: session.url });
    
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// ============================================
// التحقق من صلاحية الاشتراك
// ============================================

async function checkSubscriptionValid(userId) {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  
  if (!subscription) {
    return { valid: false, tier: 'free' };
  }
  
  // التحقق من تاريخ الانتهاء
  if (subscription.expires_at) {
    const now = new Date();
    const expiryDate = new Date(subscription.expires_at);
    
    if (now > expiryDate) {
      // الاشتراك منتهي
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('id', subscription.id);
      
      return { valid: false, tier: 'free' };
    }
  }
  
  return { 
    valid: true, 
    tier: subscription.plan_name,
    expiresAt: subscription.expires_at
  };
}

// ============================================
// Middleware للتحقق من الاشتراك
// ============================================

const requireSubscription = (minTier = 'student') => {
  return async (req, res, next) => {
    const userId = req.user.id;
    
    const subscription = await checkSubscriptionValid(userId);
    
    if (!subscription.valid) {
      return res.status(402).json({
        error: 'Subscription required',
        message: 'يتطلب هذا الإجراء اشتراكاً مدفوعاً'
      });
    }
    
    // التحقق من المستوى المطلوب
    const tierLevel = {
      'free': 0,
      'student_monthly': 1,
      'student_yearly': 1,
      'premium_monthly': 2,
      'premium_yearly': 2
    };
    
    if (tierLevel[subscription.tier] < tierLevel[minTier]) {
      return res.status(403).json({
        error: 'Higher tier required',
        message: 'يتطلب هذا الإجراء باقة أعلى'
      });
    }
    
    req.subscription = subscription;
    next();
  };
};

// ============================================
// الإحصائيات والأرباح
// ============================================

router.get('/admin/revenue-stats', async (req, res) => {
  try {
    // عدد المشتركين
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('plan_name')
      .eq('status', 'active');
    
    const stats = {
      total: subscriptions.length,
      byPlan: {},
      revenue: {
        monthly: 0,
        yearly: 0,
        total: 0
      }
    };
    
    // حساب الإيرادات
    for (const sub of subscriptions) {
      const plan = PLANS[sub.plan_name];
      
      if (!plan) continue;
      
      stats.byPlan[sub.plan_name] = (stats.byPlan[sub.plan_name] || 0) + 1;
      
      if (sub.plan_name.includes('monthly')) {
        stats.revenue.monthly += plan.price;
      } else if (sub.plan_name.includes('yearly')) {
        stats.revenue.yearly += plan.price;
      }
    }
    
    stats.revenue.total = stats.revenue.monthly + (stats.revenue.yearly / 12);
    
    res.json(stats);
    
  } catch (error) {
    console.error('Revenue stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============================================
// Export
// ============================================

module.exports = {
  router,
  PLANS,
  deductCredits,
  calculateQuestionCost,
  checkSubscriptionValid,
  requireSubscription,
  resetMonthlyCredits
};
