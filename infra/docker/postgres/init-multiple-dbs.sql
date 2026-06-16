-- ─────────────────────────────────────────────────────────────
-- irno-platform — PostgreSQL multi-database init script
-- Runs once on first container start (docker-entrypoint-initdb.d/).
-- Creates separate databases for Hub and Meetino.
-- Both owned by the same user (irno) for local dev simplicity.
-- In production, use separate users and separate RDS/postgres instances.
-- ─────────────────────────────────────────────────────────────

-- Hub database (already created by POSTGRES_DB env var — ensure it exists)
SELECT 'CREATE DATABASE irno_hub'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'irno_hub')\gexec

-- Meetino database
SELECT 'CREATE DATABASE meetino_db'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'meetino_db')\gexec

-- Grant all to irno user on both databases
GRANT ALL PRIVILEGES ON DATABASE irno_hub TO irno;
GRANT ALL PRIVILEGES ON DATABASE meetino_db TO irno;
