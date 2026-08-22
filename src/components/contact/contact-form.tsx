// src/components/contact/contact-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';
import {
  BookText,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  User,
  type LucideIcon,
} from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { contactSchema } from '@/validations/hotel-validation';
import { useSendContactMessageMutation } from '@/redux/contact-api';
import { extractApiError } from '@/lib/extract-api-error';
import {
  TurnstileWidget,
  TURNSTILE_ENABLED,
} from '@/components/ui/turnstile-widget';
import { EYEBROW } from '@/components/site/section-heading';
import { cn } from '@/lib/utils';
import { ctaClasses } from '@/components/site/cta-link';

// The SAME schema the API enforces (validations/hotel-validation.ts), so
// client and server can never disagree; transforms (phone -> E.164) run on
// submit. Input = what the fields hold, Output = what the API receives.
type FormInput = z.input<typeof contactSchema>;
type FormOutput = z.output<typeof contactSchema>;

// A 1px clay border does not read as focus against the cream field, so the
// focused box takes the ink border AND a 2px outline drawn inside its own
// edge - visible on any of the surfaces this form sits on.
const FIELD_BOX =
  'w-full border border-border bg-card py-5 pr-5 pl-[52px] text-base text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground aria-[invalid=true]:border-destructive';

// The same label treatment the booking funnel uses, so a guest meets one
// field style across the site.
const FIELD_LABEL = 'mb-1.5 block text-sm font-medium text-muted-foreground';

// The CtaLink treatment carried on a <button>: submitting posts the form,
// so this action cannot be a link.
const SUBMIT_BUTTON = ctaClasses({ sweep: 'dark' });

function FieldIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <Icon
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-5 h-4.5 w-4.5 -translate-y-1/2 text-brand"
    />
  );
}

function FieldErrorText({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-destructive">
      {message}
    </p>
  );
}

/**
 * The message form (icon-in-field boxes, clay submit), wired end to end:
 * react-hook-form + the shared zod schema for inline client errors (native
 * validation disabled), Turnstile when configured, and server field errors
 * mapped back inline via setError.
 */
export function ContactForm() {
  const [send, { isLoading }] = useSendContactMessageMutation();
  const [turnstileReset, setTurnstileReset] = useState(0);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { website: '', turnstileToken: '' },
  });

  const turnstileToken = watch('turnstileToken');

  const onSubmit = async (data: FormOutput) => {
    if (TURNSTILE_ENABLED && !data.turnstileToken) {
      toast.error('Please complete the verification first.');
      return;
    }
    try {
      const result = await send(data).unwrap();
      toast.success(result.message);
      reset();
      setTurnstileReset((n) => n + 1);
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      // Server-side validation lands inline, same as client errors.
      if (fieldErrors) {
        for (const [field, fieldMessage] of Object.entries(fieldErrors)) {
          setError(field as keyof FormInput, { message: fieldMessage });
        }
      }
      toast.error(message);
      // Tokens are single-use - a failed submit needs a fresh challenge.
      setTurnstileReset((n) => n + 1);
    }
  };

  return (
    <div>
      <p className={EYEBROW}>Message</p>
      <h2 className="mt-4 font-heading text-[32px] leading-[1.15] font-light tracking-[-0.01em] text-foreground lg:text-[45px]">
        Send a message
      </h2>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-8 grid gap-5 sm:grid-cols-2"
      >
        <div>
          <label htmlFor="contact-name" className={FIELD_LABEL}>
            Full name
          </label>
          <div className="relative">
            <FieldIcon icon={User} />
            <input
              id="contact-name"
              type="text"
              autoComplete="name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'contact-name-error' : undefined}
              className={FIELD_BOX}
              {...register('name')}
            />
          </div>
          <FieldErrorText id="contact-name-error" message={errors.name?.message} />
        </div>

        <div>
          <label htmlFor="contact-email" className={FIELD_LABEL}>
            Email address
          </label>
          <div className="relative">
            <FieldIcon icon={Mail} />
            <input
              id="contact-email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'contact-email-error' : undefined}
              className={FIELD_BOX}
              {...register('email')}
            />
          </div>
          <FieldErrorText id="contact-email-error" message={errors.email?.message} />
        </div>

        <div>
          <label htmlFor="contact-phone" className={FIELD_LABEL}>
            Phone (optional)
          </label>
          <div className="relative">
            <FieldIcon icon={Phone} />
            <input
              id="contact-phone"
              type="tel"
              autoComplete="tel"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'contact-phone-error' : undefined}
              className={FIELD_BOX}
              {...register('phone')}
            />
          </div>
          <FieldErrorText id="contact-phone-error" message={errors.phone?.message} />
        </div>

        <div>
          <label htmlFor="contact-subject" className={FIELD_LABEL}>
            Subject (optional)
          </label>
          <div className="relative">
            <FieldIcon icon={BookText} />
            <input
              id="contact-subject"
              type="text"
              autoComplete="off"
              aria-invalid={!!errors.subject}
              aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
              className={FIELD_BOX}
              {...register('subject')}
            />
          </div>
          <FieldErrorText id="contact-subject-error" message={errors.subject?.message} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="contact-message" className={FIELD_LABEL}>
            Message
          </label>
          <div className="relative">
            <MessageSquare
              aria-hidden
              className="pointer-events-none absolute top-6 left-5 h-4.5 w-4.5 text-brand"
            />
            <textarea
              id="contact-message"
              rows={7}
              autoComplete="off"
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? 'contact-message-error' : undefined}
              className={cn(FIELD_BOX, 'resize-y pt-5')}
              {...register('message')}
            />
          </div>
          <FieldErrorText id="contact-message-error" message={errors.message?.message} />
        </div>

        {/* Honeypot - hidden from humans, tempting to bots. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="hidden"
          {...register('website')}
        />

        {TURNSTILE_ENABLED && (
          <div className="sm:col-span-2">
            <TurnstileWidget
              onVerify={(token) =>
                setValue('turnstileToken', token, { shouldValidate: false })
              }
              resetSignal={turnstileReset}
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isLoading || (TURNSTILE_ENABLED && !turnstileToken)}
            className={SUBMIT_BUTTON}
          >
            {isLoading ? (
              <>
                Sending
                <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : (
              <>
                Send
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
