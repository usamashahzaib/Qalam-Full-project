export const plans = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    draftsPerMonth: 10,
    carouselsPerMonth: 2,
    researchPerMonth: 0,
    annualLabel: 'Free forever',
    description: 'Try the real workflow. No card, no time limit - just a capped starter workspace.',
    features: ['Basic AI Writer', '2 Carousel Templates', 'Hook Generator'],
    cta: 'Start free',
    badge: 'No card required',
    limits: { drafts: 10, workspaces: 1, carousels: 2, competitorRuns: 0, voiceProfiles: 0 }
  },
  {
    name: 'Solo',
    monthlyPrice: 899,
    annualPrice: 599,
    draftsPerMonth: 25,
    carouselsPerMonth: 6,
    researchPerMonth: 0,
    annualLabel: 'PKR 599/mo billed annually',
    description: 'For individual professionals building a consistent LinkedIn presence.',
    features: ['AI Writer', '5 Carousel Templates', 'Voice Profile', 'Basic Analytics'],
    cta: 'Get Solo',
    badge: 'Most popular',
    limits: { drafts: 25, workspaces: 1, carousels: 6, competitorRuns: 0, voiceProfiles: 1 }
  },
  {
    name: 'Pro',
    monthlyPrice: 1899,
    annualPrice: 1266,
    draftsPerMonth: 60,
    carouselsPerMonth: 15,
    researchPerMonth: 5,
    annualLabel: 'PKR 1,266/mo billed annually',
    description: 'For serious creators and consultants who need full AI power and research.',
    features: ['AI Writer', '15 Carousel Templates', 'Voice Training', 'AI Strategist', 'Priority Queue', 'Advanced Analytics'],
    cta: 'Get Pro',
    badge: 'Best value',
    limits: { drafts: 60, workspaces: 1, carousels: 15, competitorRuns: 5, voiceProfiles: 5 }
  },
  {
    name: 'Agency',
    monthlyPrice: 7490,
    annualPrice: 4993,
    draftsPerMonth: 60,
    carouselsPerMonth: 50,
    researchPerMonth: 25,
    workspaces: 5,
    annualLabel: 'PKR 4,993/mo billed annually',
    description: 'For teams managing multiple clients and brands.',
    features: ['Everything in Pro', '5 Workspaces', 'Approval Workflow', 'Team Analytics', 'White-label Export'],
    cta: 'Get Agency',
    badge: 'For teams',
    limits: { drafts: 60, workspaces: 5, carousels: 50, competitorRuns: 25, voiceProfiles: 25 }
  }
];

export const annualFraming = '4 months free';
export const annualSavingsPercent = 33;

// Helper to get plan by name
export function getPlanByName(name: string) {
  return plans.find(p => p.name === name) || plans[0];
}

// Helper to check if a feature is available on a plan
export function hasFeature(planName: string, feature: string): boolean {
  const plan = getPlanByName(planName);
  switch (feature) {
    case 'scheduling': return plan.name !== 'Free';
    case 'voiceProfile': return plan.name !== 'Free';
    case 'analytics': return plan.name !== 'Free';
    case 'carousel': return plan.limits.carousels > 0;
    case 'competitorResearch': return plan.name === 'Pro' || plan.name === 'Agency';
    case 'approvalWorkflow': return plan.name === 'Pro' || plan.name === 'Agency';
    case 'export': return plan.name === 'Pro' || plan.name === 'Agency';
    case 'whiteLabel': return plan.name === 'Agency';
    case 'teamSeats': return plan.name === 'Agency';
    default: return false;
  }
}

export interface PricingPlan {
  plan: string;
  monthlyPkr: number;
  annualPkrPerMonth?: number;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
  badge?: string;
  featureStatus: 'live' | 'beta' | 'coming_soon';
}

export const PLANS: PricingPlan[] = plans.map(plan => ({
  plan: plan.name,
  monthlyPkr: plan.monthlyPrice,
  annualPkrPerMonth: plan.annualPrice,
  period: plan.monthlyPrice === 0 ? 'forever' : 'mo',
  description: plan.description,
  features: plan.features,
  cta: plan.cta,
  href: plan.name === 'Agency' ? '/contact' : '/auth',
  highlighted: plan.badge === 'Most popular',
  badge: plan.badge,
  featureStatus: plan.name === 'Agency' ? 'beta' : 'live',
}));

export const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = Object.fromEntries(
  plans.map(plan => [plan.name, { monthly: plan.monthlyPrice, annual: plan.annualPrice }])
);

export const PLAN_FEATURES: Record<string, string[]> = Object.fromEntries(
  plans.map(plan => [plan.name, plan.features])
);

export const COMPARISON_ROWS: {
  label: string;
  free: string;
  solo: string;
  pro: string;
  agencyStarter: string;
  agencyGrowth: string;
}[] = [
  { label: 'AI drafts', free: '10/month', solo: '25/month', pro: '60/month', agencyStarter: '60/workspace', agencyGrowth: '-' },
  { label: 'Post scheduling', free: '-', solo: 'Live', pro: 'Live', agencyStarter: 'Live', agencyGrowth: '-' },
  { label: 'Voice profiles', free: '-', solo: '1', pro: '5', agencyStarter: '25', agencyGrowth: '-' },
  { label: 'Scoring', free: 'Basic', solo: 'Basic', pro: 'Full', agencyStarter: 'Full', agencyGrowth: '-' },
  { label: 'Carousel generation', free: '2/month', solo: '6/month', pro: '15/month', agencyStarter: '50/month', agencyGrowth: '-' },
  { label: 'Competitor research', free: '-', solo: '-', pro: '5 runs/month', agencyStarter: '25 runs/month', agencyGrowth: '-' },
  { label: 'Approval workflow', free: '-', solo: '-', pro: 'Live', agencyStarter: 'Live', agencyGrowth: '-' },
  { label: 'Analytics', free: '-', solo: 'Basic', pro: 'Full', agencyStarter: 'Full', agencyGrowth: '-' },
  { label: 'Export', free: '-', solo: '-', pro: 'PDF and text', agencyStarter: 'PDF and text', agencyGrowth: '-' },
  { label: 'Client workspaces', free: '-', solo: '-', pro: '-', agencyStarter: '5', agencyGrowth: '-' },
  { label: 'Team seats', free: '1', solo: '1', pro: '1', agencyStarter: '10', agencyGrowth: '-' },
  { label: 'Monthly price', free: 'Rs 0', solo: 'PKR 899', pro: 'PKR 1,899', agencyStarter: 'PKR 7,490', agencyGrowth: '-' },
];

export const formatPkr = (amount: number): string => {
  if (amount === 0) return 'Rs 0';
  return `PKR ${amount.toLocaleString('en-PK')}`;
};
