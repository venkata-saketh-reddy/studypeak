import { useEffect, useState } from 'react';
import type { Frequency, Habit, HabitKind, TargetType } from '@/types';
import { api } from '@/services/api';
import { Button } from '@/components/ui';
import { FancySelect } from '@/components/ui/FancySelect';
import { TimeSlotPicker } from '@/components/ui/TimeSlotPicker';
import { formatTimeSlot } from '@/utils/datetime';

const CATEGORIES = ['Study', 'Fitness', 'Reading', 'Personal', 'General'];
const COLORS = ['#4f7cff', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444'];
const DOW = [
  { v: 0, label: 'S' },
  { v: 1, label: 'M' },
  { v: 2, label: 'T' },
  { v: 3, label: 'W' },
  { v: 4, label: 'T' },
  { v: 5, label: 'F' },
  { v: 6, label: 'S' },
];

interface HabitFormProps {
  kind: HabitKind;
  existing?: Habit | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function HabitForm({ kind, existing, onSaved, onCancel }: HabitFormProps) {
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'Study');
  const [targetType, setTargetType] = useState<TargetType>(existing?.target_type ?? 'boolean');
  const [targetValue, setTargetValue] = useState<number>(
    existing ? existing.target_value : targetType === 'duration' ? 60 : 1
  );
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? 'daily');
  const [weekdays, setWeekdays] = useState<number[]>(
    Array.isArray(existing?.weekdays) ? existing.weekdays : safeParseWeekdays(existing?.weekdays)
  );
  const [intervalWeeks, setIntervalWeeks] = useState(existing?.interval_weeks ?? 1);
  const [startDate, setStartDate] = useState(existing?.start_date ?? new Date().toISOString().slice(0, 10));
  const [endMode, setEndMode] = useState<'cancel' | 'date'>(existing?.end_date ? 'date' : 'cancel');
  const [endDate, setEndDate] = useState(existing?.end_date ?? '');
  const [scheduledTime, setScheduledTime] = useState(existing?.scheduled_time ?? '');
  const [startTime, setStartTime] = useState(existing?.start_time ?? '09:00');
  const [endTime, setEndTime] = useState(existing?.end_slot ?? '10:00');
  const [color, setColor] = useState(existing?.color ?? COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (kind === 'daily' && !existing && targetType === 'duration' && targetValue === 1) setTargetValue(60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Please give your habit a name.');
      return;
    }
    if (kind === 'daily' && targetType !== 'boolean' && (!Number.isFinite(targetValue) || targetValue <= 0)) {
      setError('Target must be a positive number.');
      return;
    }
    if (kind === 'daily' && frequency === 'custom' && weekdays.length === 0) {
      setError('Pick at least one day of the week.');
      return;
    }
    if (kind === 'scheduled' && endTime <= startTime) {
      setError('The end time must be after the start time.');
      return;
    }
    if (endMode === 'date' && !endDate) {
      setError('Pick an end date, or choose "Until I cancel".');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        kind,
        name,
        description,
        startDate,
        endDate: endMode === 'date' ? endDate : null,
      };
      if (kind === 'scheduled') {
        body.startTime = startTime;
        body.endTime = endTime;
        body.scheduledTime = startTime;
      } else {
        body.category = category;
        body.targetType = targetType;
        body.targetValue = targetValue;
        body.frequency = frequency;
        body.weekdays = weekdays;
        body.intervalWeeks = intervalWeeks;
        body.scheduledTime = scheduledTime || null;
        body.color = color;
      }
      if (existing) await api.put(`/habits/${existing.id}`, body);
      else await api.post('/habits', body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save habit.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field label="Name" htmlFor="habit-name">
        <input
          id="habit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder={kind === 'scheduled' ? 'e.g. Java class' : 'e.g. Study Java'}
          className={inputCls}
          required
        />
      </Field>

      <Field label="Description (optional)" htmlFor="habit-desc">
        <textarea
          id="habit-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="What does success look like?"
          className={inputCls}
        />
      </Field>

      {kind === 'scheduled' ? (
        <Field label="Time slot" htmlFor="habit-start-time">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-10 text-xs font-medium text-slate-500 dark:text-slate-400">From</span>
              <TimeSlotPicker id="habit-start-time" value={startTime} onChange={(v) => setStartTime(v ?? '09:00')} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-10 text-xs font-medium text-slate-500 dark:text-slate-400">To</span>
              <TimeSlotPicker id="habit-end-time" value={endTime} onChange={(v) => setEndTime(v ?? '10:00')} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Booked daily from {formatTimeSlot(startTime)} to {formatTimeSlot(endTime)}.
            </p>
          </div>
        </Field>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" htmlFor="habit-cat">
              <FancySelect
                id="habit-cat"
                ariaLabel="Category"
                value={category}
                onChange={setCategory}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </Field>
            <Field label="Color">
              <div className="flex gap-1.5 pt-1.5" role="radiogroup" aria-label="Habit color">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={color === c}
                    aria-label={`Color ${c}`}
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      color === c ? 'scale-110 ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Target type</legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['boolean', 'Check-off'],
                  ['duration', 'Duration (min)'],
                  ['quantity', 'Quantity'],
                ] as [TargetType, string][]
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTargetType(v)}
                  aria-pressed={targetType === v}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                    targetType === v
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          {targetType !== 'boolean' && (
            <Field
              label={targetType === 'duration' ? 'Target minutes' : 'Target quantity'}
              htmlFor="habit-target"
            >
              <input
                id="habit-target"
                type="number"
                min={1}
                max={targetType === 'duration' ? 1440 : 10000}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
                className={inputCls}
                required
              />
            </Field>
          )}

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Repeats</legend>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ['daily', 'Daily'],
                  ['weekdays', 'Weekdays'],
                  ['weekly', 'Weekly'],
                  ['custom', 'Custom'],
                ] as [Frequency, string][]
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFrequency(v)}
                  aria-pressed={frequency === v}
                  className={`rounded-xl border px-2 py-2 text-xs font-medium transition-colors ${
                    frequency === v
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {frequency === 'custom' && (
              <div className="mt-2 flex gap-1.5" role="group" aria-label="Days of week">
                {DOW.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={weekdays.includes(d.v)}
                    aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.v]}
                    onClick={() =>
                      setWeekdays((w) => (w.includes(d.v) ? w.filter((x) => x !== d.v) : [...w, d.v].sort()))
                    }
                    className={`h-9 w-9 rounded-full text-xs font-semibold transition-colors ${
                      weekdays.includes(d.v)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
            {frequency === 'weekly' && (
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                Every
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={intervalWeeks}
                  onChange={(e) => setIntervalWeeks(Number(e.target.value))}
                  className="w-14 rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
                  aria-label="Interval in weeks"
                />
                week(s)
              </p>
            )}
          </fieldset>

          <Field label="Time slot (optional)" htmlFor="habit-slot">
            <div className="flex items-center gap-2">
              {scheduledTime ? (
                <TimeSlotPicker id="habit-slot" value={scheduledTime} onChange={(v) => setScheduledTime(v ?? '')} />
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={() => setScheduledTime('09:00')}>
                  + Set a time
                </Button>
              )}
              {scheduledTime && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setScheduledTime('')}>
                  Clear
                </Button>
              )}
            </div>
          </Field>
        </>
      )}

      {/* Duration: from today until… (daily habits only — scheduled tasks run until cancelled) */}
      {kind === 'daily' && (
        <fieldset className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-700">
          <legend className="px-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Showing from — until</legend>
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-14 text-xs font-medium text-slate-500 dark:text-slate-400">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls + ' max-w-[10rem]'}
                aria-label="Start date"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500">(defaults to today)</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-14 text-xs font-medium text-slate-500 dark:text-slate-400">Until</span>
              <div className="flex flex-wrap gap-2">
                <label
                  className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                    endMode === 'cancel'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="end-mode"
                    checked={endMode === 'cancel'}
                    onChange={() => setEndMode('cancel')}
                    className="accent-indigo-600"
                  />
                  I cancel it
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                    endMode === 'date'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="end-mode"
                    checked={endMode === 'date'}
                    onChange={() => setEndMode('date')}
                    className="accent-indigo-600"
                  />
                  A date
                </label>
                {endMode === 'date' && (
                  <input
                    type="date"
                    value={endDate ?? ''}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className={inputCls + ' max-w-[10rem]'}
                    aria-label="End date"
                  />
                )}
              </div>
            </div>
          </div>
        </fieldset>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : existing ? 'Save changes' : kind === 'scheduled' ? 'Create task' : 'Create habit'}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

function safeParseWeekdays(w: string | number[] | undefined): number[] {
  try {
    return typeof w === 'string' ? JSON.parse(w || '[]') : w ?? [1, 2, 3, 4, 5];
  } catch {
    return [1, 2, 3, 4, 5];
  }
}
