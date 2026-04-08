import React, { useState } from 'react';
import { motion } from 'framer-motion';

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState('monthly'); // monthly or yearly
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (planId) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/subscription/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          planId: planId,
          userId: getCurrentUserId()
        })
      });
      
      const { url } = await response.json();
      
      // الانتقال لصفحة الدفع
      window.location.href = url;
      
    } catch (error) {
      console.error('Subscription error:', error);
      alert('حدث خطأ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const plans = {
    free: {
      name: 'مجاني',
      nameEn: 'Free',
      price: 0,
      icon: '📚',
      color: 'gray',
      features: [
        { text: '50 سؤال شهرياً', included: true },
        { text: 'وصول للسبورة التفاعلية', included: true },
        { text: '3 اختبارات شهرياً', included: true },
        { text: 'حفظ المحادثات 7 أيام', included: true },
        { text: 'شرح بالصوت', included: false },
        { text: 'تحليل الصور', included: false },
        { text: 'دعم ذو أولوية', included: false }
      ],
      cta: 'ابدأ مجاناً',
      popular: false
    },
    
    student: {
      name: 'طالب',
      nameEn: 'Student',
      price: billingCycle === 'monthly' ? 9.99 : 99,
      icon: '🎓',
      color: 'blue',
      features: [
        { text: '300 سؤال شهرياً', included: true },
        { text: 'وصول للسبورة التفاعلية', included: true },
        { text: 'اختبارات غير محدودة', included: true },
        { text: 'حفظ المحادثات للأبد', included: true },
        { text: 'شرح بالصوت (Text-to-Speech)', included: true },
        { text: 'تحليل الصور والملفات', included: true },
        { text: 'دعم ذو أولوية', included: true }
      ],
      cta: 'اشترك الآن',
      popular: true,
      savings: billingCycle === 'yearly' ? 'وفّر 17%' : null
    },
    
    premium: {
      name: 'بريميوم',
      nameEn: 'Premium',
      price: billingCycle === 'monthly' ? 19.99 : 199,
      icon: '👑',
      color: 'purple',
      features: [
        { text: 'أسئلة غير محدودة', included: true },
        { text: 'كل مميزات الباقة الطلابية', included: true },
        { text: 'تحميل الشروحات PDF', included: true },
        { text: 'إحصائيات متقدمة', included: true },
        { text: 'وصول مبكر للمميزات الجديدة', included: true },
        { text: 'دعم فني مخصص', included: true },
        { text: 'ضمان استرداد 30 يوم', included: true }
      ],
      cta: 'احصل على Premium',
      popular: false
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4" dir="rtl">
      {/* Header */}
      <div className="max-w-7xl mx-auto text-center mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-gray-900 mb-4"
        >
          اختر الباقة المناسبة لك
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-gray-600 mb-8"
        >
          ابدأ رحلتك التعليمية مع مدرسك الخاص المدعوم بالذكاء الاصطناعي
        </motion.p>

        {/* Billing Cycle Toggle */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="inline-flex items-center bg-white rounded-full p-1 shadow-lg"
        >
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-3 rounded-full transition-all font-medium ${
              billingCycle === 'monthly'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            شهري
          </button>
          
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-3 rounded-full transition-all font-medium relative ${
              billingCycle === 'yearly'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            سنوي
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
              وفّر 17%
            </span>
          </button>
        </motion.div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {Object.entries(plans).map(([key, plan], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative bg-white rounded-2xl shadow-xl overflow-hidden ${
              plan.popular ? 'ring-4 ring-blue-500 scale-105' : ''
            }`}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center py-2 font-bold text-sm">
                الأكثر شعبية 🔥
              </div>
            )}

            <div className={`p-8 ${plan.popular ? 'pt-12' : ''}`}>
              {/* Icon */}
              <div className="text-6xl mb-4">{plan.icon}</div>

              {/* Plan Name */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-extrabold text-gray-900">
                    ${plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-500 mr-2">
                      /{billingCycle === 'monthly' ? 'شهر' : 'سنة'}
                    </span>
                  )}
                </div>
                
                {plan.savings && (
                  <div className="mt-2 text-green-600 font-medium">
                    {plan.savings}
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      feature.included
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {feature.included ? '✓' : '✕'}
                    </span>
                    <span className={`text-sm ${
                      feature.included ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => {
                  if (key === 'free') {
                    window.location.href = '/signup';
                  } else {
                    const planId = `${key}_${billingCycle}`;
                    handleSubscribe(planId);
                  }
                }}
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl'
                    : key === 'free'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
                }`}
              >
                {isLoading ? 'جاري التحميل...' : plan.cta}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto">
        <motion.h2 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl font-bold text-center mb-8"
        >
          الأسئلة الشائعة
        </motion.h2>

        <div className="space-y-4">
          {[
            {
              q: 'هل يمكنني إلغاء الاشتراك في أي وقت؟',
              a: 'نعم، يمكنك إلغاء اشتراكك في أي وقت من لوحة التحكم. لن يتم محاسبتك بعد نهاية الفترة الحالية.'
            },
            {
              q: 'ماذا يحدث عند نفاد النقاط؟',
              a: 'في الباقة المجانية، عليك الانتظار حتى تجديد النقاط في بداية الشهر التالي. في الباقات المدفوعة، يتم تجديد النقاط تلقائياً كل شهر.'
            },
            {
              q: 'هل يمكنني الترقية من باقة لأخرى؟',
              a: 'بالطبع! يمكنك الترقية في أي وقت وسيتم احتساب الفرق في السعر فقط.'
            },
            {
              q: 'هل الأسعار شاملة الضرائب؟',
              a: 'الأسعار المعروضة قبل الضرائب. قد تُضاف ضرائب إضافية حسب بلدك.'
            },
            {
              q: 'ما هي وسائل الدفع المقبولة؟',
              a: 'نقبل جميع بطاقات الائتمان الرئيسية (Visa, Mastercard, American Express) والمحافظ الإلكترونية.'
            }
          ].map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg p-6 shadow-md"
            >
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                {faq.q}
              </h3>
              <p className="text-gray-600">
                {faq.a}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="max-w-4xl mx-auto mt-16 text-center">
        <div className="flex flex-wrap justify-center items-center gap-8 text-gray-500">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔒</span>
            <span className="font-medium">دفع آمن 256-bit SSL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💳</span>
            <span className="font-medium">جميع وسائل الدفع</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">↩️</span>
            <span className="font-medium">ضمان استرداد 30 يوم</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function
function getCurrentUserId() {
  // من localStorage أو من context
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id;
  } catch {
    return null;
  }
}

export default PricingPage;
