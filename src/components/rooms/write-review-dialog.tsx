// src/components/rooms/write-review-dialog.tsx
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Loader2, PenLine, Send, Star } from 'lucide-react';
import { ResponsiveFormDialog } from '@/components/ui/responsive-form-dialog';
import { FieldError } from '@/components/forms/field-error';
import { useCreateRoomReviewMutation } from '@/redux/reviews-api';
import { extractApiError } from '@/lib/extract-api-error';
import { CTA_BUTTON, FIELD } from './field-styles';
import { cn } from '@/lib/utils';

/** Matches the checkout's field labels, so one form voice runs the site. */
const LABEL = 'block text-sm font-medium text-muted-foreground';

// Mirrors validations/hotel-validation.ts (reviewCreateSchema).
const reviewFormSchema = z.object({
  guestName: z.string().trim().min(2, 'Enter your name').max(50),
  guestEmail: z.email({ message: 'Invalid email format' }),
  title: z.string().trim().max(150),
  body: z.string().trim().min(10, 'At least 10 characters').max(2000),
  bookingCode: z.string().trim().max(30),
  /** Honeypot - humans never see it. */
  website: z.string().max(0).optional(),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

const BLANK: ReviewFormValues = {
  guestName: '',
  guestEmail: '',
  title: '',
  body: '',
  bookingCode: '',
  website: '',
};

/** Tap-to-rate star input (1..5). */
function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  // Real radiogroup semantics: roving tabindex (only the checked star is a
  // tab stop) with arrow keys moving AND selecting, wrapping both ways -
  // the ARIA radio pattern, not five independent toggle buttons.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = value >= 5 ? 1 : value + 1;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = value <= 1 ? 5 : value - 1;
    }
    if (next !== null) {
      e.preventDefault();
      onChange(next);
      (e.currentTarget.parentElement?.children[next - 1] as
        | HTMLElement
        | undefined)?.focus();
    }
  };
  return (
    <div
      role="radiogroup"
      aria-label="Your rating"
      className="flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((step) => (
        <button
          key={step}
          type="button"
          role="radio"
          aria-checked={value === step}
          aria-label={`${step} star${step === 1 ? '' : 's'}`}
          tabIndex={step === value || (value === 0 && step === 1) ? 0 : -1}
          onClick={() => onChange(step)}
          onKeyDown={handleKeyDown}
          className="p-0.5"
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              step <= value
                ? 'fill-brand text-brand'
                : 'text-border hover:text-brand/60',
            )}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewDialog({
  slug,
  roomName,
  open,
  onOpenChange,
}: {
  slug: string;
  roomName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [createReview, { isLoading }] = useCreateRoomReviewMutation();
  // Mounted fresh per open (parent renders this only while open).
  const [rating, setRating] = React.useState(5);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: BLANK,
  });

  const onSubmit = async (data: ReviewFormValues) => {
    try {
      const res = await createReview({
        slug,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        rating,
        title: data.title || undefined,
        body: data.body,
        bookingCode: data.bookingCode || undefined,
        website: data.website,
      }).unwrap();
      toast.success(
        res.message ?? 'Thanks - your review is awaiting moderation.',
      );
      onOpenChange(false);
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      if (fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          if (field in BLANK) {
            setError(field as keyof ReviewFormValues, { message: msg });
          }
        }
      }
      toast.error(message);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="font-heading text-[26px] leading-[1.2] font-light tracking-[-0.01em] [overflow-wrap:anywhere]">
          Review {roomName}
        </span>
      }
      description="Reviews are moderated before going live. Add your booking code to earn the verified-stay badge."
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <span className={LABEL}>Your rating</span>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="review-name" className={LABEL}>
              Name
            </label>
            <input
              id="review-name"
              placeholder="e.g. Ama M."
              aria-invalid={!!errors.guestName}
              className={FIELD}
              {...register('guestName')}
            />
            <FieldError message={errors.guestName?.message} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="review-email" className={LABEL}>
              Email
            </label>
            <input
              id="review-email"
              type="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.guestEmail}
              className={FIELD}
              {...register('guestEmail')}
            />
            <p className="text-xs text-muted-foreground">
              Never shown publicly.
            </p>
            <FieldError message={errors.guestEmail?.message} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="review-title" className={LABEL}>
            Title (optional)
          </label>
          <input
            id="review-title"
            placeholder="e.g. Quiet and spotless"
            aria-invalid={!!errors.title}
            className={FIELD}
            {...register('title')}
          />
          <FieldError message={errors.title?.message} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="review-body" className={LABEL}>
            Your review
          </label>
          <textarea
            id="review-body"
            rows={4}
            placeholder="How was your stay?"
            aria-invalid={!!errors.body}
            className={FIELD}
            {...register('body')}
          />
          <FieldError message={errors.body?.message} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="review-booking-code" className={LABEL}>
            Booking code (optional)
          </label>
          <input
            id="review-booking-code"
            placeholder="e.g. ASB-20260810-4F2A"
            aria-invalid={!!errors.bookingCode}
            className={cn(FIELD, 'max-w-64')}
            {...register('bookingCode')}
          />
          <p className="text-xs text-muted-foreground">
            From your confirmation email - marks your review as a verified
            stay.
          </p>
          <FieldError message={errors.bookingCode?.message} />
        </div>

        {/* Honeypot - hidden from humans, tempting to bots. */}
        <div aria-hidden className="absolute -left-[9999px]" tabIndex={-1}>
          <label htmlFor="review-website">Website</label>
          <input
            id="review-website"
            tabIndex={-1}
            autoComplete="off"
            {...register('website')}
          />
        </div>

        {/* Side by side even on phones; stacks only when they can't fit. */}
        <div className="flex flex-col-reverse gap-3 pt-1 min-[360px]:flex-row min-[360px]:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className={cn(
              CTA_BUTTON,
              'border border-border px-6 text-muted-foreground transition-colors hover:border-brand hover:text-brand-text disabled:pointer-events-none disabled:opacity-60',
            )}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              CTA_BUTTON,
              'btn-sweep-dark bg-brand px-6 text-brand-foreground disabled:pointer-events-none',
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isLoading ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </ResponsiveFormDialog>
  );
}

/** The "Write a review" trigger under the reviews section. */
export function WriteReviewButton({
  slug,
  roomName,
}: {
  slug: string;
  roomName: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          CTA_BUTTON,
          'btn-sweep-gold border border-brand bg-transparent text-brand-text',
        )}
      >
        <PenLine className="h-4 w-4" />
        Write a review
      </button>
      {open && (
        <ReviewDialog
          slug={slug}
          roomName={roomName}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
