import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Zap, Calendar, Eye, Fingerprint, Layers, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QalamLogo from '@/components/layout/QalamLogo';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Fingerprint,
    title: 'Voice Fingerprint',
    desc: 'Qalam reads your writing and builds a tonal profile — your vocabulary, your rhythm, your point of view. Every draft stays on-brand without a second thought.',
  },
  {
    icon: Layers,
    title: 'Multi-Platform Studio',
    desc: 'LinkedIn, X, and Threads reward different formats and audiences. Write once, adapt with precision — native formatting, character limits, and platform tone built in.',
  },
  {
    icon: Eye,
    title: 'Live Post Preview',
    desc: 'What you see is what they see. Your post, formatted exactly as it will appear on each platform — before you publish.',
  },
  {
    icon: Calendar,
    title: 'Publishing Calendar',
    desc: 'See your week in one view. Batch your drafts, schedule your timing, and ship with precision. Publishing stops feeling scattered when it lives on a system.',
  },
  {
    icon: Zap,
    title: 'Post Signal',
    desc: 'Every draft gets scored — hook strength, engagement patterns, what to sharpen. Not vanity metrics. Signal: what actually moves the needle on authority.',
  },
  {
    icon: Users,
    title: 'Agency Workspace',
    desc: 'Multiple clients, multiple voices, one dashboard. Isolated workspaces, distinct voice profiles, full separation. Built for teams running content operations at scale.',
  },
];

