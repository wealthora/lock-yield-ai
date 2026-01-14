-- Insert profile for existing user jakesopiyo@gmail.com
INSERT INTO profiles (user_id, email, first_name, created_at, updated_at)
VALUES ('d736474f-aa8b-474d-8487-81894c62d85d', 'jakesopiyo@gmail.com', 'Jake', now(), now())
ON CONFLICT (user_id) DO NOTHING;