-- ============================================================
-- SWOOSH — Safe Consolidated Migration for catmap Supabase
-- ============================================================
-- This is a single idempotent migration that creates the full
-- Swoosh schema. It is safe to run on a database that already
-- has other tables (e.g. catmap's own tables will not be touched).
--
-- Safe patterns used throughout:
--   CREATE TABLE IF NOT EXISTS
--   CREATE INDEX IF NOT EXISTS
--   CREATE EXTENSION IF NOT EXISTS
--   CREATE OR REPLACE FUNCTION
--   ALTER TABLE ... ADD COLUMN IF NOT EXISTS
--   INSERT ... ON CONFLICT DO NOTHING / DO UPDATE
--   DO $$ BEGIN CREATE POLICY ...; EXCEPTION WHEN duplicate_object THEN NULL; END $$
--   DO $$ BEGIN CREATE TRIGGER ...; EXCEPTION WHEN duplicate_object THEN NULL; END $$
--   DO $$ BEGIN CREATE SEQUENCE ...; EXCEPTION WHEN duplicate_table THEN NULL; END $$
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ============================================================
-- 2. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  prefix  text;
  seq_val bigint;
BEGIN
  SELECT value INTO prefix FROM translation_system_settings WHERE key = 'invoice_prefix';
  IF prefix IS NULL THEN prefix := 'INV'; END IF;
  seq_val := nextval('invoice_seq');
  RETURN prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 4, '0');
END;
$$;

-- Defined later (after translation_employees table exists), but idempotent here as well.
-- We re-declare it after the tables section so it can reference auth.uid().
-- For now just create a placeholder that gets replaced below.


-- ============================================================
-- 3. SEQUENCES
-- ============================================================

DO $$ BEGIN
  CREATE SEQUENCE invoice_seq START 1;
EXCEPTION WHEN duplicate_table THEN
  NULL; -- sequence already exists
END $$;


-- ============================================================
-- 4. TABLES (all columns from all 22 migrations pre-merged)
-- ============================================================

-- ── translation_language_pairs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS translation_language_pairs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_lang   text        NOT NULL,
  target_lang   text        NOT NULL,
  per_word_rate numeric(10,4) NOT NULL DEFAULT 0.12,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_lang, target_lang)
);

-- ── translation_specialty_multipliers ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS translation_specialty_multipliers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  multiplier  numeric(6,4) NOT NULL DEFAULT 1.0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── translation_equipment_items ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS translation_equipment_items (
  id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text         NOT NULL,
  description        text,
  quantity_total     integer      NOT NULL DEFAULT 1,
  quantity_available integer      NOT NULL DEFAULT 1,
  rate_per_day       numeric(10,2) NOT NULL,
  deposit_amount     numeric(10,2) NOT NULL DEFAULT 0,
  is_active          boolean      NOT NULL DEFAULT true,
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now()
);

