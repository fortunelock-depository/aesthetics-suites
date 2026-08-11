// src/lib/extract-api-error.ts
//
// Normalizes any thrown/returned error into a predictable shape for toasts
// and inline form errors. Handles plain strings, `Error`, `{ message }`
// objects, and RTK-Query-style errors (`FETCH_ERROR`/`TIMEOUT_ERROR`,
// `{ status, data }` envelopes with field errors from handleApiError).

export interface NormalizedError {
  message: string;
  status?: number | string;
  /** First message per field, e.g. `{ email: "Invalid email format" }`. */
  fieldErrors?: Record<string, string>;
  hasFieldErrors: boolean;
}

const GENERIC = 'Something went wrong. Please try again.';

function statusMessage(status: number): string {
  switch (status) {
    case 400:
      return "That request wasn't quite right. Check the details and try again.";
    case 401:
      return 'Please sign in to continue.';
    case 403:
      return "You don't have access to do that.";
    case 404:
      return "We couldn't find what you were looking for.";
    case 408:
      return 'The request timed out. Try again.';
    case 429:
      return 'Too many requests - give it a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Something went wrong on our side. Please try again shortly.';
    default:
      return GENERIC;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function extractApiError(error: unknown): NormalizedError {
  if (error == null) return { message: GENERIC, hasFieldErrors: false };

  if (typeof error === 'string') {
    return { message: error || GENERIC, hasFieldErrors: false };
  }

  if (
    error instanceof Error &&
    !isRecord((error as unknown as { data?: unknown }).data)
  ) {
    return { message: error.message || GENERIC, hasFieldErrors: false };
  }

  if (isRecord(error)) {
    // RTK aborts (e.g. an unmount cancelled the request) aren't a user-facing
    // failure mode - never surface a bare "Aborted".
    const name = typeof error.name === 'string' ? error.name : undefined;
    const msg = typeof error.message === 'string' ? error.message : undefined;
    if (name === 'AbortError' || name === 'ConditionError' || msg === 'Aborted') {
      return {
        message: 'The request was interrupted. Please try again.',
        hasFieldErrors: false,
      };
    }

    // RTK Query network-level errors.
    const rtkStatus = error.status;
    if (
      rtkStatus === 'FETCH_ERROR' ||
      rtkStatus === 'TIMEOUT_ERROR' ||
      rtkStatus === 'PARSING_ERROR'
    ) {
      return {
        message:
          rtkStatus === 'TIMEOUT_ERROR'
            ? 'The request timed out. Check your connection and try again.'
            : "Couldn't reach the server. Check your connection and try again.",
        status: rtkStatus,
        hasFieldErrors: false,
      };
    }

    // `{ status, data }` envelope from handleApiError:
    // { status: 'error', message, errors?: { field: string[] } }.
    const data = isRecord(error.data) ? error.data : undefined;
    if (data) {
      let fieldErrors: Record<string, string> | undefined;
      if (isRecord(data.errors)) {
        fieldErrors = {};
        for (const [field, messages] of Object.entries(data.errors)) {
          if (typeof messages === 'string') fieldErrors[field] = messages;
          else if (Array.isArray(messages) && typeof messages[0] === 'string') {
            fieldErrors[field] = messages[0];
          }
        }
        if (Object.keys(fieldErrors).length === 0) fieldErrors = undefined;
      }

      const message =
        (typeof data.message === 'string' && data.message) ||
        (typeof rtkStatus === 'number' ? statusMessage(rtkStatus) : GENERIC);
      return {
        message,
        status: typeof rtkStatus === 'number' ? rtkStatus : undefined,
        fieldErrors,
        hasFieldErrors: Boolean(fieldErrors),
      };
    }

    if (typeof rtkStatus === 'number') {
      return {
        message: statusMessage(rtkStatus),
        status: rtkStatus,
        hasFieldErrors: false,
      };
    }

    if (typeof error.message === 'string') {
      return { message: error.message || GENERIC, hasFieldErrors: false };
    }
  }

  return { message: GENERIC, hasFieldErrors: false };
}
