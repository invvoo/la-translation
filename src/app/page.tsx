import Link from 'next/link'
import { ArrowRight, Phone, Mail, MapPin, Clock, CheckCircle2 } from 'lucide-react'
import { LogoImage } from '@/components/logo-image'

const SERVICES = [
  {
    title: 'Translation',
    description: 'Certified document translation accepted by USCIS, courts, and government agencies worldwide. Legal, medical, patent, real estate, website localization, and more.',
    href: '/translation',
    cta: 'Request a Translation',
    highlights: ['200+ languages', 'USCIS-accepted', 'Kept on file 3 years', 'Notarized & sealed'],
  },
  {
    title: 'Interpretation',
    description: 'Court-certified and CCHI-certified medical interpreters. Simultaneous, consecutive, escort, phone, and video interpretation in any language.',
    href: '/interpretation',
    cta: 'Request an Interpreter',
    highlights: ['Court certified', 'Medical (CCHI)', 'Simultaneous up to 90 langs', 'Phone available'],
  },
  {
    title: 'Equipment Rental',
    description: 'Simultaneous interpreting equipment for conferences, meetings, and events. Transmitters, receivers, booths, whisper cubes, and on-site technician support.',
    href: '/equipment-rental',
    cta: 'Rent Equipment',
    highlights: ['Transmitters & receivers', 'Soundproof booths', 'Whisper cubes', 'On-site technician'],
  },
  {
    title: 'Notary & Apostille',
    description: 'Certified translations notarized, sealed, and stamped. Apostille service for international use. Legal Document Assistant services available.',
    href: '/notary',
    cta: 'Get Certified',
    highlights: ['Apostille service', 'USCIS accepted', 'Immigration documents', 'Bankruptcy & divorce'],
  },
]

const STATS = [
  { value: '2003', label: 'In Business Since' },
  { value: '2,000+', label: 'Certified Translators' },
  { value: '200+', label: 'Languages' },
  { value: '20+', label: 'Years Experience' },
]

const SPECIALTIES = [
  'Legal & Contract', 'Medical & Healthcare', 'Patent (MA/PhD Translators)', 'Real Estate & Mortgage',
  'Immigration (USCIS)', 'Website Localization', 'Software & App Localization', 'Video Game Localization',
  'Transcription & Subtitling', 'Court Proceedings', 'Government & Regulatory', 'Financial Documents',
]

const CLIENT_CATEGORIES = [
  {
    label: 'Entertainment & Media',
    translation_clients: 'CBS · Fox · DreamWorks · Columbia Pictures · NBCUniversal',
  },
  {
    label: 'Law Firms',
    translation_clients: 'Baker & McKenzie · Sullivan & Cromwell · McDermott Will & Emery · Sheppard Mullin',
  },
  {
    label: 'Healthcare & Academic',
    translation_clients: 'UCLA · USC · Cedar Sinai · City of Hope · Good Samaritan',
  },
  {
    label: 'Government & International',
    translation_clients: 'FBI · LA Superior Court · DHS · SEC · United Nations · UNICEF · OECD',
  },
  {
    label: 'Corporations',
    translation_clients: 'Johnson & Johnson · Pfizer · and hundreds more',
  },
]

