"use client";
import { useState, useEffect } from "react";
import { useTranslation } from "@/app/context/LanguageContext";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/app/components/ui/accordion";
import { TestimonialCard } from "@/app/components/TestimonialCard";
import { ProcessStep } from "@/app/components/ProcessStep";
import { TrustBadge } from "@/app/components/TrustBadge";
import { DemoCTA } from "@/app/components/DemoCTA";
  // import { DemoBookingForm } from "@/app/components/demo/DemoBookingForm";
import { LanguageSelector } from "@/app/components/LanguageSelector";
import { FeatureItem } from "@/app/components/FeatureItem";
import { Calendar, Target, Rocket, Users, Brain, TrendingUp, Clock, Zap, CheckCircle2, LogIn, ArrowRight, MessageSquare, BarChart3, UsersRound, CalendarCheck, FolderOpen, ListChecks, Shield, Palette, Lock, FileCheck, Database } from "lucide-react";
import { useRouter } from "next/navigation";
const LandingPage = () => {
  const t = useTranslation();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState('progress');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const router = useRouter(); 
  // Hero section images array
  const heroImages = [
    '/assets/a (1).jpg',
    '/assets/a (2).jpg',
    '/assets/a (3).jpg',
    '/assets/a (4).jpg',
    '/assets/a (5).jpg',
    '/assets/dual-device-mockup.png'
  ];

  // Auto-rotate images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [heroImages.length]);

  // Image mapping for each feature tab
  const featureImages = {
    progress: '/assets/Progress.PNG',
    library: '/assets/resource.PNG',
    tasks: '/assets/Task.PNG',
    notes: '/assets/client.PNG',
    programs: '/assets/program.PNG',
    booking: '/assets/session.PNG',
    chat: '/assets/client.PNG',
    groups: '/assets/groups.PNG',
    aiAssist: '/assets/AI-Session.PNG'
  };
  const features = [{
    icon: Brain,
    title: t('solution.features.ai.title'),
    description: t('solution.features.ai.description'),
    benefit: t('solution.features.ai.benefit')
  }, {
    icon: Target,
    title: t('solution.features.builder.title'),
    description: t('solution.features.builder.description'),
    benefit: t('solution.features.builder.benefit')
  }, {
    icon: TrendingUp,
    title: t('solution.features.tracking.title'),
    description: t('solution.features.tracking.description'),
    benefit: t('solution.features.tracking.benefit')
  }];
  const painPoints = [{
    icon: Clock,
    title: t('painPoints.point1Title'),
    description: t('painPoints.point1Description')
  }, {
    icon: Zap,
    title: t('painPoints.point2Title'),
    description: t('painPoints.point2Description')
  }, {
    icon: Users,
    title: t('painPoints.point3Title'),
    description: t('painPoints.point3Description')
  }, {
    icon: Target,
    title: t('painPoints.point4Title'),
    description: t('painPoints.point4Description')
  }, {
    icon: Brain,
    title: t('painPoints.point5Title'),
    description: t('painPoints.point5Description')
  }, {
    icon: TrendingUp,
    title: t('painPoints.point6Title'),
    description: t('painPoints.point6Description')
  }];
  const detailedFeatures = [{
    icon: MessageSquare,
    title: t('features.items.ai.title'),
    description: t('features.items.ai.description')
  }, {
    icon: Target,
    title: t('features.items.programs.title'),
    description: t('features.items.programs.description')
  }, {
    icon: BarChart3,
    title: t('features.items.tracking.title'),
    description: t('features.items.tracking.description')
  }, {
    icon: UsersRound,
    title: t('features.items.groups.title'),
    description: t('features.items.groups.description')
  }, {
    icon: CalendarCheck,
    title: t('features.items.scheduling.title'),
    description: t('features.items.scheduling.description')
  }, {
    icon: FolderOpen,
    title: t('features.items.library.title'),
    description: t('features.items.library.description')
  }, {
    icon: ListChecks,
    title: t('features.items.tasks.title'),
    description: t('features.items.tasks.description')
  }, {
    icon: Shield,
    title: t('features.items.security.title'),
    description: t('features.items.security.description')
  }, {
    icon: Palette,
    title: t('features.items.white_label.title'),
    description: t('features.items.white_label.description')
  }];
  const faqs = [{
    question: t('faq.q1.question'),
    answer: t('faq.q1.answer')
  }, {
    question: t('faq.q2.question'),
    answer: t('faq.q2.answer')
  }, {
    question: t('faq.q3.question'),
    answer: t('faq.q3.answer')
  }, {
    question: t('faq.q4.question'),
    answer: t('faq.q4.answer')
  }, {
    question: t('faq.q5.question'),
    answer: t('faq.q5.answer')
  }];
  return <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img src="/assets/logo.png" alt="Suplient" className="h-40 md:h-20 " />
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-[20px] font-medium hover:text-primary transition-colors">
              {t('header.home')}
            </a>
            <a href="#features" className="text-[20px] font-medium hover:text-primary transition-colors">
              {t('header.features')}
            </a>
            <a href="#how-it-works" className="text-[20px] font-medium hover:text-primary transition-colors">
              {t('header.howItWorks')}
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <LanguageSelector variant="header" />
            <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>
              <LogIn className="mr-2 h-4 w-4" />
              {t('header.login')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              {t('hero.title')}{" "}
              <span className="text-primary">{t('hero.titleHighlight')}</span> {t('hero.titleEnd')}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <DemoCTA onClick={() => window.open('https://suplient.com/bookmoede', '_blank')} />
              <Button variant="outline" size="lg" onClick={() => {
              document.getElementById('how-it-works')?.scrollIntoView({
                behavior: 'smooth'
              });
            }}>
                {t('hero.ctaSecondary')}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('hero.trustLine')}
            </p>
          </div>
          <div className="relative hidden lg:block w-full h-full min-h-[400px]">
            {heroImages.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`CoachPlatform showcase ${index + 1}`}
                className={`absolute inset-0 w-full h-auto object-contain transition-opacity duration-1000 ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badge */}
      <section className="container mx-auto px-4">
        <TrustBadge />
      </section>

      {/* Pain Points */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('painPoints.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('painPoints.subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {painPoints.map((point, index) => <Card key={index} className="border-border/50 bg-gradient-to-br from-pink-50/50 to-coral-50/50 dark:from-pink-950/20 dark:to-coral-950/20">
              <CardContent className="pt-6">
                <point.icon className="h-10 w-10 text-pink-500 dark:text-pink-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{point.title}</h3>
                <p className="text-sm text-muted-foreground">{point.description}</p>
              </CardContent>
            </Card>)}
        </div>
      </section>

      {/* Platform Features Tabs */}
      <section id="features" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {t('platformFeatures.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('platformFeatures.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4 max-w-7xl mx-auto">
            {[
              { 
                id: 'progress', 
                label: t('platformFeatures.tabs.progress'), 
                iconPaths: [
                  <path key="1" d="M12 20h9"/>,
                  <path key="2" d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                ]
              },
              { 
                id: 'library', 
                label: t('platformFeatures.tabs.library'), 
                iconPaths: [
                  <path key="1" d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                ]
              },
              { 
                id: 'tasks', 
                label: t('platformFeatures.tabs.tasks'), 
                iconPaths: [
                  <rect key="1" width="18" height="18" x="3" y="3" rx="2"/>,
                  <path key="2" d="m9 12 2 2 4-4"/>
                ]
              },
              { 
                id: 'notes', 
                label: t('platformFeatures.tabs.notes'), 
                iconPaths: [
                  <path key="1" d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>,
                  <polyline key="2" points="14 2 14 8 20 8"/>
                ]
              },
              { 
                id: 'programs', 
                label: t('platformFeatures.tabs.programs'), 
                iconPaths: [
                  <path key="1" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>,
                  <circle key="2" cx="12" cy="12" r="3"/>
                ]
              },
              { 
                id: 'booking', 
                label: t('platformFeatures.tabs.booking'), 
                iconPaths: [
                  <path key="1" d="M8 2v4"/>,
                  <path key="2" d="M16 2v4"/>,
                  <rect key="3" width="18" height="18" x="3" y="4" rx="2"/>,
                  <path key="4" d="M3 10h18"/>
                ]
              },
              { 
                id: 'chat', 
                label: t('platformFeatures.tabs.chat'), 
                iconPaths: [
                  <path key="1" d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
                ]
              },
              { 
                id: 'groups', 
                label: t('platformFeatures.tabs.groups'), 
                iconPaths: [
                  <path key="1" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>,
                  <circle key="2" cx="9" cy="7" r="4"/>,
                  <path key="3" d="M22 21v-2a4 4 0 0 0-3-3.87"/>,
                  <path key="4" d="M16 3.13a4 4 0 0 1 0 7.75"/>
                ]
              },
              { 
                id: 'aiAssist', 
                label: t('platformFeatures.tabs.aiAssist'), 
                iconPaths: [
                  <path key="1" d="M12 2v2M6.938 4.927l-1.414 1.414M2 12h2M4.927 17.062l1.414 1.414M12 22v-2M17.062 19.073l1.414-1.414M22 12h-2M19.073 6.938l-1.414-1.414"/>,
                  <circle key="2" cx="12" cy="12" r="3"/>
                ]
              }
            ].map((feature) => {
              const isSelected = selectedFeature === feature.id;
              return (
                <div
                  key={feature.id}
                  onClick={() => setSelectedFeature(feature.id)}
                  className={`flex flex-col items-center gap-3 p-6 rounded-xl transition-all hover:scale-105 cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border/50 hover:border-primary/50'
                  }`}
                >
                  <div className={`p-3 rounded-lg ${isSelected ? 'bg-primary-foreground/10' : 'bg-muted'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {feature.iconPaths}
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-center">{feature.label}</span>
                </div>
              );
            })}
          </div>

          {/* Feature Image Display */}
          {featureImages[selectedFeature] && (
            <div className="mt-12 max-w-6xl mx-auto">
              <Card className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-lg">
                <CardContent className="p-0">
                  <img 
                    src={featureImages[selectedFeature]} 
                    alt={`${selectedFeature.charAt(0).toUpperCase() + selectedFeature.slice(1)} Dashboard`}
                    className="w-full h-auto object-contain"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Solution Section */}
      <section className="bg-background py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('solution.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-2">
              {t('solution.subtitle')}
            </p>
            <p className="text-base text-muted-foreground/80 max-w-2xl mx-auto italic">
              {t('solution.description')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => <Card key={index} className="border-primary/20 hover:border-primary/40 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground mb-4">{feature.description}</p>
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">{feature.benefit}</span>
                  </div>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Detailed Features Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('features.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {detailedFeatures.map((feature, index) => <FeatureItem key={index} icon={feature.icon} title={feature.title} description={feature.description} />)}
        </div>
      </section>

      {/* HIPAA Security Section */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex justify-between gap-6 mb-6">
              <div>
              <img 
                src="https://icon2.cleanpng.com/20180624/iss/kisspng-general-data-protection-regulation-european-union-stamp-icon-5b2f41ff48fc87.184443461529823743299.jpg" 
                alt="HIPAA Compliance Badge" 
                className="h-20 w-auto object-contain"
              />
              </div>

            <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('security.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-2">
              {t('security.subtitle')}
            </p>
            <p className="text-base text-muted-foreground/80 max-w-2xl mx-auto">
              {t('security.description')}
            </p>
            </div>
            <div>
              <img
              src = "https://www.hipaajournal.com/wp-content/uploads/2024/10/Badge_HIPAA-Compliant-Logo.png"
              alt="HIPAA Compliance Badge"
              className="h-20 w-auto object-contain"
              />
            </div>
</div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Lock,
                title: t('security.features.encryption.title'),
                description: t('security.features.encryption.description')
              },
              {
                icon: FileCheck,
                title: t('security.features.compliance.title'),
                description: t('security.features.compliance.description')
              },
              {
                icon: Shield,
                title: t('security.features.access.title'),
                description: t('security.features.access.description')
              },
              {
                icon: Database,
                title: t('security.features.backup.title'),
                description: t('security.features.backup.description')
              }
            ].map((feature, index) => (
              <Card key={index} className="border-border/50 hover:border-primary/50 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('testimonials.title')}
          </h2>
          <p className="text-xl text-muted-foreground">
            {t('testimonials.subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <TestimonialCard quote={t('testimonials.martin.quote')} name={t('testimonials.martin.name')} credentials={t('testimonials.martin.credentials')} result={t('testimonials.martin.result')} />
          <TestimonialCard quote={t('testimonials.soren.quote')} name={t('testimonials.soren.name')} credentials={t('testimonials.soren.credentials')} result={t('testimonials.soren.result')} />
          <TestimonialCard quote={t('testimonials.janni.quote')} name={t('testimonials.janni.name')} credentials={t('testimonials.janni.credentials')} result={t('testimonials.janni.result')} />
        </div>
      </section>

      {/* Video Break Section */}
      <section className="relative w-full py-48 md:py-64 overflow-hidden">
        <div className="absolute inset-0">
          <video autoPlay muted loop playsInline className="w-full h-full object-cover">
            <source src="/videos/amin-stage.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]" style={{
          textShadow: '0 0 20px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.8)'
        }}>
            Mental sundhed er vores passion & hjertemission
          </h2>
        </div>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 md:p-12 border border-primary/20">
          <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t('mission.title')}
              </h2>
              <p className="text-xl text-primary/90 font-medium mb-6">
                {t('mission.subtitle')}
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                {t('mission.description')}
              </p>
            </div>
            <div className="order-1 lg:order-2 flex justify-center">
              <img src="/assets/amin-founder.png" alt="Amin Durani - Stifter af Suplient" className="w-full max-w-sm rounded-2xl shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('process.title')}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('process.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-12 md:gap-8 max-w-5xl mx-auto">
            <ProcessStep number={1} title={t('process.step1.title')} description={t('process.step1.description')} icon={Calendar} />
            <ProcessStep number={2} title={t('process.step2.title')} description={t('process.step2.description')} icon={Target} />
            <ProcessStep number={3} title={t('process.step3.title')} description={t('process.step3.description')} icon={Rocket} isLast />
          </div>
        </div>
      </section>

      {/* Second CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 md:p-12 text-center border border-primary/20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('cta.second.title')}
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('cta.second.subtitle')}
          </p>
          <DemoCTA onClick={() => window.open('https://suplient.com/bookmoede', '_blank')} />
          <p className="text-sm text-muted-foreground mt-6">
            {t('cta.second.satisfaction')}
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('faq.title')}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('faq.subtitle')}
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>)}
          </Accordion>
        </div>
      </section>

      {/* Final CTA Strip */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('cta.final.title')}
          </h2>
          <p className="text-xl mb-6 opacity-90">
            {t('cta.final.subtitle')}
          </p>
          <p className="text-sm mb-8 opacity-80 max-w-2xl mx-auto">
            {t('cta.final.disclaimer')}
          </p>
          <Button onClick={() => setShowBookingForm(true)} variant="secondary" size="lg" className="group">
            {t('cta.final.button')}
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{t('footer.copyright')}</p>
        </div>
      </footer>

      {/* Booking Form Modal */}
      {/* <DemoBookingForm open={showBookingForm} onOpenChange={setShowBookingForm} /> */}
    </div>;
};
export default LandingPage;