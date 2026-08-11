// src/app/admin/users/create/page.tsx
import { redirect } from 'next/navigation';

/** Creation moved into a dialog on the users page - old links must not 404. */
export default function CreateUserPage() {
  redirect('/admin/users');
}