const INTERPRETATION_TYPES = [
  { name: 'Simultaneous', desc: 'Live, real-time interpretation for conferences and large events — up to 90 languages simultaneously.' },
  { name: 'Court Certified', desc: 'State-certified court interpreters for depositions, hearings, trials, and legal proceedings.' },
  { name: 'Medical', desc: 'National Board and CCHI-certified medical interpreters for hospitals, clinics, and medical travel abroad.' },
  { name: 'Escort', desc: 'Accompanying interpreter for business travel, site visits, and one-on-one meetings.' },
  { name: 'Phone / Video', desc: 'On-demand phone and video interpretation. Available 24/7 for emergencies.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <LogoImage className="h-8 w-auto" />
            <span className="text-[#1a1a2e] font-bold text-lg">L.A. Translation &amp; Interpretation</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#services" className="hover:text-[#1a1a2e]">Services</a>
            <a href="#translation_clients" className="hover:text-[#1a1a2e]">Clients</a>
            <a href="#contact" className="hover:text-[#1a1a2e]">Contact</a>
            <a href="tel:2133857781" className="flex items-center gap-1.5 text-[#1a1a2e] font-medium hover:underline">
              <Phone className="h-3.5 w-3.5" />(213) 385-7781
            </a>
            <Link href="/client/login" className="text-gray-600 hover:text-[#1a1a2e] transition-colors">
              Client Portal
            </Link>
            <Link href="/vendor/login" className="px-4 py-1.5 rounded-lg bg-[#1a1a2e] text-white text-xs font-medium hover:bg-[#2a2a4e] transition-colors">
              Vendor Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#1a1a2e] text-white py-24 px-6 overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-3xl" />
        </div>

        {/* Floating language words */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden>
          {/* Far-back large ghost words for depth */}
          <span className="absolute font-black text-[7rem] leading-none text-white/[0.03]" style={{ top: '-5%', left: '-2%' }}>翻訳</span>
          <span className="absolute font-black text-[6rem] leading-none text-blue-400/[0.06]" style={{ bottom: '-8%', right: '-1%' }}>Traducción</span>

          {/* Left side — animated */}
          <span className="lang-float-slow absolute font-bold text-4xl text-white/[0.18]"
            style={{ top: '7%', left: '3%', '--rot': '-8deg' } as React.CSSProperties}>Hola</span>
          <span className="lang-float-mid absolute font-bold text-2xl text-blue-300/[0.22]"
            style={{ top: '26%', left: '1%', '--rot': '5deg', animationDelay: '1.2s' } as React.CSSProperties}>こんにちは</span>
          <span className="lang-float-slow absolute font-bold text-3xl text-white/[0.15]"
            style={{ top: '47%', left: '3%', '--rot': '-4deg', animationDelay: '2.5s' } as React.CSSProperties}>Bonjour</span>
          <span className="lang-float-fast absolute font-bold text-3xl text-indigo-300/[0.20]"
            style={{ top: '66%', left: '2%', '--rot': '7deg', animationDelay: '0.8s' } as React.CSSProperties}>مرحبا</span>
          <span className="lang-float-mid absolute font-bold text-2xl text-white/[0.14]"
            style={{ top: '84%', left: '5%', '--rot': '-3deg', animationDelay: '3s' } as React.CSSProperties}>Ciao</span>

          {/* Right side — animated */}
          <span className="lang-float-mid absolute font-bold text-4xl text-blue-200/[0.20]"
            style={{ top: '5%', right: '3%', '--rot': '6deg', animationDelay: '0.5s' } as React.CSSProperties}>你好</span>
          <span className="lang-float-slow absolute font-bold text-2xl text-white/[0.16]"
            style={{ top: '23%', right: '2%', '--rot': '-7deg', animationDelay: '1.8s' } as React.CSSProperties}>Привет</span>
          <span className="lang-float-fast absolute font-bold text-2xl text-blue-300/[0.18]"
            style={{ top: '43%', right: '2%', '--rot': '4deg', animationDelay: '2.2s' } as React.CSSProperties}>안녕하세요</span>
          <span className="lang-float-mid absolute font-bold text-3xl text-indigo-200/[0.18]"
            style={{ top: '62%', right: '4%', '--rot': '-5deg', animationDelay: '0.3s' } as React.CSSProperties}>Olá</span>
          <span className="lang-float-slow absolute font-bold text-2xl text-white/[0.15]"
            style={{ top: '80%', right: '3%', '--rot': '8deg', animationDelay: '1.5s' } as React.CSSProperties}>Merhaba</span>

          {/* Top scattered */}
          <span className="lang-float-fast absolute font-bold text-2xl text-blue-200/[0.16]"
            style={{ top: '6%', left: '17%', '--rot': '-3deg', animationDelay: '2s' } as React.CSSProperties}>नमस्ते</span>
          <span className="lang-float-mid absolute font-bold text-xl text-white/[0.14]"
            style={{ top: '4%', left: '52%', '--rot': '3deg', animationDelay: '1s' } as React.CSSProperties}>Hallo</span>
          <span className="lang-float-slow absolute font-bold text-3xl text-indigo-300/[0.18]"
            style={{ top: '9%', right: '21%', '--rot': '-6deg', animationDelay: '2.8s' } as React.CSSProperties}>שלום</span>

          {/* Bottom scattered */}
          <span className="lang-float-mid absolute font-bold text-2xl text-white/[0.14]"
            style={{ bottom: '13%', left: '17%', '--rot': '4deg', animationDelay: '1.6s' } as React.CSSProperties}>Xin chào</span>
          <span className="lang-float-fast absolute font-bold text-2xl text-blue-300/[0.16]"
            style={{ bottom: '9%', left: '40%', '--rot': '-3deg', animationDelay: '0.7s' } as React.CSSProperties}>Γεια σου</span>
          <span className="lang-float-slow absolute font-bold text-xl text-white/[0.13]"
            style={{ bottom: '15%', right: '19%', '--rot': '5deg', animationDelay: '2.3s' } as React.CSSProperties}>Sawubona</span>
          <span className="lang-float-mid absolute font-bold text-2xl text-indigo-200/[0.17]"
            style={{ bottom: '7%', right: '36%', '--rot': '-4deg', animationDelay: '1.1s' } as React.CSSProperties}>ہیلو</span>

          {/* Mid-field accent words */}
          <span className="lang-float-slow absolute font-bold text-xl text-blue-200/[0.13]"
            style={{ top: '35%', left: '13%', '--rot': '2deg', animationDelay: '3.2s' } as React.CSSProperties}>Shalom</span>
          <span className="lang-float-fast absolute font-bold text-xl text-white/[0.12]"
            style={{ top: '55%', right: '14%', '--rot': '-2deg', animationDelay: '0.4s' } as React.CSSProperties}>Привіт</span>
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-blue-200 text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
            Los Angeles · Since 2003 · 2,000+ Certified Professionals
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
            Professional Translation<br /><span className="text-blue-400">&amp; Interpretation</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Certified translations accepted by USCIS, courts, and government agencies.
            Serving law firms, hospitals, corporations, and government since 2003.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/translation"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#1a1a2e] rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg shadow-black/20">
              Get a Translation Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/interpretation"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/30 bg-white/5 rounded-xl font-medium hover:bg-white/15 transition-colors backdrop-blur-sm">
              Book an Interpreter
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-blue-600 text-white py-8 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-blue-100 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1a1a2e]">Our Services</h2>
            <p className="text-gray-500 mt-2">End-to-end language solutions for every need</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {SERVICES.map((svc) => (
              <div key={svc.title} className="bg-white rounded-2xl border border-gray-100 p-7 flex flex-col shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1a1a2e]/5 flex items-center justify-center flex-shrink-0 group-hover:bg-[#1a1a2e]/10 transition-colors">
                    {svc.title === 'Translation' && <span className="text-lg">📄</span>}
                    {svc.title === 'Interpretation' && <span className="text-lg">🎙️</span>}
                    {svc.title === 'Equipment Rental' && <span className="text-lg">🎧</span>}
                    {svc.title === 'Notary & Apostille' && <span className="text-lg">✒️</span>}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#1a1a2e]">{svc.title}</h3>
                    <p className="text-gray-500 text-sm mt-1 leading-relaxed">{svc.description}</p>
                  </div>
                </div>
                <ul className="grid grid-cols-2 gap-1.5 mb-6 flex-1">
                  {svc.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />{h}
                    </li>
                  ))}
                </ul>
                <Link href={svc.href}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition-colors w-full justify-center">
                  {svc.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Translation Specialties */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#1a1a2e]">Translation Specialties</h2>
            <p className="text-gray-500 mt-2 text-sm">Specialized translation_translators for every industry and document type</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {SPECIALTIES.map((sp) => (
              <div key={sp} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />{sp}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interpretation Types */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#1a1a2e]">Interpretation Services</h2>
            <p className="text-gray-500 mt-2 text-sm">Court-certified, medical, and conference interpreters available</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {INTERPRETATION_TYPES.map((it) => (
              <div key={it.name} className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-[#1a1a2e] mb-1.5">{it.name}</h3>
                <p className="text-gray-500 text-sm">{it.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/interpretation"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a1a2e] text-white rounded-lg text-sm font-medium hover:bg-[#2a2a4e] transition-colors">
              Book an Interpreter <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Languages */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-4">200+ Languages</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-2xl mx-auto">
            From major world languages to rare regional dialects — if it&apos;s spoken, we translate it.
          </p>
          <div className="text-sm text-gray-600 space-y-3">
            <p><span className="font-medium text-gray-800">European:</span> Armenian · French · German · Greek · Italian · Polish · Portuguese · Russian · Spanish · and more</p>
            <p><span className="font-medium text-gray-800">Asian / Pacific:</span> Chinese (Simplified &amp; Traditional) · Japanese · Korean · Vietnamese · Thai · Tagalog · Hindi · and more</p>
            <p><span className="font-medium text-gray-800">Middle East / African:</span> Arabic · Farsi · Hebrew · Amharic · Somali · Swahili · Yoruba · Zulu · and more</p>
            <p><span className="font-medium text-gray-800">Americas:</span> Spanish (Latin) · Brazilian Portuguese · French Canadian · Haitian-Creole · Nahuatl · and more</p>
          </div>
        </div>
      </section>

      {/* Clients */}
      <section id="translation_clients" className="py-16 px-6 bg-[#1a1a2e] text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">Trusted By Leading Organizations</h2>
            <p className="text-gray-400 mt-2 text-sm">From Fortune 500s to federal agencies — since 2003</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CLIENT_CATEGORIES.map((cat) => (
              <div key={cat.label} className="bg-white/5 rounded-xl border border-white/10 p-5">
                <p className="font-semibold text-blue-300 text-xs uppercase tracking-wide mb-2">{cat.label}</p>
                <p className="text-gray-300 text-sm">{cat.translation_clients}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-[#1a1a2e] mb-10">Why L.A. Translation &amp; Interpretation</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { title: 'USCIS & Court Accepted', body: 'All certified translations are notarized, sealed, and stamped — accepted by USCIS, courts, and government agencies worldwide.' },
              { title: 'Certified Professionals', body: 'Court-certified interpreters and National Board / CCHI-certified medical interpreters. MA/PhD translation_translators for patent work.' },
              { title: 'Documents Kept on File', body: 'Your translations are stored on file for 3 years, making re-ordering fast and simple.' },
              { title: 'Apostille Service', body: 'Full apostille certification for international document use. Bundled with certified translation for a complete package.' },
              { title: 'Conference Equipment', body: 'Full simultaneous interpretation equipment rental: transmitters, receivers, booths, and on-site technician support.' },
              { title: 'Sister School', body: 'Affiliated with the Court Interpreting School — our interpreters are trained to the highest professional standards.' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl border border-gray-100 p-5">
                <p className="font-semibold text-[#1a1a2e] mb-1.5">{item.title}</p>
                <p className="text-gray-500 text-sm">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-blue-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-3">Ready to Get Started?</h2>
          <p className="text-blue-100 mb-8">Upload your document for an instant translation quote, or call us to speak with a language specialist.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/translation"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              Get a Translation Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="tel:2133857781"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/40 rounded-lg font-medium hover:bg-white/10 transition-colors">
              <Phone className="h-4 w-4" /> (213) 385-7781
            </a>
          </div>
        </div>
      </section>

      {/* Location / Map */}
      <section id="contact" className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#1a1a2e]">Visit Us</h2>
            <p className="text-gray-500 mt-2 text-sm">Conveniently located on Wilshire Boulevard in Los Angeles</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl p-6 space-y-4 text-sm text-gray-700">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-[#1a1a2e] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">2975 Wilshire Blvd #205</p>
                    <p>Los Angeles, CA 90010</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-[#1a1a2e] flex-shrink-0" />
                  <div>
                    <a href="tel:2133857781" className="hover:text-[#1a1a2e] font-medium">(213) 385-7781</a>
                    <span className="text-gray-400 mx-2">·</span>
                    <a href="tel:2133680700" className="hover:text-[#1a1a2e]">(213) 368-0700</a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-[#1a1a2e] flex-shrink-0" />
                  <a href="mailto:info@latranslation.com" className="hover:text-[#1a1a2e]">info@latranslation.com</a>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-[#1a1a2e] flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Monday – Friday</p>
                    <p className="text-gray-500">9:00 AM – 6:00 PM</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/translation"
                  className="flex-1 text-center px-4 py-2.5 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a4e] transition-colors">
                  Translation Quote
                </Link>
                <a href="tel:2133857781"
                  className="flex-1 text-center px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors">
                  Call Us
                </a>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-200 min-h-[280px]">
              <iframe
                src="https://maps.google.com/maps?q=2975+Wilshire+Blvd+%23205,+Los+Angeles,+CA+90010&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '280px' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="LA Translation & Interpretation location"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Contact / Footer */}
      <footer className="bg-[#1a1a2e] text-white py-12 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div>
            <p className="font-bold text-lg mb-3">L.A. Translation &amp; Interpretation</p>
            <p className="text-gray-400 text-sm">Professional translation, interpretation, and language services since 2003.</p>
          </div>
          <div className="space-y-3 text-sm text-gray-300">
            <a href="tel:2133857781" className="flex items-center gap-2 hover:text-white">
              <Phone className="h-4 w-4 text-gray-500" /> (213) 385-7781
            </a>
            <a href="tel:2133680700" className="flex items-center gap-2 hover:text-white">
              <Phone className="h-4 w-4 text-gray-500" /> (213) 368-0700
            </a>
            <a href="mailto:info@latranslation.com" className="flex items-center gap-2 hover:text-white">
              <Mail className="h-4 w-4 text-gray-500" /> info@latranslation.com
            </a>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <span>2975 Wilshire Blvd #205<br />Los Angeles, CA 90010</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>Mon–Fri 9:00 AM – 6:00 PM</span>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-300">
            <p className="font-medium text-white mb-3">Services</p>
            <Link href="/translation" className="block hover:text-white">Translation</Link>
            <Link href="/interpretation" className="block hover:text-white">Interpretation</Link>
            <Link href="/equipment-rental" className="block hover:text-white">Equipment Rental</Link>
            <Link href="/notary" className="block hover:text-white">Notary &amp; Apostille</Link>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} L.A. Translation &amp; Interpretation. All rights reserved.</p>
          <p>Fax: (213) 385-7784 · Legal Document Assistant: (213) 385-6228</p>
        </div>
      </footer>
    </div>
  )
}
