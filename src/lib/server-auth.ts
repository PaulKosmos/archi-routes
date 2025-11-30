// Utility function for server-side auth in API routes
import { createServerClient } from '@/lib/supabase-server';
import { headers } from 'next/headers';

export async function getServerAuth() {
  try {
    const headerStore = await headers();

    console.log('🔍 Auth Debug Info:');
    console.log('Auth header:', headerStore.get('authorization'));

    // Get supabase server client
    const supabase = await createServerClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    console.log('Auth result:', {
      user: user?.email || 'No user',
      error: error?.message || 'No error'
    });

    return { user, error, supabase };

  } catch (err) {
    console.error('Auth utility error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { user: null, error: { message: errorMessage }, supabase: null };
  }
}

export async function requireAuth() {
  const { user, error, supabase } = await getServerAuth();

  if (error || !user || !supabase) {
    throw new Error(`Authentication required: ${error?.message || 'No user'}`);
  }

  return { user, supabase };
}
