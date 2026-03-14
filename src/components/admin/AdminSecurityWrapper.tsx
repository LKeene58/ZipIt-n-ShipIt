import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerUserEmail, isAdminEmail } from '../../../manager/admin-auth';

type AdminSecurityWrapperProps = {
  children: ReactNode;
  redirectTo?: string;
};

export default async function AdminSecurityWrapper({
  children,
  redirectTo = '/account',
}: AdminSecurityWrapperProps) {
  const email = await getServerUserEmail();
  if (!isAdminEmail(email)) {
    redirect(redirectTo);
  }

  return <>{children}</>;
}
