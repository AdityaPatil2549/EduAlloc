-- ==============================================================================
-- EduAllocPro — BigQuery Schema DDL
-- Dataset: edualloc_dataset
-- Run: bq mk --dataset --location=us-central1 YOUR_PROJECT:edualloc_dataset
-- Then: bq query --use_legacy_sql=false < create_tables.sql
-- ==============================================================================

-- ── schools ──────────────────────────────────────────────────────────────────
-- UDISE+ school data + computed DI scores
-- Cluster key: district_code → most queries filter by district
-- school_id is ALWAYS STRING (11-digit UDISE code) — NEVER cast to INT64

CREATE TABLE IF NOT EXISTS `edualloc_dataset.schools` (
    school_id               STRING  NOT NULL,  -- 11-digit UDISE code e.g. '27031070001'
    school_name             STRING,
    block_name              STRING,
    village_name            STRING,
    district_code           STRING  NOT NULL,  -- 5-char Census code e.g. 'NDB01'
    school_category         STRING,            -- 'PRIMARY' | 'UPPER_PRIMARY' | 'SECONDARY'
    medium_of_instruction   STRING,            -- 'Marathi' | 'Semi-English' | 'English'
    management              STRING,            -- 'ZP' | 'State Govt' | 'Private Aided'

    -- ── Enrollment & Staff ─────────────────────────────────────────────────
    total_enrollment        INT64,
    prev_year_enrollment    INT64,
    total_teachers          INT64,
    subject_vacancies       INT64,             -- total count of subject vacancies
    subject_vacancy_list    STRING,            -- JSON array of subject codes

    -- ── Infrastructure ─────────────────────────────────────────────────────
    has_toilet              BOOL,
    has_electricity         BOOL,
    total_classrooms        INT64,
    total_classes           INT64,             -- number of class grades present
    urban_distance_km       FLOAT64,

    -- ── Learning Outcomes ──────────────────────────────────────────────────
    aser_proxy_score        FLOAT64,           -- 0-100, higher = better

    -- ── Location ───────────────────────────────────────────────────────────
    lat                     FLOAT64,
    lng                     FLOAT64,
    geocode_status          STRING DEFAULT 'PENDING',  -- 'OK' | 'PENDING' | 'FAILED'
    geocode_address         STRING,

    -- ── Computed DI ────────────────────────────────────────────────────────
    di_score                FLOAT64,           -- 0-100, NULL until computed
    di_category             STRING,            -- 'critical'|'high'|'moderate'|'stable'
    di_breakdown_json       STRING,            -- JSON blob of per-signal scores
    di_data_quality         STRING,            -- 'OK' | 'PARTIAL' | 'INSUFFICIENT_DATA'

    -- ── Metadata ───────────────────────────────────────────────────────────
    is_data_stale           BOOL DEFAULT TRUE, -- UDISE data is 12-18 months old
    udise_year              STRING,            -- e.g. '2022-23'
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
CLUSTER BY district_code, di_score
OPTIONS (description = 'UDISE+ school data with computed Deprivation Index scores');

-- ── teachers ─────────────────────────────────────────────────────────────────
-- Synthetic teacher profiles (Phase 1) + HRMS data (Phase 2)
-- NEVER log teacher name, address, DOB — only teacher_id

CREATE TABLE IF NOT EXISTS `edualloc_dataset.teachers` (
    teacher_id              STRING  NOT NULL,  -- UUID v4 (Phase 1) | HRMS ID (Phase 2)
    district_code           STRING  NOT NULL,
    subject_specialization  STRING  NOT NULL,  -- JSON array e.g. '["MATH","SCI"]'
    qualification           STRING,            -- e.g. 'MSc BEd'
    years_service           INT64,
    years_rural             INT64,
    languages               STRING,            -- JSON array e.g. '["mr","hi"]'
    long_dist_consent       BOOL DEFAULT FALSE,
    current_school_id       STRING,            -- NULL if unposted
    is_synthetic            BOOL DEFAULT TRUE, -- NEVER FALSE in Phase 1
    embedding_status        STRING DEFAULT 'PENDING',  -- 'OK' | 'PENDING'
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
CLUSTER BY district_code
OPTIONS (description = 'Teacher profiles — synthetic Phase 1, HRMS Phase 2');

-- ── deployments ──────────────────────────────────────────────────────────────
-- OR-Tools optimizer assignments + manual override audit

CREATE TABLE IF NOT EXISTS `edualloc_dataset.deployments` (
    deployment_id           STRING  NOT NULL,  -- UUID v4
    district_code           STRING  NOT NULL,
    teacher_id              STRING  NOT NULL,
    school_id               STRING  NOT NULL,
    vacancy_subject         STRING  NOT NULL,
    dvs_score               FLOAT64,
    distance_km             FLOAT64,
    status                  STRING DEFAULT 'PENDING',  -- 'PENDING'|'APPROVED'|'REJECTED'
    optimizer_status        STRING,                     -- 'OPTIMAL'|'FEASIBLE'
    approved_by             STRING,                     -- officer user_id
    approved_at             TIMESTAMP,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
CLUSTER BY district_code, status
OPTIONS (description = 'Teacher deployment assignments from OR-Tools optimizer');

-- ── briefings ────────────────────────────────────────────────────────────────
-- Gemini-generated weekly district briefings (cached)

CREATE TABLE IF NOT EXISTS `edualloc_dataset.briefings` (
    briefing_id             STRING  NOT NULL,
    district_code           STRING  NOT NULL,
    week_ending             DATE    NOT NULL,
    summary_en              STRING,
    summary_mr              STRING,            -- Marathi Devanagari
    priority_schools_json   STRING,            -- JSON array of school_ids
    recommendations_json    STRING,            -- JSON array of recommendation strings
    raw_gemini_json         STRING,            -- Full Gemini response for audit
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
CLUSTER BY district_code
OPTIONS (description = 'Gemini weekly district briefings — English + Marathi');

-- ── commute_cache ─────────────────────────────────────────────────────────────
-- Pre-computed Maps Distance Matrix results

CREATE TABLE IF NOT EXISTS `edualloc_dataset.commute_cache` (
    teacher_id              STRING  NOT NULL,
    school_id               STRING  NOT NULL,
    distance_km             FLOAT64 NOT NULL,
    duration_min            FLOAT64,
    mode                    STRING DEFAULT 'driving',
    computed_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
CLUSTER BY school_id
OPTIONS (description = 'Pre-computed driving distances for teacher-school pairs');

-- ── override_audit ────────────────────────────────────────────────────────────
-- Immutable officer override log — NEVER delete records from this table

CREATE TABLE IF NOT EXISTS `edualloc_dataset.override_audit` (
    audit_id                STRING  NOT NULL,  -- UUID v4
    deployment_id           STRING  NOT NULL,
    officer_id              STRING  NOT NULL,
    action                  STRING  NOT NULL,  -- 'APPROVE' | 'REJECT' | 'OVERRIDE'
    original_assignment     STRING,            -- JSON blob of original
    override_reason         STRING,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
OPTIONS (
    description = 'Immutable audit log for officer deployment overrides — append-only',
    require_partition_filter = FALSE
);
