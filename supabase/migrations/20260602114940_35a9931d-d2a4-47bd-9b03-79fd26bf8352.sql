
-- Make user/sender nullable and add guest tracking
ALTER TABLE public.chat_sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS guest_id uuid;
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS guest_email text;

ALTER TABLE public.chat_messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS guest_id uuid;

ALTER TABLE public.typing_indicators ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.typing_indicators ADD COLUMN IF NOT EXISTS guest_id uuid;

-- Grants for anon (guest visitors)
GRANT SELECT, INSERT, UPDATE ON public.chat_sessions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.typing_indicators TO anon;

-- Allow anon visitors to create / read / update their own guest sessions.
-- Session id is a UUID and is treated as the bearer secret for guest chats.
CREATE POLICY "Guests can create chat sessions"
  ON public.chat_sessions FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND guest_id IS NOT NULL);

CREATE POLICY "Guests can view guest chat sessions"
  ON public.chat_sessions FOR SELECT TO anon
  USING (user_id IS NULL AND guest_id IS NOT NULL);

CREATE POLICY "Guests can update guest chat sessions"
  ON public.chat_sessions FOR UPDATE TO anon
  USING (user_id IS NULL AND guest_id IS NOT NULL);

-- Messages for guest sessions
CREATE POLICY "Guests can send messages to guest sessions"
  ON public.chat_messages FOR INSERT TO anon
  WITH CHECK (
    sender_role = 'user'
    AND sender_id IS NULL
    AND guest_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = chat_messages.session_id
        AND s.user_id IS NULL
        AND s.guest_id IS NOT NULL
    )
  );

CREATE POLICY "Guests can view messages in guest sessions"
  ON public.chat_messages FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = chat_messages.session_id
        AND s.user_id IS NULL
        AND s.guest_id IS NOT NULL
    )
  );

CREATE POLICY "Guests can update messages in guest sessions"
  ON public.chat_messages FOR UPDATE TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = chat_messages.session_id
        AND s.user_id IS NULL
        AND s.guest_id IS NOT NULL
    )
  );

-- Typing indicators
CREATE POLICY "Guests can manage typing in guest sessions"
  ON public.typing_indicators FOR ALL TO anon
  USING (
    guest_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = typing_indicators.session_id
        AND s.user_id IS NULL
    )
  )
  WITH CHECK (
    guest_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = typing_indicators.session_id
        AND s.user_id IS NULL
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
