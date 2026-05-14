'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PricingCalculator } from '@/components/landing/PricingCalculator';
import { FeatureComparisonGrid } from '@/components/landing/FeatureComparisonGrid';

// Animated gradient background component
const AnimatedGradient = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Animated mesh gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-3000" />
      </div>

      {/* Noise texture overlay */}
      <div className="absolute inset-0 bg-noise opacity-[0.02]" />

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
    </div>
  );
};

// Floating particles component
const FloatingParticles = () => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-white/10 animate-float"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// Interactive 3D Card Component
const Interactive3DCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;

    setTransform({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setTransform({ rotateX: 0, rotateY: 0 });
    setIsHovered(false);
  };

  return (
    <div
      ref={cardRef}
      className={`transition-transform duration-200 ease-out ${className}`}
      style={{
        transform: `perspective(1000px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isHovered && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(600px circle at ${transform.rotateY * -10 + 50}% ${transform.rotateX * 10 + 50}%, rgba(255,255,255,0.1), transparent 40%)`,
          }}
        />
      )}
    </div>
  );
};

// Animated counter component
const AnimatedCounter = ({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(end * easeOutQuart));
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          animate();
        }
      },
      { threshold: 0.5 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return <span ref={countRef}>{count.toLocaleString()}{suffix}</span>;
};

// Scroll-triggered animation wrapper
const ScrollReveal = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
    >
      {children}
    </div>
  );
};

// Typing animation component
const TypewriterText = ({ texts, className = '' }: { texts: string[]; className?: string }) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const text = texts[currentTextIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setCurrentText(text.substring(0, currentText.length + 1));
        if (currentText === text) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        setCurrentText(text.substring(0, currentText.length - 1));
        if (currentText === '') {
          setIsDeleting(false);
          setCurrentTextIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentTextIndex, texts]);

  return (
    <span className={className}>
      {currentText}
      <span className="animate-blink">|</span>
    </span>
  );
};

