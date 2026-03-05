// src/pages/InfoPages.jsx  (أو أي مسار تحطه فيه)
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Footer from "../components/Footer.module";
import HeroSection from "../components/HeroSection.module";
const _T = {
  navy: "#1e3c72", blue: "#2a5298", green: "#4CAF50",
  greenDark: "#45a049", bg: "#f5f7fa", white: "#ffffff",
  textMuted: "#666", border: "rgba(30,60,114,0.10)",
};

const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; direction: rtl; background: #f5f7fa; }

  .info-layout { display: flex; min-height: 100vh; font-family: 'Cairo',sans-serif; direction: rtl; background: #f5f7fa; }

  .info-sidebar {
    width: 230px; flex-shrink: 0; background: #fff;
    border-left: 1px solid rgba(30,60,114,0.10);
    padding: 20px 0; display: flex; flex-direction: column; gap: 2px;
    position: sticky; top: 0; height: 100vh; overflow-y: auto;
  }
  .sidebar-label {
    padding: 0 18px 12px; font-size: 11px; font-weight: 700; color: #666;
    text-transform: uppercase; letter-spacing: 1.5px;
    border-bottom: 1px solid rgba(30,60,114,0.10); margin-bottom: 8px;
  }
  .sidebar-btn {
    background: transparent; border: none; padding: 11px 18px; cursor: pointer;
    font-family: 'Cairo',sans-serif; font-size: 14px; font-weight: 500; color: #444;
    text-align: right; display: flex; align-items: center; gap: 10px;
    border-right: 3px solid transparent; transition: all 0.2s ease;
    border-radius: 0 8px 8px 0; margin-left: 6px;
  }
  .sidebar-btn:hover { background: #f5f7fa; color: #1e3c72; }
  .sidebar-btn.active {
    background: linear-gradient(90deg, rgba(30,60,114,0.07), rgba(42,82,152,0.03));
    color: #1e3c72; font-weight: 700; border-right-color: #4CAF50;
  }
  .sidebar-btn .s-icon { font-size: 17px; width: 24px; text-align: center; flex-shrink: 0; }

  .info-main { flex: 1; padding: 28px 32px;  width: 100%; }

  .mobile-tabs {
    display: none; overflow-x: auto; background: #fff;
    border-bottom: 1px solid rgba(30,60,114,0.10);
    padding: 0 8px; gap: 2px; scrollbar-width: none;
    position: sticky; top: 0; z-index: 50;
    box-shadow: 0 2px 8px rgba(30,60,114,0.08);
  }
  .mobile-tabs::-webkit-scrollbar { display: none; }
  .mobile-tab-btn {
    background: none; border: none; border-bottom: 3px solid transparent;
    padding: 12px 13px; font-family: 'Cairo',sans-serif; font-size: 13px;
    font-weight: 600; color: #666; white-space: nowrap; cursor: pointer;
    transition: all 0.2s; display: flex; align-items: center; gap: 5px; flex-shrink: 0;
  }
  .mobile-tab-btn.active { color: #1e3c72; border-bottom-color: #4CAF50; }

  .section-card {
    background: #fff; border-radius: 14px; border: 1px solid rgba(30,60,114,0.10);
    box-shadow: 0 2px 16px rgba(30,60,114,0.06); overflow: hidden; margin-bottom: 24px;
  }
  .section-head {
    padding: 18px 24px; display: flex; align-items: center; gap: 12px;
    border-bottom: 1px solid rgba(30,60,114,0.10);
    background: linear-gradient(135deg, rgba(30,60,114,0.03), rgba(42,82,152,0.05));
  }
  .section-head-icon {
    width: 42px; height: 42px; border-radius: 10px;
    background: linear-gradient(135deg, #1e3c72, #2a5298);
    display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;
  }
  .section-head h2 { font-size: 18px; font-weight: 700; color: #1e3c72; }
  .section-body { padding: 24px; }

  .breadcrumb { font-size: 13px; color: #666; display: flex; align-items: center; gap: 6px; margin-bottom: 20px; }
  .bc-home { color: #1e3c72; font-weight: 600; }

  .para { color: #444; font-size: 14.5px; line-height: 2; margin-bottom: 16px; }

  .bullet-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px dashed rgba(30,60,114,0.10); color: #444; font-size: 14.5px; line-height: 1.8; }
  .bullet-item:last-child { border-bottom: none; }
  .bullet-check { color: #4CAF50; font-weight: 700; flex-shrink: 0; margin-top: 2px; }

  .info-box { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: #f5f7fa; border: 1px solid rgba(30,60,114,0.10); border-radius: 10px; margin-bottom: 12px; transition: box-shadow 0.2s; }
  .info-box:hover { box-shadow: 0 4px 14px rgba(30,60,114,0.10); }
  .info-box-icon { width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0; background: linear-gradient(135deg, #1e3c72, #2a5298); display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .info-box-label { font-size: 11px; color: #666; font-weight: 600; margin-bottom: 2px; }
  .info-box-value { font-size: 14.5px; color: #1e3c72; font-weight: 700; }

  .faq-item { border: 1px solid rgba(30,60,114,0.10); border-radius: 10px; margin-bottom: 8px; overflow: hidden; }
  .faq-btn { width: 100%; background: #fff; border: none; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-family: 'Cairo',sans-serif; transition: background 0.25s; }
  .faq-btn.open { background: linear-gradient(135deg, #1e3c72, #2a5298); }
  .faq-q { font-size: 14.5px; font-weight: 700; text-align: right; }
  .faq-plus { font-size: 20px; font-weight: 700; flex-shrink: 0; transition: transform 0.3s; line-height: 1; }
  .faq-plus.open { transform: rotate(45deg); }
  .faq-answer { padding: 14px 18px; background: #f8f9ff; border-top: 1px solid rgba(30,60,114,0.10); font-size: 14px; color: #444; line-height: 2; }

  .step-card { display: flex; gap: 16px; align-items: flex-start; padding: 16px 18px; border: 1px solid rgba(30,60,114,0.10); border-radius: 10px; margin-bottom: 10px; background: #f5f7fa; }
  .step-num { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; background: linear-gradient(135deg, #4CAF50, #45a049); color: white; font-weight: 800; font-size: 17px; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(76,175,80,0.3); }
  .step-title { color: #1e3c72; font-weight: 700; font-size: 14.5px; margin-bottom: 3px; }
  .step-desc { color: #666; font-size: 13.5px; line-height: 1.7; }

  .about-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-top: 20px; }
  .about-card { background: linear-gradient(135deg, #1e3c72, #2a5298); border-radius: 12px; padding: 20px 16px; text-align: center; }
  .about-card-icon { font-size: 28px; margin-bottom: 8px; }
  .about-card-label { color: #4CAF50; font-weight: 700; font-size: 14px; margin-bottom: 5px; }
  .about-card-text { color: rgba(255,255,255,0.8); font-size: 12.5px; line-height: 1.7; }

  .ship-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(130px,1fr)); gap: 12px; margin-bottom: 20px; }
  .ship-card { background: #f5f7fa; border: 1px solid rgba(30,60,114,0.10); border-radius: 10px; padding: 16px 12px; text-align: center; }
  .ship-card-icon { font-size: 26px; margin-bottom: 6px; }
  .ship-card-label { color: #666; font-size: 11px; font-weight: 600; margin-bottom: 3px; }
  .ship-card-value { color: #1e3c72; font-weight: 700; font-size: 13.5px; }

  @media (max-width: 768px) {
    .info-sidebar { display: none; }
    .mobile-tabs { display: flex; }
    .info-main { padding: 20px 16px; max-width: 100%; }
    .section-body { padding: 18px 16px; }
    .section-head { padding: 14px 18px; }
    .about-grid { grid-template-columns: 1fr; }
  }
`;

const pages = [
  { id: "about", icon: "🏢", label: "من نحن" },
  { id: "contact", icon: "📞", label: "تواصل معانا" },
  { id: "terms", icon: "📄", label: "الشروط والأحكام" },
  { id: "privacy", icon: "🔒", label: "سياسة الخصوصية" },
  { id: "faq", icon: "❓", label: "الأسئلة الشائعة" },
  { id: "return", icon: "↩️", label: "الإرجاع والاستبدال" },
  { id: "shipping", icon: "🚚", label: "الشحن والتوصيل" },
];

function Section({ title, icon, children }) {
  return (
    <div className="section-card">
      <div className="section-head">
        <div className="section-head-icon">{icon}</div>
        <h2>{title}</h2>
      </div>
      <div className="section-body">{children}</div>
    </div>
  );
}

function BulletList({ items }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {items.map((item, i) => (
        <div key={i} className="bullet-item">
          <span className="bullet-check">✓</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function InfoBox({ icon, title, value }) {
  return (
    <div className="info-box">
      <div className="info-box-icon">{icon}</div>
      <div>
        <div className="info-box-label">{title}</div>
        <div className="info-box-value">{value}</div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button className={"faq-btn" + (open ? " open" : "")} onClick={() => setOpen(o => !o)}>
        <span className="faq-q" style={{ color: open ? "#fff" : "#1e3c72" }}>{q}</span>
        <span className={"faq-plus" + (open ? " open" : "")} style={{ color: open ? "#fff" : "#4CAF50" }}>+</span>
      </button>
      {open && <div className="faq-answer">{a}</div>}
    </div>
  );
}

function StepCard({ num, title, desc }) {
  return (
    <div className="step-card">
      <div className="step-num">{num}</div>
      <div>
        <div className="step-title">{title}</div>
        <div className="step-desc">{desc}</div>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <Section title="من نحن" icon="🏢">
      <p className="para">جملتك عندنا هي منصة متخصصة في بيع قطع غيار الأجهزة المنزلية بأسعار الجملة، نوصّلها لباب بيتك بسرعة وأمان.</p>
      <p className="para">بدأنا رحلتنا من إيمانٍ بأن الجودة والسعر المناسب حق للجميع، وبنينا منصتنا على أساس الثقة والشفافية.</p>
      <div className="about-grid">
        {[
          { icon: "🎯", label: "رؤيتنا", text: "نكون المنصة الأولى لقطع الغيار في المنطقة" },
          { icon: "💡", label: "مهمتنا", text: "توفير قطع غيار موثوقة بأسعار تنافسية" },
          { icon: "❤️", label: "قيمنا", text: "الأمانة والجودة والخدمة المتميزة" },
        ].map(c => (
          <div key={c.label} className="about-card">
            <div className="about-card-icon">{c.icon}</div>
            <div className="about-card-label">{c.label}</div>
            <div className="about-card-text">{c.text}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ContactPage() {
  return (
    <Section title="تواصل معانا" icon="📞">
      <p className="para">فريقنا متاح طول الوقت لمساعدتك.</p>
      <InfoBox icon="📱" title="واتساب" value="+20 1XX XXX XXXX" />
      <InfoBox icon="📧" title="البريد الإلكتروني" value="support@gamaltakendna.com" />
      <InfoBox icon="🕐" title="ساعات العمل" value="السبت – الخميس، من 9 صباحًا لـ 10 مساءً" />
      <InfoBox icon="📍" title="العنوان" value="القاهرة، مصر" />
    </Section>
  );
}

function TermsPage() {
  return (
    <Section title="الشروط والأحكام" icon="📄">
      <p className="para">باستخدامك للموقع، أنت توافق على الشروط والأحكام التالية.</p>
      <BulletList items={[
        "يجب أن يكون عمر المستخدم 18 سنة فأكثر.",
        "يلتزم المستخدم بتقديم بيانات صحيحة عند التسجيل.",
        "الأسعار قابلة للتغيير دون إشعار مسبق.",
        "المنصة غير مسؤولة عن أي سوء استخدام من طرف العميل.",
        "يحق للمنصة إيقاف أي حساب يخالف السياسات.",
        "جميع الحقوق الفكرية محفوظة لشركة جملتك عندنا.",
      ]} />
    </Section>
  );
}

function PrivacyPage() {
  return (
    <Section title="سياسة الخصوصية" icon="🔒">
      <p className="para">خصوصيتك تهمنا. نوضح هنا كيف نجمع ونستخدم ونحمي بياناتك الشخصية.</p>
      <BulletList items={[
        "نجمع فقط البيانات الضرورية لإتمام طلبك.",
        "لا نبيع أو نشارك بياناتك مع أطراف خارجية إلا بموافقتك.",
        "نستخدم تشفيرًا عاليًا المستوى لحماية معلوماتك.",
        "يمكنك طلب حذف حسابك وبياناتك في أي وقت.",
        "نستخدم ملفات الكوكيز لتحسين تجربتك على الموقع.",
      ]} />
    </Section>
  );
}

const faqData = [
  { q: "إزاي أقدر أسجّل على الموقع؟", a: "الدخول سهل! اضغط على زر 'تسجيل الدخول' وادخل رقم موبايلك، هيوصلك كود تأكيد وتبدأ تتسوق على طول." },
  { q: "هل الأسعار شاملة ضريبة القيمة المضافة؟", a: "أيوه، جميع الأسعار المعروضة على الموقع شاملة لكل الضرايب والرسوم." },
  { q: "إزاي أتابع طلبي بعد الشراء؟", a: "بعد ما تكمّل طلبك، هتلاقي في حسابك قسم 'طلباتي' فيه كل تفاصيل الطلب وحالة التوصيل لحظة بلحظة." },
  { q: "هل ممكن أرجع المنتج لو مش عاجبني؟", a: "أكيد! لديك 14 يوم من تاريخ الاستلام لإرجاع أي منتج بشرط أن يكون في حالته الأصلية مع غلافه." },
  { q: "ما هي طرق الدفع المتاحة؟", a: "نقبل الدفع عند الاستلام (كاش)، الدفع بالبطاقة الائتمانية، وتحويل بنكي. قريبًا هنضيف المحافظ الإلكترونية." },
];

function FaqPage() {
  return (
    <Section title="الأسئلة الشائعة" icon="❓">
      <p className="para">إجابات على أكتر الأسئلة اللي بتتسألنا عنها.</p>
      {faqData.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
    </Section>
  );
}

function ReturnPage() {
  return (
    <Section title="الإرجاع والاستبدال" icon="↩️">
      <p className="para">نضمن لك حق الإرجاع والاستبدال خلال 14 يوم من تاريخ الاستلام.</p>
      <BulletList items={[
        "المنتج في حالته الأصلية ولم يُستخدم.",
        "الغلاف الأصلي سليم وغير تالف.",
        "الفاتورة أو إيصال الشراء متوفر.",
        "لا ينطبق الإرجاع على المنتجات المخصصة أو المُعدَّلة.",
      ]} />
      <div style={{ marginTop: 16 }}>
        <StepCard num="1" title="تواصل معنا" desc="أرسل طلب الإرجاع عبر الواتساب أو البريد مع رقم طلبك." />
        <StepCard num="2" title="تأكيد الطلب" desc="هيتواصل معك فريقنا خلال 24 ساعة لتأكيد طلب الإرجاع." />
        <StepCard num="3" title="إرسال المنتج" desc="ارسل المنتج على العنوان المحدد أو انتظر مندوب الاستلام." />
        <StepCard num="4" title="الاسترداد" desc="بعد مراجعة المنتج، يتم رد المبلغ خلال 3–5 أيام عمل." />
      </div>
    </Section>
  );
}

function ShippingPage() {
  return (
    <Section title="الشحن والتوصيل" icon="🚚">
      <p className="para">نوصّل لجميع محافظات مصر بسرعة وأمان.</p>
      <div className="ship-grid">
        {[
          { icon: "⏱️", title: "وقت التوصيل", value: "2 – 5 أيام عمل" },
          { icon: "💰", title: "رسوم الشحن", value: "تبدأ من 35 جنيه" },
          { icon: "🆓", title: "شحن مجاني", value: "فوق 500 جنيه" },
          { icon: "🗺️", title: "التغطية", value: "جميع المحافظات" },
        ].map(c => (
          <div key={c.title} className="ship-card">
            <div className="ship-card-icon">{c.icon}</div>
            <div className="ship-card-label">{c.title}</div>
            <div className="ship-card-value">{c.value}</div>
          </div>
        ))}
      </div>
      <BulletList items={[
        "يتم تأكيد الطلب واستلامه قبل بدء الشحن.",
        "ستتلقى رسالة SMS عند شحن طلبك.",
        "في حالة عدم التواجد، سيحاول المندوب مرة أخرى.",
        "يمكنك تتبع طلبك من خلال حسابك على الموقع.",
      ]} />
    </Section>
  );
}

const pageComponents = {
  about: AboutPage, contact: ContactPage, terms: TermsPage,
  privacy: PrivacyPage, faq: FaqPage, return: ReturnPage, shipping: ShippingPage,
};

export default function InfoPages() {
  const [searchParams, setSearchParams] = useSearchParams();
  // قراءة الـ page من الـ URL query string، لو مفيش يبدأ بـ about
  const pageFromUrl = searchParams.get('page');
  const validIds = pages.map(p => p.id);
  const [active, setActive] = useState(
    validIds.includes(pageFromUrl) ? pageFromUrl : "about"
  );

  const handleSelect = (id) => {
    setActive(id);
    setSearchParams({ page: id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const PageComp = pageComponents[active];
  const currentPage = pages.find(p => p.id === active);

  return (
    <>
      <HeroSection showExtra={false} />
      <style>{globalStyle}</style>
      <div className="mobile-tabs">
        {pages.map(p => (
          <button
            key={p.id}
            className={"mobile-tab-btn" + (active === p.id ? " active" : "")}
            onClick={() => handleSelect(p.id)}
          >
            <span>{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
      <div className="info-layout">
        <aside className="info-sidebar">
          <div className="sidebar-label">الصفحات</div>
          {pages.map(p => (
            <button
              key={p.id}
              className={"sidebar-btn" + (active === p.id ? " active" : "")}
              onClick={() => handleSelect(p.id)}
            >
              <span className="s-icon">{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </aside>
        <main className="info-main">
          <div className="breadcrumb">
            <span className="bc-home">الرئيسية</span>
            <span>›</span>
            <span>{currentPage?.label}</span>
          </div>
          <PageComp />
        </main>
      </div>
      <Footer />
    </>
  );
}