/*
  # Create messages table

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `content` (text, required) - Message content
      - `sender_id` (uuid, required, references profiles) - Message sender
      - `room_id` (uuid, references rooms) - Room ID for public messages
      - `recipient_id` (uuid, references profiles) - Recipient ID for private messages
      - `is_private` (boolean, default: false) - Whether message is private
      - `created_at` (timestamptz) - Message creation timestamp
  
  2. Security
    - Enable RLS on `messages` table
    - Add policy for users to view public messages in rooms
    - Add policy for users to view private messages where they are sender or recipient
    - Add policy for authenticated users to send messages
  
  3. Notes
    - Either room_id OR recipient_id should be set, not both
    - Public messages have room_id and is_private=false
    - Private messages have recipient_id and is_private=true
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  is_private boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public room messages"
  ON messages FOR SELECT
  TO authenticated
  USING (is_private = false AND room_id IS NOT NULL);

CREATE POLICY "Users can view their private messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    is_private = true 
    AND (sender_id = auth.uid() OR recipient_id = auth.uid())
  );

CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_private ON messages(sender_id, recipient_id, created_at DESC) WHERE is_private = true;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);