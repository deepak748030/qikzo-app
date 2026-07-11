import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Badge, Button, Card, Skeleton, Textarea } from '@/components/ui';
import { ArrowLeft, Send } from 'lucide-react';
import { fmtDate, cn } from '@/lib/utils';

type Message = { _id: string; role: 'customer' | 'rider' | 'admin'; text: string; createdAt: string };
type Ticket = {
  _id: string; subject: string; status: 'open' | 'pending' | 'resolved' | 'closed';
  role: 'customer' | 'rider'; user?: { name?: string; phone?: string };
  createdAt?: string; messages?: Message[];
};

const STATUSES = ['open', 'pending', 'resolved', 'closed'] as const;

export default function SupportDetailPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'support', id],
    queryFn: () => api<{ ticket: Ticket; messages: Message[] }>(`/admin/support/${id}`),
    enabled: !!id,
  });

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api(`/admin/support/${id}/reply`, { method: 'POST', body: { text: reply.trim() } });
      setReply('');
      await qc.invalidateQueries({ queryKey: ['admin', 'support', id] });
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setSending(false); }
  };

  const setStatus = async (status: string) => {
    try {
      await api(`/admin/support/${id}/status`, { method: 'PATCH', body: { status } });
      toast.success('Status updated');
      await qc.invalidateQueries({ queryKey: ['admin', 'support', id] });
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
  };

  const t = data?.ticket;
  const messages = data?.messages ?? t?.messages ?? [];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <button onClick={() => nav(-1)} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {isLoading || !t ? (
        <Card><Skeleton className="h-6 w-40 mb-2" /><Skeleton className="h-4 w-24" /></Card>
      ) : (
        <>
          <Card>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="font-display font-semibold text-xl">{t.subject}</h1>
                <div className="text-sm text-muted-foreground mt-1">
                  From {t.user?.name || t.user?.phone || 'user'} · <span className="capitalize">{t.role}</span> · {fmtDate(t.createdAt)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={t.status === 'resolved' || t.status === 'closed' ? 'success' : t.status === 'pending' ? 'warning' : 'info'}>{t.status}</Badge>
                <select className="h-9 rounded-md border border-border bg-background px-2 text-sm" value={t.status} onChange={e => setStatus(e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {messages.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No messages yet.</div>}
              {messages.map(m => (
                <div key={m._id} className={cn('flex', m.role === 'admin' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                    m.role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  )}>
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    <div className={cn('text-[10px] mt-1', m.role === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {m.role} · {fmtDate(m.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <Textarea placeholder="Type a reply…" value={reply} onChange={e => setReply(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={send} loading={sending} disabled={!reply.trim()}>
                  <Send className="h-4 w-4" /> Send reply
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
