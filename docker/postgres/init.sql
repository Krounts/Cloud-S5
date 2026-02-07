-- Create the cloud_user database if it doesn't exist
-- This script runs in the default postgres database, so we create our app database here
CREATE DATABASE cloud_user;
\c cloud_user

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin')),
  is_locked BOOLEAN DEFAULT false,
  failed_login_attempts INTEGER DEFAULT 0,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'closed')),
  area_m2 DECIMAL(10, 2),
  budget DECIMAL(15, 2),
  company VARCHAR(255),
  photos JSONB DEFAULT '[]'::jsonb,
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create sessions table for tracking
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_location ON reports(latitude, longitude);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);

-- Create default manager account
INSERT INTO users (email, password_hash, first_name, last_name, role, created_at)
VALUES (
  'manager@cloud-s5.local',
  '$2y$10$ktqRgL.b8yWkVzT//RLdT.1Eu3QmH.FHKklNz/YdNIdTBC3wK.q.m', -- cryptage io fa 'manager123'
  'Manager',
  'Default',
  'manager',
  NOW()
) ON CONFLICT (email) DO NOTHING;
