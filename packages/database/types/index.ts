/**
 * HE-SYSTEM Database Types
 * AUTO-GENERATED — do not edit manually.
 * Regenerate with: npm run db:types
 *
 * Run: npx supabase gen types typescript --linked > packages/database/types/index.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Placeholder — replace with generated types after running:
// npx supabase gen types typescript --linked
export interface Database {
  public: {
    Tables: {
      users: { Row: { id: string; institution_id: string; role: string; full_name: string; email: string; created_at: string; updated_at: string }; Insert: { id: string; institution_id: string; role: string; full_name: string; email: string }; Update: Partial<Database['public']['Tables']['users']['Insert']> }
      students: { Row: { id: string; user_id: string; institution_id: string; student_number: string; created_at: string }; Insert: { user_id: string; institution_id: string; student_number: string }; Update: Partial<Database['public']['Tables']['students']['Insert']> }
      partners: { Row: { id: string; user_id: string; institution_id: string; referral_code: string; tier: string; total_recruited: number; total_earned: number; created_at: string }; Insert: { user_id: string; institution_id: string; referral_code: string }; Update: Partial<Database['public']['Tables']['partners']['Insert']> }
    }
    Views: {}
    Functions: {}
    Enums: {
      user_role: 'student' | 'teacher' | 'admin' | 'management' | 'partner' | 'parent'
      partner_tier: 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum'
      class_type: 'campus' | 'remote' | 'home'
    }
  }
}