-- ── translation_system_settings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS translation_system_settings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text        NOT NULL UNIQUE,
  value       text        NOT NULL,
  description text,
  updated_by  uuid,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── translation_clients ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS translation_clients (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name       text        NOT NULL,
  email              text        NOT NULL UNIQUE,
  phone              text,
  company_name       text,
  stripe_customer_id text,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ── translation_employees ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS translation_employees (
  id         uuid        PRIMARY KEY,  -- same as auth.users.id
  full_name  text        NOT NULL,
  role       text        NOT NULL DEFAULT 'employee'
               CHECK (role IN ('admin', 'employee')),
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── translation_translators ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS translation_translators (
  id                    uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name             text         NOT NULL,
  email                 text         NOT NULL UNIQUE,
  phone                 text,
  translation_language_pairs        text[]       NOT NULL DEFAULT '{}',
  specialties           text[]       NOT NULL DEFAULT '{}',
  stripe_connect_id     text,
  stripe_connect_status text         DEFAULT 'pending'
                          CHECK (stripe_connect_status IN ('pending', 'active', 'restricted')),
  is_active             boolean      NOT NULL DEFAULT true,
  notes                 text,
  -- 0013: vendor application
  vendor_type           text         DEFAULT 'translator'
                          CHECK (vendor_type IN ('translator', 'interpreter', 'both', 'notary', 'other')),
  applied_at            timestamptz,
  -- 0014: vendor rates
  per_word_rate         numeric(10,4),
  hourly_rate           numeric(10,2),
  -- 0017: interpreter qualifications
  court_certified       boolean      NOT NULL DEFAULT false,
  medical_certified     boolean      NOT NULL DEFAULT false,
  does_consecutive      boolean      NOT NULL DEFAULT true,
  does_simultaneous     boolean      NOT NULL DEFAULT false,
  -- 0018: payment method
  payment_method        text         DEFAULT 'check',
  payment_details       text,
  -- 0021: address / geocoordinates
  certifications        text[]       DEFAULT '{}',
  address               text,
  city                  text,
  state                 text,
  zip                   text,
  lat                   numeric(9,6),
  lng                   numeric(9,6),
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now()
);

-- ── translation_jobs ──────────────────────────────────────────────────────
-- Includes all columns added across migrations 0001–0022.
CREATE TABLE IF NOT EXISTS translation_jobs (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 0010: transcription added to constraint
  job_type  text NOT NULL
              CHECK (job_type IN ('translation', 'interpretation', 'equipment_rental', 'notary', 'transcription')),
  status    text NOT NULL DEFAULT 'draft',
  client_id uuid NOT NULL REFERENCES translation_clients(id),

  -- Language (translation + interpretation)
  source_lang   text,
  target_lang   text,
  specialty_id  uuid REFERENCES translation_specialty_multipliers(id),

  -- Translation-specific
  word_count                  integer,
  document_path               text,
  ai_draft_path               text,
  translated_doc_path         text,
  document_name               text,
  ai_translation_started_at   timestamptz,
  ai_translation_completed_at timestamptz,
  -- 0011: multi-document
  document_paths              jsonb,

  -- Interpretation-specific
  scheduled_at      timestamptz,
  duration_minutes  integer,
  location_type     text CHECK (location_type IN ('in_person', 'phone', 'video')),
  location_details  text,
  interpreter_notes text,
  -- 0017: interpretation mode / requirements
  interpretation_mode         text,
  interpretation_cert_required text,
  num_interpreters            integer,
  simultaneous_surcharge      numeric(10,2),
  equipment_rental_needed     text,
  equipment_details           jsonb,
  po_number                   text UNIQUE,
  -- 0019: assignment type for interpretation
  assignment_type             text,

  -- Equipment rental-specific
  rental_start_date   date,
  rental_end_date     date,
  rental_items        jsonb,
  deposit_amount      numeric(12,2),
  deposit_refunded_at timestamptz,
  dispatch_at         timestamptz,
  return_at           timestamptz,

  -- Notary/apostille-specific
  notary_service_type text CHECK (notary_service_type IN ('notary', 'apostille', 'both')),
  delivery_method     text CHECK (delivery_method IN ('in_person', 'mail', 'mobile_notary')),
  appointment_at      timestamptz,
  -- 0007: mobile notary
  notary_address         text,
  notary_signature_count integer DEFAULT 1,

  -- Transcription-specific (0010)
  media_path                text,
  media_name                text,
  media_duration_seconds    integer,
  transcription_service_type text
    CHECK (transcription_service_type IS NULL OR transcription_service_type IN ('transcription', 'subtitles', 'both')),

  -- Quote / pricing
  quote_per_word_rate      numeric(10,4),
  quote_multiplier         numeric(6,4),
  quote_amount             numeric(12,2),
  quote_adjusted_amount    numeric(12,2),
  quote_finalized_at       timestamptz,
  quote_token              text UNIQUE,
  quote_token_expires_at   timestamptz,
  quote_accepted_at        timestamptz,
  -- 0003: interpretation quote fields
  quote_interpretation_rate numeric(10,2),
  quote_billed_minutes      integer,
  quote_is_pivot            boolean NOT NULL DEFAULT false,
  -- 0007: rush fee
  quote_rush_days           integer DEFAULT 0,
  quote_rush_fee_percent    numeric(6,2) DEFAULT 0,
  quote_rush_amount         numeric(10,2),
  estimated_turnaround_days integer,
  requested_delivery_date   date,
  -- 0012: mailing options
  mailing_option            text,
  mailing_fedex_overnight   boolean NOT NULL DEFAULT false,
  mailing_amount            numeric(10,2),
  -- 0015: discount
  discount_amount           numeric(10,2),
  discount_label            text,

  -- Payment
  stripe_payment_intent_id    text,
  stripe_checkout_session_id  text UNIQUE,
  invoice_number              text UNIQUE,
  invoice_issued_at           timestamptz,
  payment_collected_at        timestamptz,

  -- Assignment
  assigned_translator_id  uuid REFERENCES translation_translators(id),
  assigned_at             timestamptz,
  deadline_at             timestamptz,
  -- 0016: job handler (internal admin)
  handled_by              uuid REFERENCES translation_employees(id) ON DELETE SET NULL,
  -- 0020: vendor confirmed rate
  vendor_confirmed_rate       numeric(10,2),
  vendor_accepted_at          timestamptz,
  translator_acceptance_token text UNIQUE,
  vendor_overtime_requested   boolean DEFAULT false,
  vendor_overtime_notes       text,
  -- 0022: reviewer
  reviewer_id             uuid REFERENCES translation_employees(id),
  reviewed_at             timestamptz,

  -- Delivery
  delivered_at            timestamptz,
  delivery_token          text UNIQUE,
  delivery_email_sent_at  timestamptz,

  -- Internal
  employee_notes text,
  created_by     uuid REFERENCES translation_employees(id),
  -- 0003: language detection
  detected_source_lang             text,
  detected_source_lang_confidence  numeric(4,3),
  certification_type               text
    CHECK (certification_type IN ('none', 'general', 'court')),
  missing_pricing_warning          text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── translation_job_status_history ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS translation_job_status_history (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid        NOT NULL REFERENCES translation_jobs(id) ON DELETE CASCADE,
  old_status  text,
  new_status  text        NOT NULL,
  changed_by  uuid        REFERENCES translation_employees(id),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── translation_translator_invoices ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS translation_translator_invoices (
  id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id             uuid         NOT NULL REFERENCES translation_jobs(id),
  translator_id      uuid         NOT NULL REFERENCES translation_translators(id),
  amount             numeric(12,2) NOT NULL,
  currency           text         NOT NULL DEFAULT 'usd',
  status             text         NOT NULL DEFAULT 'submitted'
                       CHECK (status IN ('submitted', 'approved', 'queued', 'paid', 'failed')),
  invoice_number     text,
  submitted_at       timestamptz  NOT NULL DEFAULT now(),
  approved_at        timestamptz,
  approved_by        uuid         REFERENCES translation_employees(id),
  payout_due_at      timestamptz,
  stripe_transfer_id text,
  paid_at            timestamptz,
  notes              text,
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now()
);

-- ── translation_email_log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS translation_email_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid        REFERENCES translation_jobs(id),
  email_type    text        NOT NULL,
  recipient     text        NOT NULL,
  subject       text        NOT NULL,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  resend_id     text,
  status        text        NOT NULL DEFAULT 'sent'
                  CHECK (status IN ('sent', 'failed')),
  error_message text
);

-- ── translation_interpreter_bids (0019) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS translation_interpreter_bids (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid         NOT NULL REFERENCES translation_jobs(id) ON DELETE CASCADE,
  translator_id uuid         NOT NULL REFERENCES translation_translators(id),
  token         text         NOT NULL UNIQUE,
  rate          numeric(10,2),
  rate_notes    text,
  status        text         NOT NULL DEFAULT 'pending',
  responded_at  timestamptz,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);


-- ============================================================
-- 5. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_jobs_client              ON translation_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status              ON translation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type                ON translation_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_translator ON translation_jobs(assigned_translator_id);
CREATE INDEX IF NOT EXISTS idx_jobs_quote_token         ON translation_jobs(quote_token);
CREATE INDEX IF NOT EXISTS idx_jobs_delivery_token      ON translation_jobs(delivery_token);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at          ON translation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_handled_by          ON translation_jobs(handled_by);
CREATE INDEX IF NOT EXISTS idx_jobs_reviewer            ON translation_jobs(reviewer_id);

CREATE INDEX IF NOT EXISTS idx_status_history_job       ON translation_job_status_history(job_id);

CREATE INDEX IF NOT EXISTS idx_translator_invoices_status ON translation_translator_invoices(status);
CREATE INDEX IF NOT EXISTS idx_translator_invoices_due    ON translation_translator_invoices(payout_due_at);

CREATE INDEX IF NOT EXISTS idx_email_log_job            ON translation_email_log(job_id);

CREATE INDEX IF NOT EXISTS interpreter_bids_job_id_idx  ON translation_interpreter_bids(job_id);
CREATE INDEX IF NOT EXISTS interpreter_bids_token_idx   ON translation_interpreter_bids(token);


-- ============================================================
-- 6. TRIGGERS (idempotent — skip if already exists)
-- ============================================================

DO $$ BEGIN
  CREATE TRIGGER trg_language_pairs_updated
    BEFORE UPDATE ON translation_language_pairs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_specialty_multipliers_updated
    BEFORE UPDATE ON translation_specialty_multipliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_equipment_items_updated
    BEFORE UPDATE ON translation_equipment_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_clients_updated
    BEFORE UPDATE ON translation_clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_translators_updated
    BEFORE UPDATE ON translation_translators FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_jobs_updated
    BEFORE UPDATE ON translation_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_translator_invoices_updated
    BEFORE UPDATE ON translation_translator_invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_interpreter_bids_updated
    BEFORE UPDATE ON translation_interpreter_bids FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE translation_language_pairs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_specialty_multipliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_equipment_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_system_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_employees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_translators          ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_jobs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_job_status_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_translator_invoices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_email_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_interpreter_bids     ENABLE ROW LEVEL SECURITY;

-- Helper: check if the calling user is an active employee
CREATE OR REPLACE FUNCTION is_employee()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM translation_employees
    WHERE id = auth.uid() AND is_active = true
  );
$$;

-- Employees: full access to all tables
DO $$ BEGIN CREATE POLICY "employees_all" ON translation_language_pairs
  TO authenticated USING (is_employee()) WITH CHECK (is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "employees_all" ON translation_specialty_multipliers
  TO authenticated USING (is_employee()) WITH CHECK (is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "employees_all" ON translation_equipment_items
  TO authenticated USING (is_employee()) WITH CHECK (is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "employees_all" ON translation_system_settings
  TO authenticated USING (is_employee()) WITH CHECK (is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "employees_all" ON translation_clients
  TO authenticated USING (is_employee()) WITH CHECK (is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "employees_all" ON translation_employees
  TO authenticated USING (is_employee()) WITH CHECK (is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "employees_all" ON translation_translators
  TO authenticated USING (is_employee()) WITH CHECK (is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "employees_all" ON translation_jobs
  TO authenticated USING (is_employee()) WITH CHECK (is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "employees_all" ON translation_job_status_history
  TO authenticated USING (is_employee()) WITH CHECK (is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "employees_all" ON translation_translator_invoices
  TO authenticated USING (is_employee()) WITH CHECK (is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "employees_all" ON translation_email_log
  TO authenticated USING (is_employee()) WITH CHECK (is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "employees_all" ON translation_interpreter_bids
  TO authenticated USING (is_employee()) WITH CHECK (is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Public read: reference data for client-facing forms
DO $$ BEGIN CREATE POLICY "public_read" ON translation_language_pairs
  FOR SELECT TO anon USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "public_read" ON translation_specialty_multipliers
  FOR SELECT TO anon USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "public_read" ON translation_equipment_items
  FOR SELECT TO anon USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- 8. SEED: SYSTEM SETTINGS
-- Final values after all migrations (0002–0007 updates applied)
-- ============================================================

INSERT INTO translation_system_settings (key, value, description) VALUES
  ('translation_minimum_standard',        '95.00',    'Minimum charge for any standard translation'),
  ('translation_minimum_certified',       '120.00',   'Minimum charge for Certified (USCIS) translations'),
  ('translation_minimum_court',           '275.00',   'Court certification minimum — most languages'),
  ('translation_minimum_court_premium',   '450.00',   'Court certification minimum — Japanese & Hebrew'),
  ('translation_court_premium_langs',     'Japanese,Hebrew', 'Comma-separated languages that use the premium court minimum'),
  ('interpretation_rate_standard',        '450.00',   'Standard interpreter rate per 3-hour block'),
  ('interpretation_rate_court',           '550.00',   'Court-certified interpreter rate per 3-hour block'),
  ('interpretation_phone_rate_per_minute','4.00',     'Phone interpretation rate per minute'),
  ('interpretation_phone_minimum_minutes','30',       'Minimum minutes billed for phone interpretation'),
  ('notary_fee',                          '15.00',    'Per-document notarization fee'),
  ('apostille_fee',                       '95.00',    'Apostille certification fee per document'),
  ('notary_mobile_base_rate',             '80',       'Mobile notary base rate (within LA, low mileage)'),
  ('notary_mobile_max_rate',              '150',      'Mobile notary max rate (outer LA, high mileage)'),
  ('notary_per_signature',                '15',       'Per notary signature/stamp fee'),
  ('ai_translation_rules',               '',          'Critical output rules for AI-translated documents')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, description = EXCLUDED.description;


-- ============================================================
-- 9. SEED: SPECIALTY MULTIPLIERS
-- Final values after 0003 + 0009 updates
-- ============================================================

INSERT INTO translation_specialty_multipliers (name, multiplier, is_active) VALUES
  ('General',                       1.0000, true),
  ('Certified (USCIS)',              1.8000, true),
  ('Court Certified',                3.0000, true),
  ('Legal',                          1.2000, true),
  ('Medical',                        1.2000, true),
  ('Technical / Patent',             1.3000, true),
  ('Financial / Real Estate',        1.2500, true),
  ('Academic',                       1.1500, true),
  ('Transcription / Subtitling',     1.2000, true),
  ('Website / Software Localization',1.1000, true)
ON CONFLICT (name) DO UPDATE
  SET multiplier = EXCLUDED.multiplier, is_active = EXCLUDED.is_active;


-- ============================================================
-- 10. SEED: LANGUAGE PAIRS
-- Final rates after 0008 + 0009 restructure:
--   English ↔ standard: $0.10   |   English ↔ complex: $0.24
--   Non-English pairs: $0.20
-- ============================================================

DO $$
DECLARE
  lang text;
  rate numeric;
  all_langs text[] := ARRAY[
    'Acholi','Afar','Afrikaans','Akan','Albanian','Amharic','Arabic','Aragonese',
    'Aramaic','Armenian','Aromanian','Assamese','Avar','Aymara','Azerbaijani',
    'Balochi','Bambara','Bashkir','Basque','Belarusian','Bengali','Bhojpuri',
    'Bosnian','Breton','Bulgarian','Burmese',
    'Cantonese','Catalan','Cebuano','Chechen','Chinese (Simplified)','Chinese (Traditional)',
    'Chuvash','Cornish','Corsican','Croatian','Czech',
    'Danish','Dari','Dinka','Dutch','Dzongkha',
    'Esperanto','Estonian','Ewe',
    'Faroese','Fijian','Finnish','Flemish','French','French Canadian','Frisian','Fulani',
    'Galician','Georgian','German','Greek','Guaraní','Gujarati',
    'Haitian Creole','Hausa','Hawaiian','Hebrew','Hindi','Hmong','Hungarian',
    'Icelandic','Igbo','Ilocano','Indonesian','Irish',
    'Japanese','Javanese',
    'Kannada','Kashmiri','Kazakh','Khmer','Kikuyu','Kinyarwanda','Korean',
    'Kurdish (Kurmanji)','Kurdish (Sorani)','Kyrgyz',
    'Lao','Latin','Latvian','Lingala','Lithuanian','Luganda','Luxembourgish',
    'Macedonian','Malagasy','Malay','Malayalam','Maltese','Manipuri','Maori',
    'Marathi','Marshallese','Mizo','Mongolian',
    'Nahuatl','Ndebele','Nepali','Norwegian',
    'Oriya','Oromo','Ottoman Turkish',
    'Pashto','Persian (Farsi)','Polish','Portuguese','Portuguese (Brazilian)','Punjabi',
    'Quechua',
    'Romanian','Romansh','Russian',
    'Samoan','Sanskrit','Scottish Gaelic','Serbian','Sesotho','Shona','Sindhi',
    'Sinhalese','Slovak','Slovenian','Somali','Spanish','Spanish (Latin American)',
    'Sundanese','Swahili','Swedish',
    'Tagalog','Tajik','Tamil','Tatar','Telugu','Thai','Tibetan','Tigrinya',
    'Tongan','Tswana','Turkish','Turkmen','Twi',
    'Ukrainian','Urdu','Uyghur','Uzbek',
    'Vietnamese',
    'Welsh','Wolof',
    'Xhosa',
    'Yiddish','Yoruba','Yucatec Maya',
    'Zulu'
  ];
  complex_langs text[] := ARRAY[
    'Arabic','Burmese','Cantonese','Chinese (Simplified)','Chinese (Traditional)',
    'Dari','Hebrew','Japanese','Khmer','Korean','Lao','Mongolian',
    'Pashto','Persian (Farsi)','Thai','Tibetan','Uyghur','Yiddish'
  ];
BEGIN
  FOREACH lang IN ARRAY all_langs LOOP
    -- Japanese and Hebrew keep their original $0.24 rate (exception from 0009)
    IF lang = ANY(complex_langs) THEN
      rate := 0.24;
    ELSE
      rate := 0.10;
    END IF;
    INSERT INTO translation_language_pairs (source_lang, target_lang, per_word_rate, is_active)
    VALUES ('English', lang, rate, true)
    ON CONFLICT (source_lang, target_lang) DO UPDATE
      SET per_word_rate = EXCLUDED.per_word_rate, is_active = true;

    INSERT INTO translation_language_pairs (source_lang, target_lang, per_word_rate, is_active)
    VALUES (lang, 'English', rate, true)
    ON CONFLICT (source_lang, target_lang) DO UPDATE
      SET per_word_rate = EXCLUDED.per_word_rate, is_active = true;
  END LOOP;
END $$;

-- Common cross-language pairs (non-English hubs)
INSERT INTO translation_language_pairs (source_lang, target_lang, per_word_rate, is_active) VALUES
  ('Spanish', 'French',                   0.20, true),
  ('French',  'Spanish',                  0.20, true),
  ('Spanish', 'Portuguese',               0.20, true),
  ('Portuguese', 'Spanish',               0.20, true),
  ('Spanish', 'Portuguese (Brazilian)',   0.20, true),
  ('Portuguese (Brazilian)', 'Spanish',   0.20, true),
  ('Spanish', 'Italian',                  0.20, true),
  ('Italian', 'Spanish',                  0.20, true),
  ('Spanish', 'German',                   0.20, true),
  ('German',  'Spanish',                  0.20, true),
  ('Spanish', 'Spanish (Latin American)', 0.12, true),
  ('Spanish (Latin American)', 'Spanish', 0.12, true),
  ('French',  'German',                   0.20, true),
  ('German',  'French',                   0.20, true),
  ('French',  'Italian',                  0.20, true),
  ('Italian', 'French',                   0.20, true),
  ('Russian', 'Ukrainian',                0.20, true),
  ('Ukrainian','Russian',                 0.20, true),
  ('Chinese (Simplified)', 'Chinese (Traditional)', 0.20, true),
  ('Chinese (Traditional)', 'Chinese (Simplified)', 0.20, true),
  ('Chinese (Simplified)', 'Japanese',    0.24, true),
  ('Japanese', 'Chinese (Simplified)',    0.24, true),
  ('Chinese (Traditional)', 'Japanese',   0.24, true),
  ('Japanese', 'Chinese (Traditional)',   0.24, true),
  ('Korean',   'Chinese (Simplified)',    0.24, true),
  ('Chinese (Simplified)', 'Korean',      0.24, true),
  ('Arabic',   'Persian (Farsi)',         0.24, true),
  ('Persian (Farsi)', 'Arabic',           0.24, true),
  ('Arabic',   'Hebrew',                  0.24, true),
  ('Hebrew',   'Arabic',                  0.24, true),
  ('Hindi',    'Urdu',                    0.20, true),
  ('Urdu',     'Hindi',                   0.20, true),
  ('Hindi',    'Punjabi',                 0.20, true),
  ('Punjabi',  'Hindi',                   0.20, true),
  ('Tagalog',  'Spanish',                 0.20, true),
  ('Spanish',  'Tagalog',                 0.20, true),
  ('Armenian', 'Russian',                 0.20, true),
  ('Russian',  'Armenian',                0.20, true)
ON CONFLICT (source_lang, target_lang) DO UPDATE
  SET per_word_rate = EXCLUDED.per_word_rate, is_active = true;


-- ============================================================
-- 11. STORAGE BUCKET
-- Run this in the Supabase Dashboard SQL editor OR via API.
-- The storage schema is managed by Supabase internally;
-- inserting into storage.buckets creates the bucket if it
-- doesn't already exist.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('job-documents', 'job-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users (translation_employees) to read/write job documents
DO $$ BEGIN
  CREATE POLICY "employees_read_job_docs" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'job-documents' AND is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "employees_write_job_docs" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'job-documents' AND is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "employees_update_job_docs" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'job-documents' AND is_employee());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
