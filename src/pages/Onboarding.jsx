import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import QalamLogo from '@/components/layout/QalamLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/lib/AppContext';
import { toast } from 'sonner';

const industries = ['Technology', 'Finance', 'Marketing', 'Healthcare', 'Consulting', 'Education', 'Legal', 'Design', 'Sales', 'Other'];
const goals = ['Reputation building', 'Lead generation', 'Personal brand', 'Community building', 'Hiring & talent', 'Product marketing'];
const tones = ['Professional & direct', 'Warm & conversational', 'Analytical & data-driven', 'Bold & provocative', 'Educational & mentoring', 'Storytelling'];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: '', linkedinUrl: '', industry: '', goals: [], tone: '' });
  const navigate = useNavigate();
  const { setProfile } = useApp();

  const steps = [
    {
      title: 'Welcome to Qalam',
      subtitle: "Let's set up your content system. This takes about 2 minutes.",
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Full name</label>
            <Input
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              placeholder="Alex Kim"
              className="mt-1.5 bg-muted border-border text-sm h-10"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">LinkedIn profile URL</label>
            <Input
              value={data.linkedinUrl}
              onChange={(e) => setData({ ...data, linkedinUrl: e.target.value })}
              placeholder="linkedin.com/in/alexkim"
              className="mt-1.5 bg-muted border-border text-sm h-10"
            />
          </div>
        </div>
      ),
    },
    {
      title: 'Your industry',
      subtitle: 'This helps Qalam understand your context.',
      content: (
        <div className="grid grid-cols-2 gap-2">
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => setData({ ...data, industry: ind })}
              className={`px-4 py-3 rounded-lg border text-sm text-left transition-all ${
                data.industry === ind ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'Content goals',
      subtitle: 'Select all that apply.',
      content: (
        <div className="grid grid-cols-1 gap-2">
          {goals.map((g) => {
            const selected = data.goals.includes(g);
            return (
              <button
                key={g}
                onClick={() => setData({
                  ...data,
                  goals: selected ? data.goals.filter(x => x !== g) : [...data.goals, g]
                })}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm text-left transition-all ${
                  selected ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center ${selected ? 'bg-primary' : 'border border-border'}`}>
                  {selected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                {g}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: 'Writing tone',
      subtitle: 'Choose the tone that best describes your content style.',
      content: (
        <div className="grid grid-cols-1 gap-2">
          {tones.map((t) => (
            <button
              key={t}
              onClick={() => setData({ ...data, tone: t })}
              className={`px-4 py-3 rounded-lg border text-sm text-left transition-all ${
                data.tone === t ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-lg">
        <div className="mb-10 flex items-center justify-between">
          <QalamLogo size="sm" />
          <span className="text-[11px] text-muted-foreground">
            Step {step + 1} of {steps.length}
          </span>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-10">
          {steps.map((_, i) => (
            <div key={i} className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="font-serif text-2xl font-semibold mb-2">{steps[step].title}</h2>
            <p className="text-sm text-muted-foreground mb-8">{steps[step].subtitle}</p>
            {steps[step].content}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-10">
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
            className="text-xs text-muted-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back
          </Button>
          <Button
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                setProfile(prev => ({ ...prev, ...data }));
                toast.success('Welcome to Qalam. Your workspace is ready.');
                navigate('/dashboard');
              }
            }}
            className="text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {step < steps.length - 1 ? 'Continue' : 'Launch Qalam'}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}