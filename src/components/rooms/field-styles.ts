// src/components/rooms/field-styles.ts

/**
 * The public booking funnel's input skin, shared by the checkout, the
 * sidebar availability form, the manage-booking lookup and the review
 * dialog so a guest meets one field treatment across the whole flow.
 */
export const FIELD =
  'w-full min-w-0 border border-border bg-card px-4 py-3.5 text-base text-foreground transition-colors placeholder:text-muted-foreground focus:border-brand ' +
  // A tinted border alone is not a focus indicator: it is a colour change of
  // an existing boundary, and clay on cream barely registers. Keyboard focus
  // gets a real ring; pointer focus keeps the quiet border tint.
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ' +
  'aria-[invalid=true]:border-destructive data-[invalid=true]:border-destructive';

/**
 * The submit/press treatment that matches CtaLink for real buttons, which
 * a Link-based CtaLink cannot cover (form submits, dialog triggers).
 */
export const CTA_BUTTON =
  'btn-sweep inline-flex items-center justify-center gap-2.5 px-[38px] py-[15px] text-[13px] font-medium tracking-[0.14em] uppercase transition-[color,opacity] duration-200 active:opacity-90';
