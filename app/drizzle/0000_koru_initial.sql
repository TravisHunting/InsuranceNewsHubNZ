CREATE TABLE `sources` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `enabled` integer DEFAULT true NOT NULL,
  `status` text DEFAULT 'not_tested' NOT NULL,
  `rights_mode` text NOT NULL,
  `last_attempt_at` text,
  `last_success_at` text,
  `last_http_status` integer,
  `consecutive_failures` integer DEFAULT 0 NOT NULL,
  `next_allowed_at` text,
  `robots_status` text DEFAULT 'not_checked' NOT NULL,
  `diagnostic` text,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `articles` (
  `id` text PRIMARY KEY NOT NULL, `source_id` text NOT NULL, `source_name` text NOT NULL,
  `discovered_url` text NOT NULL, `canonical_url` text NOT NULL, `final_response_url` text,
  `external_id` text, `title` text NOT NULL, `author` text, `published_at` text,
  `first_seen_at` text NOT NULL, `fetched_at` text, `last_checked_at` text,
  `primary_category` text NOT NULL, `categories` text NOT NULL, `themes` text NOT NULL,
  `entities` text NOT NULL, `insurers` text NOT NULL, `summary` text NOT NULL,
  `why_it_matters` text NOT NULL, `facts` text NOT NULL, `analyst_inference` text NOT NULL,
  `impact_score` integer DEFAULT 0 NOT NULL, `impact_direction` text NOT NULL,
  `nz_relevance_score` integer DEFAULT 0 NOT NULL, `confidence` integer DEFAULT 0 NOT NULL,
  `rights_mode` text NOT NULL, `content_hash` text, `duplicate_cluster_id` text,
  `data_quality_score` integer DEFAULT 0 NOT NULL, `enrichment_status` text DEFAULT 'basic' NOT NULL,
  `search_text` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_articles_canonical_url` ON `articles` (`canonical_url`);
--> statement-breakpoint
CREATE INDEX `idx_articles_published_at` ON `articles` (`published_at`);
--> statement-breakpoint
CREATE INDEX `idx_articles_category_impact` ON `articles` (`primary_category`,`impact_score`);
--> statement-breakpoint
CREATE INDEX `idx_articles_source_id` ON `articles` (`source_id`);
--> statement-breakpoint
CREATE TABLE `scrape_runs` (
  `id` text PRIMARY KEY NOT NULL, `status` text NOT NULL, `cursor` integer DEFAULT 0 NOT NULL,
  `total_sources` integer NOT NULL, `discovered` integer DEFAULT 0 NOT NULL,
  `fetched` integer DEFAULT 0 NOT NULL, `new_articles` integer DEFAULT 0 NOT NULL,
  `duplicates` integer DEFAULT 0 NOT NULL, `rejected` integer DEFAULT 0 NOT NULL,
  `errors` integer DEFAULT 0 NOT NULL, `created_at` text NOT NULL, `updated_at` text NOT NULL,
  `completed_at` text
);
--> statement-breakpoint
CREATE TABLE `scrape_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `run_id` text NOT NULL,
  `source_id` text NOT NULL, `url` text, `stage` text NOT NULL, `status` text NOT NULL,
  `http_status` integer, `error_type` text, `message` text NOT NULL,
  `duration_ms` integer NOT NULL, `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scrape_events_run` ON `scrape_events` (`run_id`);
--> statement-breakpoint
CREATE TABLE `reports` (
  `id` text PRIMARY KEY NOT NULL, `file_key` text NOT NULL, `filename` text NOT NULL,
  `title` text NOT NULL, `period` text, `publication_date` text, `page_count` integer NOT NULL,
  `extraction_status` text NOT NULL, `summary` text NOT NULL, `pages_json` text NOT NULL,
  `metrics_json` text NOT NULL, `created_at` text NOT NULL
);
