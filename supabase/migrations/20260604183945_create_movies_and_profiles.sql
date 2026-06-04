/*
  # Create Netflix Clone Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `username` (text, unique)
      - `avatar_url` (text)
      - `created_at` (timestamptz)
    - `movies`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text)
      - `poster_url` (text)
      - `backdrop_url` (text)
      - `trailer_url` (text)
      - `category` (text, not null)
      - `rating` (text)
      - `year` (integer)
      - `duration` (text)
      - `maturity_rating` (text)
      - `is_trending` (boolean, default false)
      - `rank` (integer, default 0)
      - `created_at` (timestamptz)
    - `watchlist`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `movie_id` (uuid, references movies)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Profiles: users can read all, update own
    - Movies: public read access
    - Watchlist: users can manage their own entries

  3. Important Notes
    - Movies are publicly readable (no auth required to browse)
    - Watchlist requires authentication
    - Unique constraint on watchlist to prevent duplicate entries
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  poster_url text DEFAULT '',
  backdrop_url text DEFAULT '',
  trailer_url text DEFAULT '',
  category text NOT NULL,
  rating text DEFAULT '',
  year integer,
  duration text DEFAULT '',
  maturity_rating text DEFAULT '',
  is_trending boolean DEFAULT false,
  rank integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view movies"
  ON movies FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Only authenticated users can insert movies"
  ON movies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  movie_id uuid NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, movie_id)
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own watchlist"
  ON watchlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from own watchlist"
  ON watchlist FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
