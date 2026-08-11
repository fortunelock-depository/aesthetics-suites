// src/hooks/use-confirm.tsx
'use client';

import { useCallback, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  /** Confirm stays disabled until this exact text is typed. */
  requireExactMatch?: string;
}

/**
 * Promise-based confirmation: `const ok = await confirm({...})` instead of
 * per-page open/pending dialog state. Render `confirmDialog` once anywhere
 * in the page.
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   const onDelete = async () => {
 *     if (!(await confirm({ title: 'Delete user?', description: '…',
 *       isDestructive: true }))) return;
 *     … perform the deletion …
 *   };
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirmDialog = options ? (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
      title={options.title}
      description={options.description}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      isDestructive={options.isDestructive}
      requireExactMatch={options.requireExactMatch}
      onConfirm={() => settle(true)}
    />
  ) : null;

  return { confirm, confirmDialog };
}
