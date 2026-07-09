/**
 * HE-SYSTEM Database Types
 * AUTO-GENERATED from the live Supabase project "HP System" (mluhfmflrdleyqrasuvk)
 * via generate_typescript_types on 2026-07-09. This replaces a hand-written
 * stand-in that existed before a live database was provisioned.
 *
 * Regenerate after schema changes with:
 *   npx supabase gen types typescript --project-id mluhfmflrdleyqrasuvk > packages/database/types/index.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string
          body_vi: string | null
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          institution_id: string
          is_published: boolean | null
          published_at: string | null
          target_roles: Database["public"]["Enums"]["user_role"][] | null
          title: string
          title_vi: string | null
          updated_at: string | null
        }
        Insert: {
          body: string
          body_vi?: string | null
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          institution_id: string
          is_published?: boolean | null
          published_at?: string | null
          target_roles?: Database["public"]["Enums"]["user_role"][] | null
          title: string
          title_vi?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          body_vi?: string | null
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          institution_id?: string
          is_published?: boolean | null
          published_at?: string | null
          target_roles?: Database["public"]["Enums"]["user_role"][] | null
          title?: string
          title_vi?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in_method: string | null
          class_id: string
          created_at: string | null
          device_id: string | null
          distance_meters: number | null
          id: string
          institution_id: string
          latitude: number | null
          liveness_verified: boolean | null
          longitude: number | null
          marked_at: string | null
          marked_by: string | null
          note: string | null
          offline_captured_at: string | null
          offline_queue_id: string | null
          otp_used: boolean | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          check_in_method?: string | null
          class_id: string
          created_at?: string | null
          device_id?: string | null
          distance_meters?: number | null
          id?: string
          institution_id: string
          latitude?: number | null
          liveness_verified?: boolean | null
          longitude?: number | null
          marked_at?: string | null
          marked_by?: string | null
          note?: string | null
          offline_captured_at?: string | null
          offline_queue_id?: string | null
          otp_used?: boolean | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          check_in_method?: string | null
          class_id?: string
          created_at?: string | null
          device_id?: string | null
          distance_meters?: number | null
          id?: string
          institution_id?: string
          latitude?: number | null
          liveness_verified?: boolean | null
          longitude?: number | null
          marked_at?: string | null
          marked_by?: string | null
          note?: string | null
          offline_captured_at?: string | null
          offline_queue_id?: string | null
          otp_used?: boolean | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          hash: string
          id: string
          institution_id: string | null
          ip_address: string | null
          metadata: Json | null
          prev_hash: string
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          hash: string
          id?: string
          institution_id?: string | null
          ip_address?: string | null
          metadata?: Json | null
          prev_hash: string
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          hash?: string
          id?: string
          institution_id?: string | null
          ip_address?: string | null
          metadata?: Json | null
          prev_hash?: string
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          allocated: number
          created_at: string | null
          created_by: string | null
          department_id: string
          id: string
          institution_id: string
          period_quarter: number | null
          period_year: number
          spent: number | null
          updated_at: string | null
        }
        Insert: {
          allocated: number
          created_at?: string | null
          created_by?: string | null
          department_id: string
          id?: string
          institution_id: string
          period_quarter?: number | null
          period_year: number
          spent?: number | null
          updated_at?: string | null
        }
        Update: {
          allocated?: number
          created_at?: string | null
          created_by?: string | null
          department_id?: string
          id?: string
          institution_id?: string
          period_quarter?: number | null
          period_year?: number
          spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          class_id: string
          enrolled_at: string | null
          id: string
          is_active: boolean | null
          student_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string | null
          id?: string
          is_active?: boolean | null
          student_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string | null
          id?: string
          is_active?: boolean | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          cancel_reason: string | null
          checkin_method: string | null
          class_type: Database["public"]["Enums"]["class_type"]
          created_at: string | null
          ends_at: string
          geofence_radius_m: number | null
          id: string
          institution_id: string
          is_cancelled: boolean | null
          join_url: string | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          meeting_id: string | null
          meeting_password: string | null
          otp_code: string | null
          otp_expires_at: string | null
          room_number: string | null
          starts_at: string
          subject_id: string
          teacher_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_reason?: string | null
          checkin_method?: string | null
          class_type?: Database["public"]["Enums"]["class_type"]
          created_at?: string | null
          ends_at: string
          geofence_radius_m?: number | null
          id?: string
          institution_id: string
          is_cancelled?: boolean | null
          join_url?: string | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          meeting_id?: string | null
          meeting_password?: string | null
          otp_code?: string | null
          otp_expires_at?: string | null
          room_number?: string | null
          starts_at: string
          subject_id: string
          teacher_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_reason?: string | null
          checkin_method?: string | null
          class_type?: Database["public"]["Enums"]["class_type"]
          created_at?: string | null
          ends_at?: string
          geofence_radius_m?: number | null
          id?: string
          institution_id?: string
          is_cancelled?: boolean | null
          join_url?: string | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          meeting_id?: string | null
          meeting_password?: string | null
          otp_code?: string | null
          otp_expires_at?: string | null
          room_number?: string | null
          starts_at?: string
          subject_id?: string
          teacher_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_merkle_roots: {
        Row: {
          created_at: string | null
          date: string
          id: string
          institution_id: string
          leaf_hashes: Json
          record_count: number
          root_hash: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          institution_id: string
          leaf_hashes: Json
          record_count: number
          root_hash: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          institution_id?: string
          leaf_hashes?: Json
          record_count?: number
          root_hash?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_merkle_roots_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          budget_allocated: number | null
          code: string
          created_at: string | null
          head_user_id: string | null
          id: string
          institution_id: string
          is_active: boolean | null
          name: string
          name_vi: string | null
          updated_at: string | null
        }
        Insert: {
          budget_allocated?: number | null
          code: string
          created_at?: string | null
          head_user_id?: string | null
          id?: string
          institution_id: string
          is_active?: boolean | null
          name: string
          name_vi?: string | null
          updated_at?: string | null
        }
        Update: {
          budget_allocated?: number | null
          code?: string
          created_at?: string | null
          head_user_id?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean | null
          name?: string
          name_vi?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_head_user_id_fkey"
            columns: ["head_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          institution_id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          institution_id: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_wallets_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          assessment_name: string
          assessment_type: string | null
          created_at: string | null
          exam_date: string | null
          grade: string | null
          id: string
          institution_id: string
          is_published: boolean | null
          max_score: number | null
          remarks: string | null
          score: number | null
          student_id: string
          subject_id: string
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          assessment_name: string
          assessment_type?: string | null
          created_at?: string | null
          exam_date?: string | null
          grade?: string | null
          id?: string
          institution_id: string
          is_published?: boolean | null
          max_score?: number | null
          remarks?: string | null
          score?: number | null
          student_id: string
          subject_id: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assessment_name?: string
          assessment_type?: string | null
          created_at?: string | null
          exam_date?: string | null
          grade?: string | null
          id?: string
          institution_id?: string
          is_published?: boolean | null
          max_score?: number | null
          remarks?: string | null
          score?: number | null
          student_id?: string
          subject_id?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          budget_id: string | null
          category: string | null
          created_at: string | null
          currency: string | null
          department_id: string | null
          description: string
          expense_date: string | null
          id: string
          institution_id: string
          receipt_url: string | null
          status: Database["public"]["Enums"]["expense_status"] | null
          submitted_by: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          budget_id?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          department_id?: string | null
          description: string
          expense_date?: string | null
          id?: string
          institution_id: string
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["expense_status"] | null
          submitted_by: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          budget_id?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          department_id?: string | null
          description?: string
          expense_date?: string | null
          id?: string
          institution_id?: string
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["expense_status"] | null
          submitted_by?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_invoices: {
        Row: {
          amount: number
          amount_paid: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          due_date: string | null
          id: string
          institution_id: string
          invoice_number: string
          issued_date: string | null
          paid_date: string | null
          programme_id: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          institution_id: string
          invoice_number: string
          issued_date?: string | null
          paid_date?: string | null
          programme_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          institution_id?: string
          invoice_number?: string
          issued_date?: string | null
          paid_date?: string | null
          programme_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoices_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoices_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount: number
          created_at: string | null
          gateway: Database["public"]["Enums"]["gateway_name"] | null
          gateway_transaction_id: string | null
          id: string
          institution_id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string | null
          receipt_url: string | null
          reference_number: string | null
          stripe_payment_intent_id: string | null
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          gateway?: Database["public"]["Enums"]["gateway_name"] | null
          gateway_transaction_id?: string | null
          id?: string
          institution_id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          stripe_payment_intent_id?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          gateway?: Database["public"]["Enums"]["gateway_name"] | null
          gateway_transaction_id?: string | null
          id?: string
          institution_id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          stripe_payment_intent_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_gateway_transaction_id_fkey"
            columns: ["gateway_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_gateway_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fee_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          accent_color: string | null
          address: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          name_vi: string | null
          phone: string | null
          primary_color: string | null
          slug: string
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          name_vi?: string | null
          phone?: string | null
          primary_color?: string | null
          slug: string
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          name_vi?: string | null
          phone?: string | null
          primary_color?: string | null
          slug?: string
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      kpi_records: {
        Row: {
          attendance_rate: number | null
          calculated_at: string | null
          classes_conducted: number | null
          created_at: string | null
          grade: string | null
          id: string
          institution_id: string
          notes: string | null
          pass_rate: number | null
          period_month: number
          period_year: number
          pillar1_score: number | null
          pillar2_score: number | null
          pillar3_score: number | null
          pillar4_score: number | null
          tasks_completed: number | null
          tasks_total: number | null
          teaching_hours: number | null
          total_score: number | null
          training_hours: number | null
          user_id: string
        }
        Insert: {
          attendance_rate?: number | null
          calculated_at?: string | null
          classes_conducted?: number | null
          created_at?: string | null
          grade?: string | null
          id?: string
          institution_id: string
          notes?: string | null
          pass_rate?: number | null
          period_month: number
          period_year: number
          pillar1_score?: number | null
          pillar2_score?: number | null
          pillar3_score?: number | null
          pillar4_score?: number | null
          tasks_completed?: number | null
          tasks_total?: number | null
          teaching_hours?: number | null
          total_score?: number | null
          training_hours?: number | null
          user_id: string
        }
        Update: {
          attendance_rate?: number | null
          calculated_at?: string | null
          classes_conducted?: number | null
          created_at?: string | null
          grade?: string | null
          id?: string
          institution_id?: string
          notes?: string | null
          pass_rate?: number | null
          period_month?: number
          period_year?: number
          pillar1_score?: number | null
          pillar2_score?: number | null
          pillar3_score?: number | null
          pillar4_score?: number | null
          tasks_completed?: number | null
          tasks_total?: number | null
          teaching_hours?: number | null
          total_score?: number | null
          training_hours?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_records_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_targets: {
        Row: {
          created_at: string | null
          effective_from: string | null
          id: string
          institution_id: string
          metric: string
          period: Database["public"]["Enums"]["kpi_period"] | null
          pillar: string
          pillar_weight: number | null
          role: Database["public"]["Enums"]["user_role"]
          target_value: number | null
          weight_in_pillar: number | null
        }
        Insert: {
          created_at?: string | null
          effective_from?: string | null
          id?: string
          institution_id: string
          metric: string
          period?: Database["public"]["Enums"]["kpi_period"] | null
          pillar: string
          pillar_weight?: number | null
          role: Database["public"]["Enums"]["user_role"]
          target_value?: number | null
          weight_in_pillar?: number | null
        }
        Update: {
          created_at?: string | null
          effective_from?: string | null
          id?: string
          institution_id?: string
          metric?: string
          period?: Database["public"]["Enums"]["kpi_period"] | null
          pillar?: string
          pillar_weight?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          target_value?: number | null
          weight_in_pillar?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_targets_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          institution_id: string
          is_read: boolean | null
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          institution_id: string
          is_read?: boolean | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          institution_id?: string
          is_read?: boolean | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          channel: Database["public"]["Enums"]["notification_channel"] | null
          created_at: string | null
          id: string
          institution_id: string
          is_read: boolean | null
          reference_id: string | null
          reference_type: string | null
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          channel?: Database["public"]["Enums"]["notification_channel"] | null
          created_at?: string | null
          id?: string
          institution_id: string
          is_read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"] | null
          created_at?: string | null
          id?: string
          institution_id?: string
          is_read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string
          is_primary: boolean | null
          parent_user_id: string
          relationship: string | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id: string
          is_primary?: boolean | null
          parent_user_id: string
          relationship?: string | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string
          is_primary?: boolean | null
          parent_user_id?: string
          relationship?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_links_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_parent_user_id_fkey"
            columns: ["parent_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_commissions: {
        Row: {
          amount_earned: number
          approved_at: string | null
          approved_by: string | null
          calculated_at: string | null
          commission_pct: number
          created_at: string | null
          id: string
          institution_id: string
          partner_id: string
          recruit_id: string
          status: Database["public"]["Enums"]["commission_status"] | null
          students_at_time: number
          tier_at_time: Database["public"]["Enums"]["partner_tier"]
          tuition_fee: number
        }
        Insert: {
          amount_earned: number
          approved_at?: string | null
          approved_by?: string | null
          calculated_at?: string | null
          commission_pct: number
          created_at?: string | null
          id?: string
          institution_id: string
          partner_id: string
          recruit_id: string
          status?: Database["public"]["Enums"]["commission_status"] | null
          students_at_time: number
          tier_at_time: Database["public"]["Enums"]["partner_tier"]
          tuition_fee: number
        }
        Update: {
          amount_earned?: number
          approved_at?: string | null
          approved_by?: string | null
          calculated_at?: string | null
          commission_pct?: number
          created_at?: string | null
          id?: string
          institution_id?: string
          partner_id?: string
          recruit_id?: string
          status?: Database["public"]["Enums"]["commission_status"] | null
          students_at_time?: number
          tier_at_time?: Database["public"]["Enums"]["partner_tier"]
          tuition_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_recruit_id_fkey"
            columns: ["recruit_id"]
            isOneToOne: false
            referencedRelation: "partner_recruits"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payouts: {
        Row: {
          amount: number
          bank_reference: string | null
          created_at: string | null
          currency: string | null
          id: string
          institution_id: string
          notes: string | null
          partner_id: string
          processed_at: string | null
          processed_by: string | null
          receipt_url: string | null
          requested_at: string | null
          status: Database["public"]["Enums"]["payout_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_reference?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          institution_id: string
          notes?: string | null
          partner_id: string
          processed_at?: string | null
          processed_by?: string | null
          receipt_url?: string | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_reference?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          institution_id?: string
          notes?: string | null
          partner_id?: string
          processed_at?: string | null
          processed_by?: string | null
          receipt_url?: string | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payouts_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_recruits: {
        Row: {
          created_at: string | null
          enrolled_at: string | null
          id: string
          institution_id: string
          partner_id: string
          programme_id: string | null
          referral_code: string | null
          status: Database["public"]["Enums"]["recruit_status"] | null
          student_email: string | null
          student_id: string | null
          student_name: string | null
          tuition_fee: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          institution_id: string
          partner_id: string
          programme_id?: string | null
          referral_code?: string | null
          status?: Database["public"]["Enums"]["recruit_status"] | null
          student_email?: string | null
          student_id?: string | null
          student_name?: string | null
          tuition_fee?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          institution_id?: string
          partner_id?: string
          programme_id?: string | null
          referral_code?: string | null
          status?: Database["public"]["Enums"]["recruit_status"] | null
          student_email?: string | null
          student_id?: string | null
          student_name?: string | null
          tuition_fee?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_recruits_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_recruits_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_recruits_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_recruits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          bank_account: string | null
          bank_holder: string | null
          bank_name: string | null
          company_name: string | null
          created_at: string | null
          id: string
          institution_id: string
          is_active: boolean | null
          joined_at: string | null
          referral_code: string
          tier: Database["public"]["Enums"]["partner_tier"] | null
          total_earned: number | null
          total_recruited: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bank_account?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          institution_id: string
          is_active?: boolean | null
          joined_at?: string | null
          referral_code: string
          tier?: Database["public"]["Enums"]["partner_tier"] | null
          total_earned?: number | null
          total_recruited?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bank_account?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean | null
          joined_at?: string | null
          referral_code?: string
          tier?: Database["public"]["Enums"]["partner_tier"] | null
          total_earned?: number | null
          total_recruited?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_transactions: {
        Row: {
          amount: number
          anomaly_flag: boolean | null
          anomaly_reason: string | null
          completed_at: string | null
          created_at: string | null
          currency: string
          gateway: Database["public"]["Enums"]["gateway_name"]
          gateway_order_id: string
          gateway_txn_id: string | null
          hmac_verified: boolean | null
          id: string
          idempotency_key: string
          institution_id: string
          invoice_id: string
          next_retry_at: string | null
          retry_count: number | null
          status: Database["public"]["Enums"]["gateway_txn_status"]
          updated_at: string | null
          user_id: string
          webhook_received_at: string | null
        }
        Insert: {
          amount: number
          anomaly_flag?: boolean | null
          anomaly_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          gateway: Database["public"]["Enums"]["gateway_name"]
          gateway_order_id: string
          gateway_txn_id?: string | null
          hmac_verified?: boolean | null
          id?: string
          idempotency_key: string
          institution_id: string
          invoice_id: string
          next_retry_at?: string | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["gateway_txn_status"]
          updated_at?: string | null
          user_id: string
          webhook_received_at?: string | null
        }
        Update: {
          amount?: number
          anomaly_flag?: boolean | null
          anomaly_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          gateway?: Database["public"]["Enums"]["gateway_name"]
          gateway_order_id?: string
          gateway_txn_id?: string | null
          hmac_verified?: boolean | null
          id?: string
          idempotency_key?: string
          institution_id?: string
          invoice_id?: string
          next_retry_at?: string | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["gateway_txn_status"]
          updated_at?: string | null
          user_id?: string
          webhook_received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateway_transactions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_gateway_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fee_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_gateway_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_spend_history: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_spend_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhooks: {
        Row: {
          gateway: Database["public"]["Enums"]["gateway_name"]
          headers: Json | null
          hmac_valid: boolean
          id: string
          raw_body: string
          received_at: string | null
        }
        Insert: {
          gateway: Database["public"]["Enums"]["gateway_name"]
          headers?: Json | null
          hmac_valid?: boolean
          id?: string
          raw_body: string
          received_at?: string | null
        }
        Update: {
          gateway?: Database["public"]["Enums"]["gateway_name"]
          headers?: Json | null
          hmac_valid?: boolean
          id?: string
          raw_body?: string
          received_at?: string | null
        }
        Relationships: []
      }
      payroll_records: {
        Row: {
          allowances: number | null
          base_salary: number
          created_at: string | null
          deductions: number | null
          id: string
          institution_id: string
          kpi_bonus: number | null
          net_pay: number
          paid_at: string | null
          period_month: number
          period_year: number
          slip_url: string | null
          user_id: string
        }
        Insert: {
          allowances?: number | null
          base_salary: number
          created_at?: string | null
          deductions?: number | null
          id?: string
          institution_id: string
          kpi_bonus?: number | null
          net_pay: number
          paid_at?: string | null
          period_month: number
          period_year: number
          slip_url?: string | null
          user_id: string
        }
        Update: {
          allowances?: number | null
          base_salary?: number
          created_at?: string | null
          deductions?: number | null
          id?: string
          institution_id?: string
          kpi_bonus?: number | null
          net_pay?: number
          paid_at?: string | null
          period_month?: number
          period_year?: number
          slip_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      programmes: {
        Row: {
          code: string
          created_at: string | null
          department_id: string | null
          description: string | null
          duration_months: number | null
          fee_amount: number | null
          id: string
          institution_id: string
          is_active: boolean | null
          name: string
          name_vi: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          duration_months?: number | null
          fee_amount?: number | null
          id?: string
          institution_id: string
          is_active?: boolean | null
          name: string
          name_vi?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          duration_months?: number | null
          fee_amount?: number | null
          id?: string
          institution_id?: string
          is_active?: boolean | null
          name?: string
          name_vi?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programmes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programmes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string | null
          department_id: string | null
          employee_number: string
          id: string
          institution_id: string
          is_active: boolean | null
          position: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          employee_number: string
          id?: string
          institution_id: string
          is_active?: boolean | null
          position?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          employee_number?: string
          id?: string
          institution_id?: string
          is_active?: boolean | null
          position?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string | null
          emergency_name: string | null
          emergency_phone: string | null
          emgs_status: string | null
          expected_grad: string | null
          home_address: string | null
          home_lat: number | null
          home_lng: number | null
          id: string
          institution_id: string
          intake_date: string | null
          is_active: boolean | null
          nationality: string | null
          passport_number: string | null
          programme_id: string | null
          student_number: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          emgs_status?: string | null
          expected_grad?: string | null
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          institution_id: string
          intake_date?: string | null
          is_active?: boolean | null
          nationality?: string | null
          passport_number?: string | null
          programme_id?: string | null
          student_number: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          emgs_status?: string | null
          expected_grad?: string | null
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          institution_id?: string
          intake_date?: string | null
          is_active?: boolean | null
          nationality?: string | null
          passport_number?: string | null
          programme_id?: string | null
          student_number?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          created_at: string | null
          credit_hours: number | null
          id: string
          institution_id: string
          is_active: boolean | null
          name: string
          name_vi: string | null
          programme_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          credit_hours?: number | null
          id?: string
          institution_id: string
          is_active?: boolean | null
          name: string
          name_vi?: string | null
          programme_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          credit_hours?: number | null
          id?: string
          institution_id?: string
          is_active?: boolean | null
          name?: string
          name_vi?: string | null
          programme_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string | null
          department_id: string | null
          employee_number: string
          id: string
          institution_id: string
          is_active: boolean | null
          max_hours_month: number | null
          specializations: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          employee_number: string
          id?: string
          institution_id: string
          is_active?: boolean | null
          max_hours_month?: number | null
          specializations?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          employee_number?: string
          id?: string
          institution_id?: string
          is_active?: boolean | null
          max_hours_month?: number | null
          specializations?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      timetables: {
        Row: {
          class_id: string | null
          created_at: string | null
          day_of_week: number | null
          effective_from: string | null
          effective_until: string | null
          end_time: string | null
          id: string
          institution_id: string
          programme_id: string | null
          start_time: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          day_of_week?: number | null
          effective_from?: string | null
          effective_until?: string | null
          end_time?: string | null
          id?: string
          institution_id: string
          programme_id?: string | null
          start_time?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          day_of_week?: number | null
          effective_from?: string | null
          effective_until?: string | null
          end_time?: string | null
          id?: string
          institution_id?: string
          programme_id?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetables_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          biometric_public_key: string | null
          created_at: string | null
          device_name: string | null
          expo_push_token: string | null
          fcm_token: string | null
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          platform: string | null
          user_id: string
        }
        Insert: {
          biometric_public_key?: string | null
          created_at?: string | null
          device_name?: string | null
          expo_push_token?: string | null
          fcm_token?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          platform?: string | null
          user_id: string
        }
        Update: {
          biometric_public_key?: string | null
          created_at?: string | null
          device_name?: string | null
          expo_push_token?: string | null
          fcm_token?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          platform?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string
          expo_push_token: string | null
          fcm_token: string | null
          full_name: string
          id: string
          institution_id: string
          is_active: boolean | null
          last_login_at: string | null
          phone: string | null
          preferred_lang: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          zalo_oa_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          expo_push_token?: string | null
          fcm_token?: string | null
          full_name: string
          id: string
          institution_id: string
          is_active?: boolean | null
          last_login_at?: string | null
          phone?: string | null
          preferred_lang?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          zalo_oa_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          expo_push_token?: string | null
          fcm_token?: string | null
          full_name?: string
          id?: string
          institution_id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          phone?: string | null
          preferred_lang?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          zalo_oa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "digital_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_institution_id: { Args: never; Returns: string }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin_or_above: { Args: never; Returns: boolean }
    }
    Enums: {
      attendance_status: "present" | "absent" | "late" | "excused"
      class_type: "campus" | "remote" | "home"
      commission_status: "pending" | "approved" | "paid" | "cancelled"
      expense_status: "pending" | "approved" | "rejected" | "paid"
      gateway_name: "stripe" | "zalopay" | "vnpay" | "momo"
      gateway_txn_status: "pending" | "success" | "failed" | "expired"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      kpi_period: "monthly" | "quarterly" | "annual"
      notification_channel: "push" | "sms" | "email" | "in_app"
      partner_tier: "starter" | "bronze" | "silver" | "gold" | "platinum"
      payment_method: "card" | "bank_transfer" | "ewallet" | "cash" | "wallet"
      payout_status: "requested" | "processing" | "completed" | "rejected"
      recruit_status: "prospect" | "applied" | "enrolled" | "dropped"
      user_role:
        | "student"
        | "teacher"
        | "admin"
        | "management"
        | "partner"
        | "parent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attendance_status: ["present", "absent", "late", "excused"],
      class_type: ["campus", "remote", "home"],
      commission_status: ["pending", "approved", "paid", "cancelled"],
      expense_status: ["pending", "approved", "rejected", "paid"],
      gateway_name: ["stripe", "zalopay", "vnpay", "momo"],
      gateway_txn_status: ["pending", "success", "failed", "expired"],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      kpi_period: ["monthly", "quarterly", "annual"],
      notification_channel: ["push", "sms", "email", "in_app"],
      partner_tier: ["starter", "bronze", "silver", "gold", "platinum"],
      payment_method: ["card", "bank_transfer", "ewallet", "cash", "wallet"],
      payout_status: ["requested", "processing", "completed", "rejected"],
      recruit_status: ["prospect", "applied", "enrolled", "dropped"],
      user_role: [
        "student",
        "teacher",
        "admin",
        "management",
        "partner",
        "parent",
      ],
    },
  },
} as const
