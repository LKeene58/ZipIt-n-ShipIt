'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabase-browser';

type SignOutButtonProps = {
  className?: string;
  label?: string;
  busyLabel?: string;
};

export default function SignOutButton({
  className,
  label = 'Sign Out',
  busyLabel = 'Signing Out...',
}: SignOutButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <button type="button" onClick={handleSignOut} disabled={busy} className={className}>
      {busy ? busyLabel : label}
    </button>
  );
}
