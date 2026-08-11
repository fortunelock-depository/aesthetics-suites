// src/components/ui/confirm-dialog.tsx
'use client';

import { useState } from 'react';
import { AlertDialog } from 'radix-ui';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buttonVariants } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  /** When set, the confirm button stays disabled until this text is typed. */
  requireExactMatch?: string;
  loading?: boolean;
}

/**
 * Reusable confirmation dialog (Radix AlertDialog) with an optional
 * type-to-confirm guard for destructive actions. Controlled via `open`.
 * The title/description carry overflow-wrap hardening because they often
 * interpolate user-authored names.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  requireExactMatch,
  loading = false,
}: ConfirmDialogProps) {
  const [value, setValue] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (!next) setValue('');
    onOpenChange(next);
  };

  const matchFailed = requireExactMatch
    ? value.trim() !== requireExactMatch
    : false;

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <AlertDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
            'max-h-[calc(100dvh-2rem)] overflow-y-auto',
            'rounded-2xl border border-border bg-card p-6 shadow-xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )}
        >
          <AlertDialog.Title className="min-w-0 max-w-full text-lg font-semibold text-foreground [overflow-wrap:anywhere]">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 min-w-0 max-w-full text-sm text-muted-foreground leading-relaxed [overflow-wrap:anywhere]">
            {description}
          </AlertDialog.Description>

          {requireExactMatch && (
            <div className="mt-4 space-y-2">
              <Label htmlFor="confirm-input" className="leading-relaxed">
                Type{' '}
                <span className="font-mono font-semibold text-foreground">
                  {requireExactMatch}
                </span>{' '}
                to confirm
              </Label>
              <Input
                id="confirm-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={requireExactMatch}
                className="font-mono"
                autoComplete="off"
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel
              className={cn(buttonVariants({ variant: 'outline' }))}
              disabled={loading}
            >
              {cancelText}
            </AlertDialog.Cancel>
            <button
              type="button"
              disabled={matchFailed || loading}
              onClick={() => onConfirm()}
              className={cn(
                buttonVariants({
                  variant: isDestructive ? 'destructive' : 'default',
                }),
                'gap-2',
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
