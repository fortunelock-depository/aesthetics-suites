// src/components/ui/turnstile-widget.tsx
'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

/**
 * Whether Turnstile is configured. Forms use this to decide whether a token
 * is required before submit - when false (no site key, e.g. local dev), the
 * widget renders nothing and submission proceeds unblocked, matching the
 * server which skips verification when TURNSTILE_SECRET_KEY is unset.
 */
export const TURNSTILE_ENABLED = Boolean(SITE_KEY);

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
      size?: 'normal' | 'flexible' | 'compact';
    },
  ) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface TurnstileWidgetProps {
  /** Fires with the solved token, or `""` when it expires/errors/resets. */
  onVerify: (token: string) => void;
  /** Bump this number to force the widget to reset (tokens are single-use). */
  resetSignal?: number;
  className?: string;
}

/**
 * Cloudflare Turnstile challenge for the public forms (khadys-kitchen
 * pattern). Renders nothing when no site key is configured, so dev without
 * keys keeps working. Otherwise it loads the Turnstile script once, renders
 * the widget explicitly, surfaces the token via `onVerify`, and resets on
 * expiry/error or when `resetSignal` changes.
 */
export function TurnstileWidget(props: TurnstileWidgetProps) {
  if (!SITE_KEY) return null;
  return <TurnstileInner {...props} />;
}

/** The widget's fixed rendered size ("normal" has a 300px minimum). */
const WIDGET_MIN_WIDTH = 300;
const WIDGET_HEIGHT = 65;

function TurnstileInner({
  onVerify,
  resetSignal = 0,
  className,
}: TurnstileWidgetProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // On containers narrower than the widget's 300px minimum (fold-size
  // screens) the bar is scaled down to fit instead of overflowing.
  const [scale, setScale] = useState(1);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== 'undefined' && Boolean(window.turnstile),
  );

  // Latest onVerify without re-rendering the widget when the callback
  // identity changes (forms often pass an inline setter).
  const onVerifyRef = useRef(onVerify);
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  // Track the wrapper's real width continuously so late layout or a rotate
  // can't leave the widget overflowing.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.offsetWidth;
      setScale(
        width > 0 && width < WIDGET_MIN_WIDTH ? width / WIDGET_MIN_WIDTH : 1,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const render = useCallback(() => {
    if (
      !window.turnstile ||
      !containerRef.current ||
      widgetId.current !== null
    ) {
      return;
    }
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme: 'auto',
      size: 'normal',
      callback: (token) => onVerifyRef.current(token),
      'expired-callback': () => onVerifyRef.current(''),
      'error-callback': () => onVerifyRef.current(''),
    });
  }, []);

  useEffect(() => {
    if (scriptReady) render();
    return () => {
      if (widgetId.current !== null && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [scriptReady, render]);

  // Reset on demand (after a failed submit) for a fresh single-use token.
  useEffect(() => {
    if (resetSignal > 0 && widgetId.current !== null && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      onVerifyRef.current('');
    }
  }, [resetSignal]);

  return (
    <>
      <Script
        src={SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      {/* overflow-hidden so the 300px iframe can never inflate the column's
          min-content width on screens narrower than the widget. */}
      <div
        ref={wrapperRef}
        className={className}
        style={{ overflow: 'hidden', height: WIDGET_HEIGHT * scale }}
      >
        <div
          ref={containerRef}
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
        />
      </div>
    </>
  );
}
