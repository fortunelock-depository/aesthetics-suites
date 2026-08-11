// src/app/admin/settings/page.tsx
import { redirect } from 'next/navigation';

/** Security now lives as a tab on the profile page (dms pattern). */
export default function SettingsPage() {
  redirect('/admin/profile?tab=security');
}
