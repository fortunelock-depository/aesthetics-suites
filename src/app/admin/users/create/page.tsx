// src/app/admin/users/create/page.tsx
import { redirect } from 'next/navigation';

/** Creation is a dialog on the users page; keep old links working. */
export default function CreateUserPage() {
  redirect('/admin/users');
}
