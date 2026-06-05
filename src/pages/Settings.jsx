import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useApp } from '@/lib/AppContext';
import BrandVoiceTab from '@/components/settings/BrandVoiceTab';

const plans = [
  {
    name: 'Free', price: 'PKR 0', period: '', current: false,
    features: ['5 posts / month', 'Post library', 'Live platform preview'],
  },
  {
    name: 'Pro', price: 'PKR 3,499', period: '/mo', current: true,
    features: ['Unlimited posts', 'Voice Fingerprint', 'Publishing calendar', 'Post Signal scoring', 'Analytics'],
  },
  {
    name: 'Growth', price: 'PKR 6,999', period: '/mo', current: false,
    features: ['Everything in Pro', 'Competitor monitor', 'Audience insights', 'Hashtag generator', 'Priority support'],
  },
  {
    name: 'Agency', price: 'PKR 14,999', period: '/mo', current: false,
    features: ['Everything in Growth', '10 client workspaces', 'Client approvals', 'White-label exports', 'Dedicated support'],
  },
];

const TABS = ['Profile', 'Brand Voice', 'Billing', 'Notifications', 'Integrations'];

const wu = (d = 0) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: d, duration: 0.25 },
});

export default function Settings() {
  const { profile, setProfile, plan, changePlan } = useApp();
  const [tab, setTab] = useState('Profile');
  const [form, setForm] = useState({
    name: profile?.name || 'Alex Kim',
    email: 'alex@company.com',
    linkedinUrl: profile?.linkedinUrl || 'linkedin.com/in/alexkim',
    bio: 'VP of Growth. Building in public. Writing about leadership, scaling, and the hard parts of building.',
  });

  const handleSaveProfile = () => {
    setProfile(prev => ({ ...prev, name: form.name, linkedinUrl: form.linkedinUrl }));
    toast.success('Profile saved');
  };

  return (
    <div className="min-h-full px-6 py-10 sm:px-10 lg:px-14 lg:py-14 max-w-[780px] mx-auto">

      <motion.div {...wu(0)} className="mb-12">
        <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium mb-4">Settings</p>
        <h1 className="font-serif text-[32px] font-medium tracking-tight leading-none">Account</h1>
      </motion.div>

      {/* Tab nav */}
      <motion.div {...wu(0.05)} className="flex items-center gap-1 mb-10 border-b border-border">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-[13px] transition-colors -mb-px border-b-2 ${
              tab === t
                ? 'text-foreground border-primary font-medium'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </motion.div>

      <motion.div {...wu(0.1)}>
        {tab === 'Profile' && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <Label className="text-[11px] text-muted-foreground tracking-wide">Full name</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="mt-2 bg-muted border-0 text-[13px] h-10 focus-visible:ring-1 focus-visible:ring-primary/40"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground tracking-wide">Email</Label>
                <Input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="mt-2 bg-muted border-0 text-[13px] h-10 focus-visible:ring-1 focus-visible:ring-primary/40"
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground tracking-wide">LinkedIn URL</Label>
              <Input
                value={form.linkedinUrl}
                onChange={e => setForm(f => ({ ...f, linkedinUrl: e.target.value }))}
                className="mt-2 bg-muted border-0 text-[13px] h-10 focus-visible:ring-1 focus-visible:ring-primary/40"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground tracking-wide">Bio</Label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                className="mt-2 w-full bg-muted border-0 rounded-md text-[13px] p-3 min-h-[90px] resize-none text-foreground outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div className="pt-2 border-t border-border">
              <button
                onClick={handleSaveProfile}
                className="px-5 py-2 text-[12px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Save changes
              </button>
            </div>
          </div>
        )}

        {tab === 'Brand Voice' && <BrandVoiceTab />}

        {tab === 'Billing' && (() => {
          const PLAN_KEY = { 'Free': 'free', 'Pro': 'pro', 'Growth': 'growth', 'Agency': 'agency' };
          const PLAN_PRICE_DISPLAY = { free: 'PKR 0', pro: 'PKR 3,499 / mo', growth: 'PKR 6,999 / mo', agency: 'PKR 14,999 / mo' };
          const currentPlanName = plans.find(p => PLAN_KEY[p.name] === plan)?.name ?? 'Pro';
          return (
            <div>
              <div className="border border-border rounded-lg p-6 mb-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground tracking-wider uppercase mb-1">Current plan</p>
                    <p className="text-[22px] font-light tracking-tight">
                      {currentPlanName}{' '}
                      <span className="text-sm text-muted-foreground">· {PLAN_PRICE_DISPLAY[plan]}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map((p, i) => {
                  const isCurrent = PLAN_KEY[p.name] === plan;
                  return (
                    <div
                      key={i}
                      className={`rounded-lg p-5 border relative ${isCurrent ? 'border-primary/40 bg-primary/5' : 'border-border'}`}
                    >
                      {isCurrent && (
                        <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-[9px] font-semibold rounded-full tracking-wider uppercase">
                          Current
                        </span>
                      )}
                      <p className="text-[10px] text-muted-foreground tracking-wider uppercase mb-3">{p.name}</p>
                      <div className="flex items-baseline gap-0.5 mb-5">
                        <span className="text-[22px] font-light tracking-tight">{p.price}</span>
                        <span className="text-[11px] text-muted-foreground">{p.period}</span>
                      </div>
                      <ul className="space-y-2.5 mb-5">
                        {p.features.map((f, j) => (
                          <li key={j} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                            <Check className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => { if (!isCurrent) changePlan(PLAN_KEY[p.name]); }}
                        disabled={isCurrent}
                        className={`w-full py-2 text-[11px] font-medium rounded-md transition-colors ${
                          isCurrent
                            ? 'bg-muted text-muted-foreground cursor-default'
                            : 'bg-muted text-foreground hover:bg-muted/70'
                        }`}
                      >
                        {isCurrent ? 'Current plan' : `Switch to ${p.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-muted-foreground/40 mt-6">
                Plan switching is available for preview. Billing integration is not yet active — no charges apply.
              </p>
            </div>
          );
        })()}

        {tab === 'Notifications' && (
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {[
              { label: 'Post published confirmation', desc: 'When a scheduled post goes live' },
              { label: 'Weekly analytics digest', desc: 'Performance summary every Monday' },
              { label: 'Engagement alerts', desc: 'When a post exceeds your average' },
              { label: 'Client approval reminders', desc: 'Remind clients about pending approvals' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-[13px] font-medium">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <Switch defaultChecked={i < 2} />
              </div>
            ))}
          </div>
        )}

        {tab === 'Integrations' && (
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {[
              { name: 'LinkedIn', desc: 'Publish posts directly to your profile' },
              { name: 'Slack', desc: 'Get notifications in your team channel' },
              { name: 'Zapier', desc: 'Connect to 5,000+ apps and automations' },
              { name: 'Notion', desc: 'Sync drafts and ideas with Notion' },
            ].map((int, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground flex-shrink-0">
                    {int.name[0]}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium">{int.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{int.desc}</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 text-[11px] text-muted-foreground/50 border border-border rounded-md flex-shrink-0">
                  Coming soon
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

    </div>
  );
}