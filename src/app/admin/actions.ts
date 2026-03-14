"use server";

import { revalidatePath } from 'next/cache';

// 🟢 APPROVE: Changes status from 'draft' to 'active'
export async function approveProduct(productId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) return { error: 'Missing Supabase keys' };

  try {
    await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${productId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      // Note: Change 'active' to 'published' if that's what your storefront uses!
      body: JSON.stringify({ status: 'active' }), 
    });

    revalidatePath('/admin'); // Instantly refreshes the admin page
    return { success: true };
  } catch (error) {
    return { error: 'Failed to approve product' };
  }
}

// 🔴 REJECT: Deletes the drafted product from the database
export async function rejectProduct(productId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) return { error: 'Missing Supabase keys' };

  try {
    await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${productId}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    revalidatePath('/admin'); // Instantly refreshes the admin page
    return { success: true };
  } catch (error) {
    return { error: 'Failed to reject product' };
  }
}