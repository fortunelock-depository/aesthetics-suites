// src/components/admin/profile/profile-tabs.tsx
'use client';

import { Shield, User } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ChangePasswordForm } from '@/components/admin/change-password-form';
import { SecuritySection } from '@/components/admin/security-section';
import {
  ProfileInfoTab,
  type ProfileUser,
} from './profile-info-tab';

/**
 * The profile page shape: Profile Information and Security Settings as
 * side tabs on the one page. `defaultTab` lets /admin/settings-style
 * links land straight on Security.
 */
export function ProfileTabs({
  user,
  twoFactorEnabled,
  defaultTab = 'profile',
}: {
  user: ProfileUser;
  twoFactorEnabled: boolean;
  defaultTab?: 'profile' | 'security';
}) {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="mb-4 grid w-full grid-cols-2 lg:mb-8">
        <TabsTrigger value="profile">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Profile Information</span>
          <span className="sm:hidden">Profile</span>
        </TabsTrigger>
        <TabsTrigger value="security">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Security Settings</span>
          <span className="sm:hidden">Security</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-0">
        <ProfileInfoTab user={user} />
      </TabsContent>

      <TabsContent value="security" className="mt-0">
        <div className="space-y-6">
          <ChangePasswordForm />
          <SecuritySection initialEnabled={twoFactorEnabled} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
