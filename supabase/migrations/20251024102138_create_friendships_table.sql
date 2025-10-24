/*
  # Create friendships table

  1. New Tables
    - `friendships`
      - `id` (uuid, primary key)
      - `requester_id` (uuid, required, references profiles) - User who sent friend request
      - `recipient_id` (uuid, required, references profiles) - User who received request
      - `status` (text, required) - Request status: 'pending', 'accepted', 'rejected'
      - `created_at` (timestamptz) - Request creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `friendships` table
    - Add policy for users to view friendships where they are involved
    - Add policy for users to send friend requests
    - Add policy for recipients to update friendship status
  
  3. Notes
    - A unique constraint ensures no duplicate friendship requests between same users
    - Status can be 'pending', 'accepted', or 'rejected'
*/

CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, recipient_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid() AND requester_id != recipient_id);

CREATE POLICY "Recipients can update friendship status"
  ON friendships FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_recipient ON friendships(recipient_id, status);