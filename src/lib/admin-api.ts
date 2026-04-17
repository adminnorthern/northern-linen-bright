// Helper to call admin server functions with the current Supabase access token
// in the request body, since createServerFn doesn't auto-attach auth headers.
import { supabase } from "@/integrations/supabase/client";

export async function withToken<T extends object>(data: T): Promise<T & { access_token: string }> {
  const { data: s } = await supabase.auth.getSession();
  const token = s.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return { ...data, access_token: token };
}
