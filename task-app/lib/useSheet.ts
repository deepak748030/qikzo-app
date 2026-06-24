import { useState, useCallback } from 'react';

type Variant = 'success' | 'error' | 'warning' | 'info';

export type SheetConfig = {
  variant?: Variant;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
};

// Replaces alert() everywhere — drives the bottom-sheet modal.
export function useSheet() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<SheetConfig>({ title: '' });

  const show = useCallback((c: SheetConfig) => {
    setConfig(c);
    setVisible(true);
  }, []);

  const hide = useCallback(() => setVisible(false), []);

  return { visible, config, show, hide };
}
