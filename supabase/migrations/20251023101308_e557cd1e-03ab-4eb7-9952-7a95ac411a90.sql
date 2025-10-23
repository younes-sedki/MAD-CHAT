-- Add INSERT policy for chat_rooms so authenticated users can create rooms
CREATE POLICY "Authenticated users can create chat rooms"
ON public.chat_rooms
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);