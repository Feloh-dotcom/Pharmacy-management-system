-- =========================================================================
-- SUPABASE SCHEMATIC DATABASE ALIGNMENT & TRANSITION MIGRATION
-- AUTHOR: SENIOR SUPABASE DATABASE ARCHITECT
-- PURPOSE: Align Sales, Receipts, and Inventory Logs tables to match code mappings
-- =========================================================================

-- 1. CLEAN UP DESTRUCTIVE FOREIGN KEYS TO PREVENT TRANSACTION BLOCKS
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_customer_id_fkey CASCADE;
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_cashier_id_fkey CASCADE;
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_sale_id_fkey CASCADE;
ALTER TABLE public.inventory_logs DROP CONSTRAINT IF EXISTS inventory_logs_actor_id_fkey CASCADE;
ALTER TABLE public.inventory_logs DROP CONSTRAINT IF EXISTS inventory_logs_medicine_id_fkey CASCADE;

-- 2. ALIGN SALES TABLE COLUMNS
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS sale_status TEXT DEFAULT 'completed';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cashier_id TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 3. ALIGN RECEIPTS TABLE COLUMNS
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS receipt_number TEXT UNIQUE;

-- 4. ALIGN INVENTORY LOGS TABLE COLUMNS
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS actor_id TEXT;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS medicine_name TEXT;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS quantity INT;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 5. RUN AUTOMATED FILL AND RECONCILIATION DATA INSERTS
UPDATE public.inventory_logs SET action = type WHERE action IS NULL;
ALTER TABLE public.inventory_logs ALTER COLUMN action SET NOT NULL;
