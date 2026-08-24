import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type RobotMood =
  | 'idle'
  | 'happy'
  | 'excited'
  | 'encouraging'
  | 'thinking'
  | 'celebrating'
  | 'sleepy';

export interface RobotMessage {
  text: string;
  mood: RobotMood;
}

interface RobotContextValue {
  message: RobotMessage | null;
  visible: boolean;
  say: (text: string, mood?: RobotMood) => void;
  dismiss: () => void;
  next: () => void;
}

const RobotContext = createContext<RobotContextValue | null>(null);

/** Gap between queued messages so they don't blur together. */
const MESSAGE_GAP_MS = 1200;
/** Auto-hide a message after this long without interaction. */
const AUTO_HIDE_MS = 12000;

export function RobotProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<RobotMessage | null>(null);
  const [visible, setVisible] = useState(false);
  const [queueTick, setQueueTick] = useState(0);
  const queueRef = useRef<RobotMessage[]>([]);
  const lastShownRef = useRef(0);
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoHide = useCallback(() => {
    if (autoHideRef.current) {
      clearTimeout(autoHideRef.current);
      autoHideRef.current = null;
    }
  }, []);

  const show = useCallback(
    (m: RobotMessage) => {
      clearAutoHide();
      setMessage(m);
      setVisible(true);
      lastShownRef.current = Date.now();
      autoHideRef.current = setTimeout(() => {
        setVisible(false);
        setMessage(null);
      }, AUTO_HIDE_MS);
    },
    [clearAutoHide]
  );

  // Drain the queue whenever the bubble is hidden.
  useEffect(() => {
    if (visible) return;
    const queued = queueRef.current.shift();
    if (!queued) return;
    const gap = Math.max(0, MESSAGE_GAP_MS - (Date.now() - lastShownRef.current));
    const t = setTimeout(() => show(queued), gap);
    return () => clearTimeout(t);
  }, [visible, show, queueTick]);

  useEffect(() => clearAutoHide, [clearAutoHide]);

  const say = useCallback((text: string, mood: RobotMood = 'idle') => {
    queueRef.current.push({ text, mood });
    setQueueTick((t) => t + 1);
  }, []);

  const next = useCallback(() => {
    clearAutoHide();
    const queued = queueRef.current.shift();
    if (queued) {
      show(queued);
    } else {
      setVisible(false);
      setMessage(null);
      lastShownRef.current = Date.now();
    }
  }, [show, clearAutoHide]);

  const dismiss = useCallback(() => {
    clearAutoHide();
    queueRef.current = [];
    setVisible(false);
    setMessage(null);
    lastShownRef.current = Date.now();
  }, [clearAutoHide]);

  return (
    <RobotContext.Provider value={{ message, visible, say, dismiss, next }}>
      {children}
    </RobotContext.Provider>
  );
}

export function useRobot(): RobotContextValue {
  const ctx = useContext(RobotContext);
  if (!ctx) throw new Error('useRobot must be used within RobotProvider');
  return ctx;
}
