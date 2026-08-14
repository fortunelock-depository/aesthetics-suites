// src/app/api/contact/route.ts
import { headers } from 'next/headers';
import { clientIp } from '@/utils/client-ip';
import { contactSchema } from '@/validations/hotel-validation';
import { sendContactEmails } from '@/lib/mail/contact-email';
import { verifyTurnstile } from '@/lib/turnstile';
import { successResponse, handleApiError } from '@/utils/api-response';
import { ratelimit } from '@/lib/rate-limit';
import {
  BadRequestError,
  TooManyRequestsError,
} from '@/lib/errors';

/**
 * Public contact form. Nothing is stored: the message is emailed to the
 * admins (reply-to = the sender) and the sender gets an acknowledgement.
 */
export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const ip = clientIp(headersList);
    const { success } = await ratelimit.limit(`contact:${ip}`);
    if (!success) throw new TooManyRequestsError();

    const input = contactSchema.parse(await req.json());

    // Honeypot filled: pretend success, send nothing.
    if (!input.website) {
      // Turnstile (when configured) - fails closed on a bad/missing token.
      if (!(await verifyTurnstile(input.turnstileToken, ip))) {
        throw new BadRequestError(
          "We couldn't verify you're human. Refresh and try again.",
        );
      }
      await sendContactEmails({
        name: input.name,
        email: input.email,
        phone: input.phone,
        subject: input.subject,
        message: input.message,
      });
    }

    return successResponse(
      null,
      "Thanks for your message - we'll get back to you shortly.",
    );
  } catch (err) {
    return handleApiError(err);
  }
}
