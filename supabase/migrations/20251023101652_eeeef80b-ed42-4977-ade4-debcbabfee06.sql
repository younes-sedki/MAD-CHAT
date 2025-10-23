-- Add RLS policies for private chat rooms
-- Allow users to view private rooms they're part of
CREATE POLICY "Users can view their private rooms"
ON public.chat_rooms
FOR SELECT
USING (
  is_private = true 
  AND (
    name LIKE auth.uid()::text || '_%'
    OR name LIKE '%_' || auth.uid()::text
  )
);

-- Allow users to view messages in private rooms they're part of
CREATE POLICY "Users can view messages in their private rooms"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE chat_rooms.id = messages.room_id
    AND chat_rooms.is_private = true
    AND (
      chat_rooms.name LIKE auth.uid()::text || '_%'
      OR chat_rooms.name LIKE '%_' || auth.uid()::text
    )
  )
);