// src/components/admin/facilities/create-facility-form.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Landmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateFacilityMutation } from '@/redux/facilities-api';
import { extractApiError } from '@/lib/extract-api-error';
import {
  BLANK_FACILITY,
  FacilityFields,
  facilityFormSchema,
  toFacilityBody,
  type FacilityFormInput,
  type FacilityFormOutput,
} from './facility-form';

/** Facility creation on its own page; photos are added afterwards. */
export function CreateFacilityForm() {
  const router = useRouter();
  const [createFacility, { isLoading }] = useCreateFacilityMutation();

  const form = useForm<FacilityFormInput, unknown, FacilityFormOutput>({
    resolver: zodResolver(facilityFormSchema),
    defaultValues: BLANK_FACILITY,
  });

  const onSubmit = async (data: FacilityFormOutput) => {
    try {
      const res = await createFacility(toFacilityBody(data)).unwrap();
      toast.success('Facility created - now add its photos.');
      router.push(`/admin/facilities/${res.data.id}`);
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      if (fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          form.setError(field as keyof FacilityFormInput, { message: msg });
        }
      }
      toast.error(message);
    }
  };

  return (
    <div className="@container border border-border bg-card p-4 sm:p-6">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        <FacilityFields form={form} active busy={isLoading} />
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/facilities')}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Landmark />}
            {isLoading ? 'Creating…' : 'Create facility'}
          </Button>
        </div>
      </form>
    </div>
  );
}
