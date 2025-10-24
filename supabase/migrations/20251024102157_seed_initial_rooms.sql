/*
  # Seed initial chat rooms for Moroccan cities

  1. Data
    - Creates initial rooms for major Moroccan cities
    - Each room is tied to a specific city
  
  2. Notes
    - Uses INSERT ... ON CONFLICT to make this migration idempotent
    - Rooms can be created later by users if needed
*/

INSERT INTO rooms (city_name, description) VALUES
  ('Casablanca', 'Chat room for Casablanca residents'),
  ('Rabat', 'Chat room for Rabat residents'),
  ('Marrakech', 'Chat room for Marrakech residents'),
  ('Fes', 'Chat room for Fes residents'),
  ('Tangier', 'Chat room for Tangier residents'),
  ('Agadir', 'Chat room for Agadir residents'),
  ('Meknes', 'Chat room for Meknes residents'),
  ('Oujda', 'Chat room for Oujda residents'),
  ('Kenitra', 'Chat room for Kenitra residents'),
  ('Tetouan', 'Chat room for Tetouan residents')
ON CONFLICT (city_name) DO NOTHING;