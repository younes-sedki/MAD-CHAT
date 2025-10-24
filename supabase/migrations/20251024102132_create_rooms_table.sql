/*
  # Create rooms table

  1. New Tables
    - `rooms`
      - `id` (uuid, primary key)
      - `city_name` (text, unique, required) - Name of the Moroccan city
      - `description` (text) - Optional room description
      - `member_count` (integer, default: 0) - Number of unique members who participated
      - `message_count` (integer, default: 0) - Total number of messages in room
      - `last_message_at` (timestamptz) - Timestamp of last message
      - `created_at` (timestamptz) - Room creation timestamp
  
  2. Security
    - Enable RLS on `rooms` table
    - Add policy for authenticated users to read all rooms
    - Add policy for authenticated users to create rooms
*/

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name text UNIQUE NOT NULL,
  description text DEFAULT '',
  member_count integer DEFAULT 0,
  message_count integer DEFAULT 0,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create rooms"
  ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rooms_city_name ON rooms(city_name);
CREATE INDEX IF NOT EXISTS idx_rooms_last_message_at ON rooms(last_message_at DESC);