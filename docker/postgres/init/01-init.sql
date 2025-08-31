-- Initialize CV Scanner Database
-- This script runs when the PostgreSQL container is first created

-- Create the database if it doesn't exist
-- Note: The database is already created by POSTGRES_DB environment variable

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the main schema (if not using 'public')
-- CREATE SCHEMA IF NOT EXISTS cv_scanner;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;

-- Schema is owned by migrations. Do not create application tables here.

-- Insert some initial data if needed (development only)
-- INSERT INTO users (email, password, full_name) VALUES 
-- ('admin@example.com', crypt('admin123', gen_salt('bf')), 'Admin User')
-- ON CONFLICT (email) DO NOTHING;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