// Feature card with hover effects
const FeatureCard = ({ icon, title, description, gradient }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Interactive3DCard>
      <div
        className={`relative p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden group cursor-pointer transition-all duration-300 ${isHovered ? 'border-white/20 bg-white/10' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Gradient background on hover */}
        <div
          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`}
          style={{ filter: 'blur(40px)' }}
        />

        <div className="relative z-10">
          <div className={`w-14 h-14 rounded-xl ${gradient} flex items-center justify-center mb-6 transform group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
          <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-white transition-colors">{title}</h3>
          <p className="text-zinc-400 group-hover:text-zinc-300 transition-colors leading-relaxed">{description}</p>
        </div>
      </div>
    </Interactive3DCard>
  );
};

// Live demo simulation
const LivePaymentDemo = () => {
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState('0.00');

  useEffect(() => {
    const amounts = ['125.00', '2,450.00', '89.99', '1,200.00', '499.00'];
    let current = 0;

    const interval = setInterval(() => {
      setAmount(amounts[current]);
      setStep((prev) => (prev + 1) % 4);
      current = (current + 1) % amounts.length;
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const steps = [
    { label: 'Invoice Created', color: 'from-emerald-500 to-emerald-500' },
    { label: 'Customer Pays', color: 'from-cyan-500 to-blue-500' },
    { label: 'Settlement', color: 'from-emerald-500 to-green-500' },
    { label: 'Funds Received', color: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Phone mockup */}
      <div className="relative bg-zinc-900 rounded-[3rem] p-3 shadow-2xl shadow-black/50">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full" />
        <div className="bg-zinc-950 rounded-[2.5rem] overflow-hidden">
          {/* Status bar */}
          <div className="flex justify-between items-center px-8 py-3 text-xs text-white/60">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-2 bg-white/60 rounded-sm" />
              <div className="w-4 h-2 bg-white/60 rounded-sm" />
              <div className="w-6 h-3 bg-emerald-500 rounded-sm" />
            </div>
          </div>

          {/* App content */}
          <div className="px-6 pb-8 pt-4 min-h-[400px]">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">Live Demo</span>
              </div>
              <p className="text-4xl font-bold text-white mb-1">
                ${amount}
              </p>
              <p className="text-zinc-500 text-sm">USDC Payment</p>
            </div>

            {/* Progress steps */}
            <div className="space-y-3">
              {steps.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${i <= step ? 'bg-white/5' : 'bg-transparent'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${i < step ? `bg-gradient-to-r ${s.color}` :
                    i === step ? `bg-gradient-to-r ${s.color} animate-pulse` :
                      'bg-zinc-800'
                    }`}>
                    {i < step ? (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className={`text-xs font-medium ${i === step ? 'text-white' : 'text-zinc-600'}`}>{i + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm transition-colors ${i <= step ? 'text-white' : 'text-zinc-600'
                    }`}>{s.label}</span>
                  {i === step && (
                    <div className="ml-auto flex gap-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 rounded-[4rem] blur-2xl -z-10" />
    </div>
  );
};

// Main landing page component
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Cursor glow effect */}
      <div
        className="fixed w-96 h-96 rounded-full pointer-events-none z-50 mix-blend-soft-light opacity-30 transition-transform duration-100"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, transparent 70%)',
          transform: `translate(${mousePosition.x - 192}px, ${mousePosition.y - 192}px)`,
        }}
      />

      {/* Background effects */}
      <AnimatedGradient />
      <FloatingParticles />

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrollY > 50 ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-white/5' : ''
        }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Settla Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden">
                <img
                  src="/brand/settla.svg"
                  alt="Settla"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xl font-semibold text-white">Settla</span>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">Pricing</a>
              <a href="https://docs.sera.cx" className="text-sm text-zinc-400 hover:text-white transition-colors">Docs</a>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="group relative px-5 py-2.5 rounded-full bg-[#0d9488] text-white text-sm font-medium overflow-hidden hover:bg-[#0f766e] transition-colors"
              >
                <span className="relative z-10">Get Started</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left content */}
            <div className="text-center lg:text-left">
              <ScrollReveal>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#0d9488]/10 to-[#1a365d]/10 border border-[#0d9488]/20 mb-8">
                  <div className="w-2 h-2 rounded-full bg-[#0d9488] animate-pulse" />
                  <span className="text-sm text-[#0d9488] font-medium">90% Lower Fees Than Stripe</span>
                  <svg className="w-4 h-4 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={100}>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6">
                  <span className="text-white">The future of</span>
                  <br />
                  <span className="bg-gradient-to-r from-[#0d9488] via-[#14b8a6] to-[#1a365d] bg-clip-text text-transparent">
                    <TypewriterText texts={['payments', 'invoicing', 'settlements', 'commerce']} />
                  </span>
                  <br />
                  <span className="text-white">is here.</span>
                </h1>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <p className="text-xl text-zinc-400 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  Accept stablecoin payments instantly. Settle in minutes, not days.
                  No chargebacks. Enterprise-grade security with passkey authentication.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={300}>
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <Link
                    href="/login"
                    className="group relative w-full sm:w-auto px-8 py-4 rounded-xl bg-[#0d9488] text-white font-semibold overflow-hidden shadow-lg shadow-[#0d9488]/25 hover:shadow-[#0d9488]/40 hover:bg-[#0f766e] transition-all"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Start Free Today
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </Link>
                  <Link
                    href="/pay/demo"
                    className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    See Demo
                  </Link>
                </div>
              </ScrollReveal>

              {/* Trust badges */}
              <ScrollReveal delay={400}>
                <div className="mt-12 pt-8 border-t border-white/5">
                  <p className="text-xs text-zinc-500 mb-4">TRUSTED BY FORWARD-THINKING BUSINESSES</p>
                  <div className="flex items-center gap-8 opacity-50 grayscale">
                    <div className="text-2xl font-bold tracking-tight">Acme</div>
                    <div className="text-2xl font-bold tracking-tight">NEXUS</div>
                    <div className="text-2xl font-bold tracking-tight">Quantum</div>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Right - Interactive Demo */}
            <div className="relative">
              <ScrollReveal delay={500}>
                <LivePaymentDemo />
              </ScrollReveal>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs text-zinc-500">Scroll to explore</span>
          <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <ScrollReveal>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#0d9488] to-[#14b8a6] bg-clip-text text-transparent mb-2">
                  <AnimatedCounter end={99} suffix="%" />
                </div>
                <p className="text-zinc-500">Fee Savings</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#14b8a6] to-[#1a365d] bg-clip-text text-transparent mb-2">
                  <AnimatedCounter end={2} suffix=" min" />
                </div>
                <p className="text-zinc-500">Settlement Time</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-500 bg-clip-text text-transparent mb-2">
                  <AnimatedCounter end={0} suffix="%" />
                </div>
                <p className="text-zinc-500">Chargebacks</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-500 to-pink-500 bg-clip-text text-transparent mb-2">
                  <AnimatedCounter end={9} suffix="+" />
                </div>
                <p className="text-zinc-500">Chains Supported</p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section id="features" className="relative py-32">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section intro */}
          <ScrollReveal>
            <div className="mb-16">
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400 mb-6">
                Why businesses switch to us
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold max-w-3xl leading-tight">
                Built different.
                <span className="text-zinc-500"> Works better.</span>
              </h2>
            </div>
          </ScrollReveal>

          {/* Bento Grid - Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Large card - Instant Settlement */}
            <ScrollReveal delay={0}>
              <div className="lg:col-span-2 h-[400px] relative rounded-3xl bg-gradient-to-br from-emerald-950/50 to-zinc-900/50 border border-emerald-500/20 p-8 overflow-hidden group hover:border-emerald-500/40 transition-colors">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-colors" />

                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    SETTLING NOW
                  </div>

                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    2-minute settlements.<br />
                    <span className="text-zinc-500">Not 2-day.</span>
                  </h3>

                  <p className="text-zinc-400 max-w-sm mb-6 text-sm">
                    While banks hold your money hostage, Sera settles on-chain.
                  </p>

                  {/* Live settlement ticker */}
                  <div className="mt-auto space-y-2">
                    {[
                      { amount: '$2,450.00', time: '12s ago' },
                      { amount: '$189.99', time: '34s ago' },
                      { amount: '$1,200.00', time: '1m ago' },
                    ].map((tx, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="text-white font-medium text-sm">{tx.amount}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">{tx.time}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">settled</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Passkey card */}
            <ScrollReveal delay={100}>
              <div className="h-[400px] relative rounded-3xl bg-gradient-to-br from-emerald-950/50 to-zinc-900/50 border border-emerald-500/20 p-6 overflow-hidden group hover:border-emerald-500/40 transition-colors">
                <div className="relative z-10 h-full flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-1">Passwords are dead</h3>
                  <p className="text-sm text-zinc-400 mb-4">Face ID. Touch ID. Done.</p>

                  {/* Fingerprint animation */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative w-28 h-28">
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30">
                        <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-20" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-14 h-14 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <path d="M12 10V14M12 21C7.029 21 3 16.971 3 12C3 7.029 7.029 3 12 3C16.971 3 21 7.029 21 12C21 14.5 20 16.75 18.36 18.36" strokeLinecap="round" />
                          <path d="M9 12C9 10.343 10.343 9 12 9C13.657 9 15 10.343 15 12C15 14.5 13.5 17 12 17" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan" />
                    </div>
                  </div>

                  <div className="text-center text-xs text-zinc-500 mt-auto">
                    WebAuthn • Passkeys • Hardware Keys
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Bento Grid - Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Zero chargebacks */}
            <ScrollReveal delay={200}>
              <div className="h-[200px] relative rounded-3xl bg-zinc-900 border border-white/10 p-6 overflow-hidden group hover:border-white/20 transition-colors">
                <h3 className="text-lg font-bold text-white mb-1">Zero chargebacks</h3>
                <p className="text-sm text-zinc-500 mb-3">Ever. Blockchain is final.</p>
                <div className="text-5xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                  $0
                </div>
                <div className="absolute -bottom-6 -right-6 text-8xl opacity-[0.03]">💸</div>
              </div>
            </ScrollReveal>

            {/* Multi-chain */}
            <ScrollReveal delay={250}>
              <div className="h-[200px] relative rounded-3xl bg-zinc-900 border border-white/10 p-6 overflow-hidden group hover:border-white/20 transition-colors">
                <h3 className="text-lg font-bold text-white mb-1">Any chain</h3>
                <p className="text-sm text-zinc-500 mb-4">Wormhole-powered</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['ETH', 'SOL', 'BASE', 'ARB', 'OP'].map((chain, i) => (
                    <div
                      key={chain}
                      className="px-2 py-1 rounded-md bg-white/10 text-xs text-white font-mono"
                    >
                      {chain}
                    </div>
                  ))}
                  <div className="px-2 py-1 rounded-md bg-white/5 text-xs text-zinc-500">+4</div>
                </div>
              </div>
            </ScrollReveal>

            {/* Payment links */}
            <ScrollReveal delay={300}>
              <div className="h-[200px] relative rounded-3xl bg-zinc-900 border border-white/10 p-6 overflow-hidden group hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Share & get paid</h3>
                    <p className="text-sm text-zinc-500">QR codes. Links.</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-white/10 p-1.5 shrink-0">
                    <div className="w-full h-full grid grid-cols-4 gap-px">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className={`rounded-[1px] ${[0, 1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 15].includes(i) ? 'bg-white' : ''}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="font-mono text-xs text-zinc-600 bg-white/5 px-3 py-2 rounded-lg truncate">
                  sera.pay/p/acme-invoice
                </div>
              </div>
            </ScrollReveal>

            {/* Invoices */}
            <ScrollReveal delay={350}>
              <div className="h-[200px] relative rounded-3xl bg-gradient-to-br from-cyan-950/50 to-zinc-900/50 border border-cyan-500/20 p-6 overflow-hidden group hover:border-cyan-500/40 transition-colors">
                <h3 className="text-lg font-bold text-white mb-1">Invoices that convert</h3>
                <p className="text-sm text-zinc-400 mb-4">Professional. Trackable.</p>

                {/* Mini invoice */}
                <div className="w-full max-w-[140px] rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                  <div className="p-2 border-b border-white/10 flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-cyan-500/20" />
                    <div className="h-1.5 w-12 rounded bg-white/20" />
                  </div>
                  <div className="p-2">
                    <div className="flex justify-between items-center">
                      <div className="h-1.5 w-6 rounded bg-white/10" />
                      <div className="text-cyan-400 font-bold text-xs">$2,450</div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Bento Grid - Row 3 */}
          <div className="grid grid-cols-1 gap-4">
            {/* Analytics - full width */}
            <ScrollReveal delay={400}>
              <div className="h-[180px] relative rounded-3xl bg-zinc-900 border border-white/10 p-6 overflow-hidden group hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">See everything</h3>
                    <p className="text-sm text-zinc-500">Revenue, trends, exports—all real-time</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-400">$124k</div>
                      <div className="text-zinc-500 text-xs">This month</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">2,847</div>
                      <div className="text-zinc-500 text-xs">Transactions</div>
                    </div>
                  </div>
                </div>

                {/* Bar chart */}
                <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end gap-1 px-6 pb-4">
                  {[35, 55, 40, 70, 50, 65, 85, 55, 75, 60, 90, 45, 80, 60, 70, 50, 85, 65].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-gradient-to-t from-emerald-500/20 to-emerald-500/50 group-hover:from-emerald-500/30 group-hover:to-emerald-500/70 transition-colors"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Pricing Comparison Section */}
      <section id="pricing" className="relative py-32 overflow-hidden">
        {/* Background effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-emerald-950/20 to-zinc-950" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-6 relative">
          {/* Section header */}
          <ScrollReveal>
            <div className="text-center mb-20">
              <div className="inline-block px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-sm text-red-400 mb-6">
                Stop overpaying
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                You&apos;re losing <span className="text-red-400">$3,000+</span> every month
                <br />
                <span className="text-zinc-500">to payment processors.</span>
              </h2>
            </div>
          </ScrollReveal>

          {/* Visual comparison - the "aha moment" */}
          <ScrollReveal delay={100}>
            {/* Interactive Pricing Calculator */}
            <div className="mb-20">
              <PricingCalculator />
            </div>
          </ScrollReveal>

          {/* Feature comparison grid */}
          <ScrollReveal delay={200}>
            <FeatureComparisonGrid />
          </ScrollReveal>

          {/* CTA */}
          <ScrollReveal delay={300}>
            <div className="mt-16 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#0d9488] text-white font-semibold hover:bg-[#0f766e] transition-all shadow-lg shadow-[#0d9488]/25 hover:shadow-[#0d9488]/40"
              >
                Stop overpaying today
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <p className="text-zinc-500 text-sm mt-4">Free to get started. No credit card required.</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent" />
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <ScrollReveal>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Ready to transform
              <br />
              <span className="bg-gradient-to-r from-[#0d9488] via-[#14b8a6] to-[#1a365d] bg-clip-text text-transparent">your payments?</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
              Join forward-thinking businesses already saving thousands on payment processing.
              Set up in minutes, no credit card required.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="group relative w-full sm:w-auto px-10 py-5 rounded-xl bg-[#0d9488] text-white font-semibold text-lg overflow-hidden shadow-lg shadow-[#0d9488]/25 hover:shadow-[#0d9488]/40 transition-all hover:scale-105 hover:bg-[#0f766e]"
              >
                <span className="relative z-10">Get Started Free</span>
              </Link>
              <Link
                href="https://docs.sera.cx"
                className="w-full sm:w-auto px-10 py-5 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-colors text-lg"
              >
                Read Documentation
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img src="/brand/settla.svg" alt="Settla" className="w-full h-full object-cover" />
              </div>
              <span className="text-zinc-400">Settla by Veridex Protocol</span>
            </div>
            <div className="flex items-center gap-8">
              <a href="https://docs.sera.cx" className="text-zinc-500 hover:text-white transition-colors">Docs</a>
              <a href="https://sera.cx" className="text-zinc-500 hover:text-white transition-colors">Sera Protocol</a>
              <a href="https://twitter.com/veridex" className="text-zinc-500 hover:text-white transition-colors">Twitter</a>
              <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-500 text-xs">Sepolia Testnet</span>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5 text-center text-sm text-zinc-600">
            © 2026 Veridex Protocol. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Custom styles */}
      <style jsx global>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(30px, 30px) scale(1.05); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .animate-blob {
          animation: blob 10s infinite ease-in-out;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-3000 {
          animation-delay: 3s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animate-float {
          animation: float 6s infinite ease-in-out;
        }
        
        .animate-float-slow {
          animation: float-slow 3s infinite ease-in-out;
        }
        
        .animate-blink {
          animation: blink 1s infinite;
        }
        
        .animate-scan {
          animation: scan 2s infinite linear;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite ease-in-out;
        }
        
        .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        
        .bg-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
      `}</style>
    </div>
  );
}
