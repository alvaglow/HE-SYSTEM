-- HED System Database Schema
-- Complete PostgreSQL schema for the Harmonic Evolution Domain System
-- Version: 1.0.0

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS TABLE
-- Core table storing all registered user accounts for the system.
-- This is the primary identity table referenced by all other user-related tables.
-- ============================================================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'teacher', 'parent', 'student')) DEFAULT 'student',
    account_status VARCHAR(20) CHECK (account_status IN ('active', 'suspended', 'deactivated')) DEFAULT 'active',
    is_email_verified BOOLEAN DEFAULT FALSE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(account_status);

-- ============================================================================
-- 2. USER_DEVICES TABLE
-- Tracks individual devices logged in by each user for session management
-- and security monitoring. Used to detect suspicious device access.
-- ============================================================================
CREATE TABLE user_devices (
    device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_name VARCHAR(255),
    fingerprint VARCHAR(255) NOT NULL,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    is_trusted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_devices_user ON user_devices(user_id);
CREATE INDEX idx_user_devices_fingerprint ON user_devices(fingerprint);

-- ============================================================================
-- 3. REFRESH_TOKENS TABLE
-- Manages long-lived refresh tokens for maintaining user sessions securely.
-- Supports token rotation and secure logout across all devices.
-- ============================================================================
CREATE TABLE refresh_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    device_id UUID,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES user_devices(device_id) ON DELETE SET NULL
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_device ON refresh_tokens(device_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================================================
-- 4. ENCRYPTION_KEYS TABLE
-- Stores encrypted cryptographic keys used for securing sensitive data at rest.
-- Supports key rotation and multiple encryption algorithms.
-- ============================================================================
CREATE TABLE encryption_keys (
    key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    key_type VARCHAR(50) NOT NULL,
    encrypted_key TEXT NOT NULL,
    algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expired_at TIMESTAMPTZ,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_encryption_keys_user ON encryption_keys(user_id);

-- ============================================================================
-- 5. USER_PII TABLE
-- Stores sensitive personally identifiable information (PII) in an encrypted
-- format to ensure compliance with privacy regulations (GDPR, CCPA).
-- ============================================================================
CREATE TABLE user_pii (
    pii_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    phone_encrypted TEXT,
    address_encrypted TEXT,
    dob_encrypted TEXT,
    emergency_contact_encrypted TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_pii_user ON user_pii(user_id);

-- ============================================================================
-- 6. STUDENTS TABLE
-- Extends the 'users' table to store additional information specific to student users.
-- Links a user account to their academic profile.
-- ============================================================================
CREATE TABLE students (
    student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    student_number VARCHAR(50) UNIQUE NOT NULL,
    grade_level VARCHAR(20),
    enrollment_date DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_students_number ON students(student_number);

-- ============================================================================
-- 7. PARENTS TABLE
-- Extends the 'users' table with information for parent/guardian users.
-- Used for communication and billing purposes.
-- ============================================================================
CREATE TABLE parents (
    parent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    address TEXT,
    phone_number VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_parents_user ON parents(user_id);

-- ============================================================================
-- 8. CLASSES TABLE
-- Defines the classes or courses available in the system.
-- Used for scheduling, enrollment, and attendance tracking.
-- ============================================================================
CREATE TABLE classes (
    class_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_name VARCHAR(100) NOT NULL,
    description TEXT,
    schedule VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_classes_active ON classes(is_active);

-- ============================================================================
-- 9. CLASS_ENROLLMENTS TABLE
-- Junction table linking students to the classes they are enrolled in.
-- Enables many-to-many relationship between students and classes.
-- ============================================================================
CREATE TABLE class_enrollments (
    enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    class_id UUID NOT NULL,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
    UNIQUE (student_id, class_id)
);

CREATE INDEX idx_enrollments_student ON class_enrollments(student_id);
CREATE INDEX idx_enrollments_class ON class_enrollments(class_id);

-- ============================================================================
-- 10. ATTENDANCE_SESSIONS TABLE
-- Represents a specific date and time for an attendance check-in.
-- Links attendance records to a particular class session.
-- ============================================================================
CREATE TABLE attendance_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL,
    session_date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE
);

CREATE INDEX idx_attendance_sessions_class ON attendance_sessions(class_id);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(session_date);

-- ============================================================================
-- 11. ATTENDANCE_RECORDS TABLE
-- Tracks individual student attendance status (present, absent, late) for each session.
-- Core table for tracking student participation in class activities.
-- ============================================================================
CREATE TABLE attendance_records (
    record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    student_id UUID NOT NULL,
    status VARCHAR(20) CHECK (status IN ('present', 'absent', 'late')) NOT NULL,
    remark TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    UNIQUE (session_id, student_id)
);

CREATE INDEX idx_attendance_session ON attendance_records(session_id);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_attendance_status ON attendance_records(status);

-- ============================================================================
-- 12. INVOICES TABLE
-- Stores billing information and records for students.
-- Links to students and tracks payment status.
-- ============================================================================
CREATE TABLE invoices (
    invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

CREATE INDEX idx_invoices_student ON invoices(student_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- ============================================================================
-- 13. PAYMENTS TABLE
-- Records successful payment transactions made against invoices.
-- Links to invoices and tracks payment details.
-- ============================================================================
CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    amount_paid NUMERIC(10, 2) NOT NULL CHECK (amount_paid > 0),
    payment_method VARCHAR(50) NOT NULL,
    transaction_reference VARCHAR(255) UNIQUE,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);

-- ============================================================================
-- 14. PAYMENT_SPEND_HISTORY TABLE
-- Tracks how processed payment funds are managed or allocated.
-- Provides an audit trail for payment fund usage.
-- ============================================================================
CREATE TABLE payment_spend_history (
    spend_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    spent_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE
);

CREATE INDEX idx_spend_payment ON payment_spend_history(payment_id);

-- ============================================================================
-- 15. PAYMENT_WEBHOOKS TABLE
-- Stores payloads received from external payment gateways for event processing.
-- Allows asynchronous processing of payment status updates.
-- ============================================================================
CREATE TABLE payment_webhooks (
    webhook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE SET NULL
);

CREATE INDEX idx_webhooks_payment ON payment_webhooks(payment_id);
CREATE INDEX idx_webhooks_processed ON payment_webhooks(processed);
CREATE INDEX idx_webhooks_received ON payment_webhooks(received_at);

-- ============================================================================
-- 16. AUDIT_LOG TABLE
-- Provides an immutable log of critical events for security and compliance auditing.
-- Tracks all significant changes to sensitive data.
-- ============================================================================
CREATE TABLE audit_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- Final confirmation message
SELECT 'HED System Schema Version 1.0.0 Loaded Successfully' AS status;