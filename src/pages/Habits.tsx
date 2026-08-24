import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Power, CalendarClock, Repeat, TriangleAlert, Sprout } from 'lucide-react';
import { api } from '@/services/api';
import { onDataChanged } from '@/services/dataEvents';
import type { Habit, HabitKind } from '@/types';
import { Card, CardHeader, Button, Skeleton, EmptyState, ProgressBar } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { HabitForm } from '@/components/habits/HabitForm';
import { formatTimeSlot } from '@/utils/datetime';
import { useRobot } from '@/contexts/RobotContext';

const FREQ_LABEL: Record<string, string> = {
  daily: 'Every day',
  weekdays: 'Mon–Fri',
  weekly: 'Weekly',
  custom: 'Custom days',
};

export function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [creatingKind, setCreatingKind] = useState<HabitKind | null>(null);
  const { say } = useRobot();

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<{ habits: Habit[] }>('/habits');
      setHabits(data.habits);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load habits.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => onDataChanged(load), [load]);

  async function toggleActive(h: Habit) {
    await api.put(`/habits/${h.id}`, { toggleActiveOnly: true });
    load();
  }

  async function remove(h: Habit) {
    if (!window.confirm(`Delete "${h.name}"? Its history will also be removed.`)) return;
    try {
      await api.del(`/habits/${h.id}`);
      say('Removed. Space for something new!', 'idle');
      load();
    } catch (e) {
      say(e instanceof Error ? e.message : 'Could not delete.', 'encouraging');
    }
  }

  const daily = habits.filter((h) => (h.kind ?? 'daily') === 'daily');
  const scheduled = habits.filter((h) => h.kind === 'scheduled');
  const modalOpen = creatingKind != null || editing != null;
  const modalKind: HabitKind = editing ? editing.kind ?? 'daily' : creatingKind ?? 'daily';

  function closeModal() {
    setCreatingKind(null);
    setEditing(null);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Your Habits</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Daily routines for consistency on the left — scheduled tasks with time slots on the right.
        </p>
      </header>

      {error && (
        <EmptyState icon={<TriangleAlert size={24} />} title="Couldn't load habits" description={error} action={<Button onClick={load}>Retry</Button>} />
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Daily consistency column */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Repeat size={16} className="text-indigo-500" /> Daily habits
              </span>
            }
            subtitle="Recurring routines that build your streaks"
            action={
              <Button size="sm" onClick={() => setCreatingKind('daily')}>
                <Plus size={15} /> Add
              </Button>
            }
          />
          <HabitList
            items={daily}
            emptyTitle="No daily habits yet"
            emptyDescription="Small daily routines — check them off each day for consistency."
            onAdd={() => setCreatingKind('daily')}
            onEdit={setEditing}
            onToggle={toggleActive}
            onRemove={remove}
          />
        </Card>

        {/* Daywise scheduled column */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <CalendarClock size={16} className="text-violet-500" /> Scheduled tasks
              </span>
            }
            subtitle="Daywise tasks booked in a time slot"
            action={
              <Button size="sm" onClick={() => setCreatingKind('scheduled')}>
                <Plus size={15} /> Add
              </Button>
            }
          />
          <HabitList
            items={scheduled}
            emptyTitle="No scheduled tasks yet"
            emptyDescription="Book a task into a time slot — it shows on your dashboard schedule every day until you end it."
            onAdd={() => setCreatingKind('scheduled')}
            onEdit={setEditing}
            onToggle={toggleActive}
            onRemove={remove}
            scheduled
          />
        </Card>
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? `Edit ${modalKind === 'scheduled' ? 'task' : 'habit'}` : modalKind === 'scheduled' ? 'New scheduled task' : 'New daily habit'}>
        <HabitForm
          kind={modalKind}
          existing={editing}
          onSaved={closeModal}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}

function HabitList({
  items,
  emptyTitle,
  emptyDescription,
  onAdd,
  onEdit,
  onToggle,
  onRemove,
  scheduled = false,
}: {
  items: Habit[];
  emptyTitle: string;
  emptyDescription: string;
  onAdd: () => void;
  onEdit: (h: Habit) => void;
  onToggle: (h: Habit) => void;
  onRemove: (h: Habit) => void;
  scheduled?: boolean;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={scheduled ? <CalendarClock size={24} /> : <Sprout size={24} />}
        title={emptyTitle}
        description={emptyDescription}
        action={
          <Button onClick={onAdd}>
            <Plus size={16} /> Add one
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2">
      {items.map((h) => {
        const active = Boolean(h.active);
        return (
          <div key={h.id} className={`rounded-2xl border border-slate-200 p-4 dark:border-slate-700/60 ${active ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: h.color }} />
                  <h2 className="truncate font-display text-sm font-semibold text-slate-900 dark:text-slate-100">{h.name}</h2>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {scheduled
                    ? `${h.start_time ? formatTimeSlot(h.start_time) : ''}${h.end_slot ? ` – ${formatTimeSlot(h.end_slot)}` : ''}`
                    : FREQ_LABEL[h.frequency]}
                  {!active && ' · paused'}
                </p>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <IconButton label={`Edit ${h.name}`} onClick={() => onEdit(h)}>
                  <Pencil size={14} />
                </IconButton>
                <IconButton label={active ? `Pause ${h.name}` : `Resume ${h.name}`} onClick={() => onToggle(h)}>
                  <Power size={14} />
                </IconButton>
                <IconButton label={`Delete ${h.name}`} onClick={() => onRemove(h)} danger>
                  <Trash2 size={14} />
                </IconButton>
              </div>
            </div>
            {h.description && (
              <p className="mt-1.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{h.description}</p>
            )}
            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px]">
              {!scheduled && <Tag>{h.end_date ? `until ${h.end_date}` : 'until you cancel'}</Tag>}
              {!scheduled && h.target_type !== 'boolean' && (
                <Tag>{h.target_type === 'duration' ? `${h.target_value} min` : `${h.target_value}× / day`}</Tag>
              )}
            </div>
            <div className="mt-2.5">
              <ProgressBar pct={active ? 100 : 20} color={active ? h.color : '#94a3b8'} label={`${h.name} status`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        danger
          ? 'text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {children}
    </span>
  );
}
