import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { canAccess, requiredPlan, PLAN_LABELS, FEATURE_META } from '@/lib/planGating';

/**
 * Inline gate — small, used inside panels and sidebar components.
 * Renders a single row with a lock icon and upgrade link.
 */
export function PlanGateInline({ feature }) {
  const needed = PLAN_LABELS[requiredPlan(feature)];
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20 border border-border/50">
      <Lock className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" strokeWidth={1.5} />
      <p className="text-[11px] text-muted-foreground/60">
        {needed} feature —{' '}
        <Link to="/settings" className="text-primary hover:underline underline-offset-2 font-medium">
          view plans
        </Link>
      </p>
    </div>
  );
}

/**
 * Full-page gate — replaces the content area of a page.
 * Shows feature name, description, required plan, and upgrade path.
 */
export function PlanGatePage({ feature }) {
  const needed = requiredPlan(feature);
  const meta = FEATURE_META[feature] ?? { label: feature, desc: '' };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-7">
        <Lock className="w-5 h-5 text-muted-foreground/30" strokeWidth={1.5} />
      </div>

      <p className="text-[10px] tracking-[0.2em] text-primary/60 uppercase font-semibold mb-3">
        {PLAN_LABELS[needed]} plan
      </p>

      <h2 className="font-serif text-[26px] font-medium tracking-tight text-foreground mb-3">
        {meta.label}
      </h2>

      <p className="text-[13px] text-muted-foreground/70 max-w-[320px] leading-relaxed mb-9">
        {meta.desc}
      </p>

      <Link
        to="/settings"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
      >
        View plans
      </Link>

      <p className="text-[11px] text-muted-foreground/30 mt-4">
        Settings → Billing → {PLAN_LABELS[needed]}
      </p>
    </div>
  );
}

/**
 * Default export — auto-selects inline or page gate based on `inline` prop.
 * Renders children if the user's plan has access.
 */
export default function PlanGate({ feature, children, inline = false }) {
  const { plan } = useApp();
  if (canAccess(plan, feature)) return children;
  if (inline) return <PlanGateInline feature={feature} />;
  return <PlanGatePage feature={feature} />;
}
