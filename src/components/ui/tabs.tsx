// src/components/ui/tabs.tsx
//
// Tabs primitive on the radix-ui monopackage, carrying the suites' brand
// tokens (gold underline accent).
'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('w-full', className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'relative inline-flex items-center gap-1 border-b border-border p-1',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 px-4 py-2.5',
        'text-sm font-medium whitespace-nowrap transition-all duration-200',
        'disabled:pointer-events-none disabled:opacity-50',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        'data-[state=active]:bg-background data-[state=active]:text-foreground',
        'relative data-[state=active]:after:absolute data-[state=active]:after:right-0',
        'data-[state=active]:after:bottom-0 data-[state=active]:after:left-0',
        'data-[state=active]:after:h-0.5 data-[state=active]:after:bg-brand',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'mt-4 outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
