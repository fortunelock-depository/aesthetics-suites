// src/components/admin/services/create-service-form.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { BellRing, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateServiceMutation } from '@/redux/services-api';
import { extractApiError } from '@/lib/extract-api-error';
import {
  BLANK_FACILITY,
  ServiceFields,
  serviceFormSchema,
  toServiceBody,
  type ServiceFormInput,
  type ServiceFormOutput,
} from './service-form';

/** Service creation on its own page; photos are added afterwards. */
export function CreateServiceForm() {
  const router = useRouter();
  const [createService, { isLoading }] = useCreateServiceMutation();

  const form = useForm<ServiceFormInput, unknown, ServiceFormOutput>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: BLANK_FACILITY,
  });

  const onSubmit = async (data: ServiceFormOutput) => {
    try {
      const res = await createService(toServiceBody(data)).unwrap();
      toast.success('Service created - now add its photos.');
      router.push(`/admin/services/${res.data.id}`);
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      if (fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          form.setError(field as keyof ServiceFormInput, { message: msg });
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
        <ServiceFields form={form} active busy={isLoading} />
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/services')}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <BellRing />}
            {isLoading ? 'Creating…' : 'Create service'}
          </Button>
        </div>
      </form>
    </div>
  );
}
