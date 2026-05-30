import { createClient } from "@supabase/supabase-js";

// Expose Supabase client using client-safe environment variables
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://ofwkndpzjlkumowdeaol.supabase.co";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "sb_publishable_D-MOhLsaD69okFRm-FcAXg_vx_unfXt";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
