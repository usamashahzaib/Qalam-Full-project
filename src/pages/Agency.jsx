import React, { useState, useMemo } from 'react';
import { Plus, MoreHorizontal, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useApp } from '@/lib/AppContext';
import { PlanGatePage } from '@/components/ui/PlanGate';
import { canAccess } from '@/lib/planGating';

const teamMembers = [
  { name: 'You', role: 'Agency owner', avatar: 'YO' },
];

export default function Agency() {
  const { agencyClients, addAgencyClient, plan } = useApp();
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  const clients = agencyClients;

  const stats = useMemo(() => {
    const active = clients.filter((c) => c.status === 'active').length;
    const postsMo = clients.reduce((sum, c) => sum + (c.postsThisMonth || 0), 0);
    const pending = clients.reduce((sum, c) => sum + (c.pendingApprovals || 0), 0);
    const scored = clients.filter((c) => (c.voiceScore || 0) > 0);
    const avgVoice =
      scored.length > 0
        ? `${Math.round(scored.reduce((s, c) => s + (c.voiceScore || 0), 0) / scored.length)}%`
        : '—';
    return [
      { label: 'Active clients', value: active },
      { label: 'Posts this month', value: postsMo },
      { label: 'Pending approvals', value: pending },
      { label: 'Avg voice score', value: avgVoice },
    ];
  }, [clients]);

  if (!canAccess(plan, 'agency_workspaces')) return <PlanGatePage feature="agency_workspaces" />;

  const handleCreate = () => {
    if (!name.trim()) return;
    addAgencyClient({
      name: name.trim(),
      company: company.trim(),
      linkedinUrl: linkedinUrl.trim(),
    });
    setName('');
    setCompany('');
    setLinkedinUrl('');
    setAddClientOpen(false);
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-2xl font-semibold">Agency Workspace</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {clients.length} client workspace{clients.length !== 1 ? 's' : ''} · manage brands from one place
            </p>
          </div>
          <Button
            onClick={() => setAddClientOpen(true)}
            size="sm"
            className="text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add client
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {clients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center mb-8">
            <p className="text-sm text-muted-foreground mb-4">
              No clients yet. Add a client workspace to track voice, posts, and approvals per brand.
            </p>
            <Button size="sm" onClick={() => setAddClientOpen(true)} className="bg-primary text-primary-foreground">
              Add your first client
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4 mb-8">
            {clients.map((client) => (
              <div
                key={client.id}
                className="rounded-xl border border-border bg-card p-5 hover:bg-muted/20 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                      {client.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{client.name}</p>
                      <p className="text-[11px] text-muted-foreground">{client.company || '—'}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-xs">Open workspace</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs">Export notes</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs">Settings</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Posts</p>
                    <p className="text-sm font-semibold">{client.postsThisMonth ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Voice</p>
                    <p className="text-sm font-semibold">
                      {client.voiceScore ? `${client.voiceScore}%` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Plan</p>
                    <p className="text-sm font-semibold">{client.plan}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="flex -space-x-1.5">
                      {(client.teamMembers || []).map((tm, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full bg-muted border border-card flex items-center justify-center text-[8px] font-medium text-muted-foreground"
                        >
                          {tm}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(client.pendingApprovals || 0) > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-primary">
                        <Clock className="w-3 h-3" />
                        {client.pendingApprovals} pending
                      </span>
                    )}
                    {client.status === 'onboarding' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                        Onboarding
                      </span>
                    )}
                    {client.status === 'active' && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-medium">Team</h3>
            <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground">
              <Plus className="w-3 h-3 mr-1" /> Invite
            </Button>
          </div>
          <div className="divide-y divide-border">
            {teamMembers.map((m, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-semibold text-primary-foreground">
                    {m.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">{m.role}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-[11px] h-7 text-muted-foreground">
                  Manage
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Add new client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Client name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 bg-muted border-border text-sm h-10"
                placeholder="Full name"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Company</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="mt-1.5 bg-muted border-border text-sm h-10"
                placeholder="Company name"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">LinkedIn URL</Label>
              <Input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="mt-1.5 bg-muted border-border text-sm h-10"
                placeholder="linkedin.com/in/..."
              />
            </div>
            <Button
              type="button"
              onClick={handleCreate}
              className="w-full text-xs h-10 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create workspace
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