const plans = [
  {
    name: 'Free',
    tagline: 'See if it clicks.',
    price: 'PKR 0',
    period: '',
    desc: 'No credit card. No pitch. Just the product.',
    features: [
      '5 posts per month',
      'LinkedIn, X, and Threads',
      'Post library & draft history',
      'Live platform preview',
    ],
    cta: 'Start for free',
    highlight: false,
    badge: null,
  },
  {
    name: 'Pro',
    tagline: 'The complete publishing system.',
    price: 'PKR 3,499',
    period: '/month',
    desc: 'For founders and operators who publish consistently. Everything in — nothing held back.',
    features: [
      'Unlimited posts, all platforms',
      'Voice Fingerprint — your tonal profile',
      'Publishing calendar & scheduling',
      'Post Signal scoring on every draft',
      'Analytics — engagement & best times',
    ],
    cta: 'Start free trial',
    highlight: true,
    badge: 'Most used',
  },
  {
    name: 'Growth',
    tagline: 'For operators who run on content.',
    price: 'PKR 6,999',
    period: '/month',
    desc: 'Every edge that makes the investment compound. For people who treat content as infrastructure.',
    features: [
      'Everything in Pro',
      'Competitor monitor',
      'Audience insights & sentiment',
      'Hashtag generator',
      'Priority drafting & support',
    ],
    cta: 'Start free trial',
    highlight: false,
    badge: null,
  },
  {
    name: 'Agency',
    tagline: 'Content operations, at scale.',
    price: 'PKR 14,999',
    period: '/month',
    desc: 'Run multiple client voices from one clean workspace. For consultants and content teams.',
    features: [
      'Everything in Growth',
      '10 isolated client workspaces',
      'Per-client Voice Fingerprint',
      'Client approval workflows',
      'White-label exports & dedicated support',
    ],
    cta: 'Contact us',
    highlight: false,
    badge: null,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <QalamLogo size="sm" />
          <div className="hidden md:flex items-center gap-8 text-[13px] text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link to="/login">
              <Button size="sm" className="text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90">
                Start writing
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-border/70 text-[11px] text-muted-foreground/70 mb-10 tracking-wide">
              For founders · operators · consultants
            </div>

            <h1 className="font-serif text-[42px] sm:text-5xl md:text-6xl lg:text-[72px] font-semibold leading-[1.06] tracking-tight mb-7">
              Build authority.
              <br />
              <span className="text-muted-foreground/60">Not just content.</span>
            </h1>

            <p className="text-[15px] sm:text-base text-muted-foreground max-w-lg mx-auto mb-10 leading-[1.75]">
              Qalam is the publishing system for founders and operators who know what they think — and want the world to know it too. Your voice. Every platform. Every week.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/login">
                <Button className="h-11 px-7 text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  Start your first draft
                  <ArrowRight className="ml-2 w-3.5 h-3.5" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" className="h-11 px-7 text-[13px] border-border text-foreground hover:bg-accent font-medium">
                  See how it works
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Proof strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="flex items-center justify-center gap-8 sm:gap-12 mt-11 flex-wrap"
          >
            {[
              'No templates. No generic output.',
              'LinkedIn · X · Threads in one workflow',
              'Draft, schedule, ship — one system',
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground/40">
                <span className="w-1 h-1 rounded-full bg-primary/50 flex-shrink-0" />
                {p}
              </div>
            ))}
          </motion.div>

          {/* Product mockup */}
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.25 }}
            className="mt-14"
          >
            <div className="rounded-xl border border-border bg-card/50 p-1 shadow-2xl shadow-black/20">
              <div className="rounded-lg bg-background border border-border/50 overflow-hidden">

                {/* Browser chrome */}
                <div className="h-9 border-b border-border flex items-center px-4 gap-2 bg-muted/15">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/15" />
                    <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/15" />
                    <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/15" />
                  </div>
                  <div className="ml-3 h-5 w-44 bg-muted/30 rounded flex items-center px-2.5">
                    <span className="text-[9px] text-muted-foreground/30">app.qalam.io/writer</span>
                  </div>
                </div>

                <div className="flex min-h-[300px] sm:min-h-[370px]">

                  {/* Sidebar */}
                  <div className="w-[156px] border-r border-border hidden sm:block bg-muted/8 p-2.5">
                    <div className="space-y-0.5">
                      {['Dashboard', 'Writer', 'Calendar', 'Library', 'Analytics'].map((item, i) => (
                        <div
                          key={i}
                          className={`text-[11px] px-2.5 py-1.5 rounded-md ${
                            i === 1
                              ? 'bg-primary/12 text-primary font-medium'
                              : 'text-muted-foreground/50'
                          }`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Editor area */}
                  <div className="flex-1 p-5 sm:p-6">
                    {/* Platform tabs */}
                    <div className="flex items-center gap-1 mb-5">
                      {[
                        { label: 'LinkedIn', active: true },
                        { label: 'X', active: false },
                        { label: 'Threads', active: false },
                      ].map((tab, i) => (
                        <div
                          key={i}
                          className={`text-[10px] px-2.5 py-1 rounded-md font-medium ${
                            tab.active
                              ? 'bg-primary/15 text-primary'
                              : 'text-muted-foreground/30'
                          }`}
                        >
                          {tab.label}
                        </div>
                      ))}
                      <div className="ml-auto">
                        <div className="text-[9px] text-muted-foreground/30 bg-muted/30 rounded px-2 py-0.5 tracking-wide">
                          Drafting
                        </div>
                      </div>
                    </div>

                    {/* Post content */}
                    <div className="text-[12px] sm:text-[13px] leading-[1.8] space-y-2.5 max-w-[480px]">
                      <p className="font-semibold text-foreground/85">
                        Most founders treat posting as a task.<br />
                        The ones people follow treat it as infrastructure.
                      </p>
                      <p className="text-muted-foreground/60">
                        The difference isn't creativity. It's system.
                      </p>
                      <p className="text-muted-foreground/50">
                        Here's what I learned after 3 years of building in public:
                      </p>
                    </div>

                    {/* Cursor */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-[14px] w-px bg-primary animate-pulse" />
                      <span className="text-[10px] text-muted-foreground/25">2,180 chars · 430 left</span>
                    </div>

                    {/* Signal score bar */}
                    <div className="mt-6 flex items-center gap-3 max-w-[320px]">
                      <div className="flex items-center gap-1.5 text-[10px] text-primary flex-shrink-0">
                        <Zap className="w-3 h-3" />
                        <span className="font-semibold">84</span>
                      </div>
                      <div className="flex-1 h-1 bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: '84%' }} />
                      </div>
                      <span className="text-[10px] text-primary font-medium flex-shrink-0">Strong</span>
                    </div>
                  </div>

                  {/* Preview panel */}
                  <div className="w-[196px] border-l border-border hidden lg:block bg-muted/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wider">Preview</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    </div>
                    <div className="rounded-lg border border-border/40 bg-card p-3 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex-shrink-0" />
                        <div className="space-y-1">
                          <div className="h-1.5 w-16 bg-foreground/20 rounded" />
                          <div className="h-1 w-10 bg-muted-foreground/15 rounded" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-1.5 w-full bg-foreground/15 rounded" />
                        <div className="h-1.5 w-[85%] bg-foreground/10 rounded" />
                        <div className="h-1.5 w-full bg-foreground/8 rounded" />
                        <div className="h-1.5 w-3/4 bg-foreground/8 rounded" />
                        <div className="h-1.5 w-[90%] bg-foreground/6 rounded" />
                      </div>
                      <div className="flex items-center gap-3 pt-1 border-t border-border/30">
                        <div className="h-1 w-7 bg-muted-foreground/15 rounded" />
                        <div className="h-1 w-7 bg-muted-foreground/15 rounded" />
                        <div className="h-1 w-7 bg-muted-foreground/15 rounded" />
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground/25 mt-2 text-center">LinkedIn · live preview</p>
                  </div>

                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">

          <div className="flex flex-col sm:flex-row sm:items-end gap-8 sm:gap-20 mb-16">
            <div className="flex-shrink-0">
              <p className="text-[10px] text-primary font-medium tracking-[0.18em] uppercase mb-4">The system</p>
              <h2 className="font-serif text-3xl sm:text-[38px] font-semibold tracking-tight leading-tight">
                Everything in one
                <br />publishing system
              </h2>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[340px] sm:mb-1.5">
              Most founders know they should post more. The ones people follow have a system. Here's what's inside Qalam.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 rounded-xl overflow-hidden">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="bg-card p-8 group"
                >
                  <Icon className="w-4 h-4 text-primary/60 mb-4 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                  <h3 className="text-[13px] font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">

          <div className="mb-14">
            <p className="text-[10px] text-primary font-medium tracking-[0.18em] uppercase mb-4">Plans</p>
            <h2 className="font-serif text-3xl sm:text-[38px] font-semibold tracking-tight">
              Start free. Upgrade when you're ready.
            </h2>
            <p className="text-[13px] text-muted-foreground mt-3">
              All paid plans include a 14-day free trial. No contracts.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`rounded-xl border flex flex-col relative ${
                  plan.highlight
                    ? 'border-primary/40 bg-card shadow-2xl shadow-black/15'
                    : 'border-border bg-card/60'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-5 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold tracking-wide">
                    {plan.badge}
                  </div>
                )}

                <div className="p-6 pb-4">
                  <p className="text-[9px] font-semibold tracking-[0.2em] uppercase text-muted-foreground/50 mb-3">
                    {plan.name}
                  </p>
                  <p className={`text-[15px] font-semibold leading-snug mb-4 ${plan.highlight ? 'text-foreground' : 'text-foreground/80'}`}>
                    {plan.tagline}
                  </p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-[24px] font-light tracking-tight text-foreground">{plan.price}</span>
                    {plan.period && (
                      <span className="text-[11px] text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground/50 leading-relaxed">{plan.desc}</p>
                </div>

                <div className="h-px bg-border/50 mx-6" />

                <ul className="px-6 py-5 space-y-2.5 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                      <Check className={`w-3 h-3 mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-primary' : 'text-primary/60'}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="px-6 pb-6">
                  <Link to="/login" className="w-full block">
                    <Button
                      className={`w-full text-[12px] h-9 font-medium ${
                        plan.highlight
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-transparent text-foreground hover:bg-muted border border-border'
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground/40 text-center mt-8">
            Prices in PKR · billed monthly · cancel any time
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 px-6 border-t border-border">
        <div className="max-w-xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-serif text-[34px] sm:text-4xl font-semibold tracking-tight leading-tight mb-5">
              Your expertise is ready.
              <br />
              <span className="text-muted-foreground/60">The system is waiting.</span>
            </h2>
            <p className="text-[13px] text-muted-foreground mb-9 leading-relaxed max-w-sm mx-auto">
              Start writing in under five minutes. No template. No onboarding call. Just your voice and a system to ship it every week.
            </p>
            <Link to="/login">
              <Button className="h-11 px-8 text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                Get started free
                <ArrowRight className="ml-2 w-3.5 h-3.5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <QalamLogo size="sm" />
          <p className="text-[11px] text-muted-foreground/50">
            © 2026 Qalam. Built for people with something to say.
          </p>
        </div>
      </footer>

    </div>
  );
}
