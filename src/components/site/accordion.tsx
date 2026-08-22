// src/components/site/accordion.tsx
'use client';

import { useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AccordionItem {
  question: string;
  answer: string;
}

/**
 * The FAQ accordion for room details: soft item cards, the first
 * open by default, a circular arrow toggle on the right that flips when
 * open, and a smooth grid-rows slide for the answer.
 */
export function Accordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const open = index === openIndex;
        const panelId = `accordion-panel-${index}`;
        return (
          <div key={item.question} className="bg-muted/50">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIndex(open ? -1 : index)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left lg:px-9"
            >
              <span className="min-w-0 text-[17px] font-medium text-foreground [overflow-wrap:anywhere] lg:text-lg">
                {item.question}
              </span>
              <span
                className={cn(
                  'grid h-9 w-9 flex-none place-items-center rounded-full bg-card shadow-sm transition-transform duration-300',
                  open && 'rotate-180',
                )}
              >
                <ArrowDown className="h-4 w-4 text-foreground" />
              </span>
            </button>
            <div
              id={panelId}
              className={cn(
                'grid transition-[grid-template-rows] duration-400 ease-in-out',
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-6 text-[15px] leading-[26px] text-foreground/80 lg:px-9">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
