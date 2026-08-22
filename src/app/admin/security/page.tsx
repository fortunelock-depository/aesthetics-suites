// src/app/admin/security/page.tsx
import { redirect } from 'next/navigation';

/** Security lives under Settings; keep old links working. */
export default function SecurityPage() {
  redirect('/admin/settings');
}
