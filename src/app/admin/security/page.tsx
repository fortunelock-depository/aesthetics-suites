// src/app/admin/security/page.tsx
import { redirect } from 'next/navigation';

/** Security moved under Settings - old links must not 404. */
export default function SecurityPage() {
  redirect('/admin/settings');
}
