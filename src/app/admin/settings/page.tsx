// src/app/admin/settings/page.tsx
import { redirect } from 'next/navigation';

/** Security lives as a tab on the profile page; keep old links working. */
export default function SettingsPage() {
  redirect('/admin/profile?tab=security');
}
