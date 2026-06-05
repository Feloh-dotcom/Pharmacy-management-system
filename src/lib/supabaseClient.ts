import { createClient } from "@supabase/supabase-js";

// Expose Supabase client using client-safe environment variables
const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseUrl = rawUrl && rawUrl !== "placeholder_not_configured" ? rawUrl : "https://ofwkndpzjlkumowdeaol.supabase.co";

const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
const supabaseAnonKey = rawKey && rawKey !== "placeholder_not_configured" ? rawKey : "sb_publishable_D-MOhLsaD69okFRm-FcAXg_vx_unfXt";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
