// src/components/ui/responsive-form-dialog.tsx
//
// The dms form-dialog shell: a centred modal on tablet and up, a
// full-screen slide-over on phones where the extra space matters. The
// same children render in both, so a form describes its header, body and
// footer once.
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsBelowLg, useIsBelowMd } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/utils';

interface ResponsiveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Extra classes for the desktop dialog surface (e.g. `sm:max-w-3xl`). */
  className?: string;
  /** Stay a centred dialog at every breakpoint (very short forms). */
  forceDialog?: boolean;
  /**
   * Breakpoint below which the form expands into a full-screen sheet.
   * Defaults to `md`; pass `lg` for tall forms that fill a tablet too.
   */
  sheetBelow?: 'md' | 'lg';
}

export function ResponsiveFormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  forceDialog = false,
  sheetBelow = 'md',
}: ResponsiveFormDialogProps) {
  const isBelowMd = useIsBelowMd();
  const isBelowLg = useIsBelowLg();
  const isBelow = sheetBelow === 'lg' ? isBelowLg : isBelowMd;

  if (isBelow && !forceDialog) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          // Fill the whole viewport so the form reads like a page.
          className="gap-0 overflow-y-auto p-4 data-[side=right]:w-full sm:p-6 data-[side=right]:sm:max-w-none"
        >
          <SheetHeader className="p-0 pb-4">
            <SheetTitle className="text-xl sm:text-2xl">{title}</SheetTitle>
            {description ? (
              <SheetDescription>{description}</SheetDescription>
            ) : null}
          </SheetHeader>
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('max-h-[90vh] overflow-y-auto sm:max-w-2xl', className)}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
