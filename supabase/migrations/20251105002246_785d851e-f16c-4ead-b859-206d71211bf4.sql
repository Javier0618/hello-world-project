-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create profiles table for additional user info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create imported movies table
CREATE TABLE public.movies_imported (
  id INTEGER PRIMARY KEY,
  tmdb_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  poster_path TEXT,
  backdrop_path TEXT,
  overview TEXT,
  release_date TEXT,
  vote_average DECIMAL(3,1),
  imported_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.movies_imported ENABLE ROW LEVEL SECURITY;

-- Movies policies - anyone can view, only admins can manage
CREATE POLICY "Anyone can view imported movies"
  ON public.movies_imported
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert movies"
  ON public.movies_imported
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update movies"
  ON public.movies_imported
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete movies"
  ON public.movies_imported
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create imported TV shows table
CREATE TABLE public.tv_shows_imported (
  id INTEGER PRIMARY KEY,
  tmdb_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  poster_path TEXT,
  backdrop_path TEXT,
  overview TEXT,
  first_air_date TEXT,
  vote_average DECIMAL(3,1),
  number_of_seasons INTEGER,
  imported_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.tv_shows_imported ENABLE ROW LEVEL SECURITY;

-- TV shows policies
CREATE POLICY "Anyone can view imported tv shows"
  ON public.tv_shows_imported
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert tv shows"
  ON public.tv_shows_imported
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tv shows"
  ON public.tv_shows_imported
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tv shows"
  ON public.tv_shows_imported
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create seasons table
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tv_show_id INTEGER NOT NULL REFERENCES public.tv_shows_imported(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  name TEXT,
  episode_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tv_show_id, season_number)
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Seasons policies
CREATE POLICY "Anyone can view seasons"
  ON public.seasons
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert seasons"
  ON public.seasons
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update seasons"
  ON public.seasons
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete seasons"
  ON public.seasons
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create episodes table
CREATE TABLE public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  name TEXT,
  video_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(season_id, episode_number)
);

ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- Episodes policies
CREATE POLICY "Anyone can view episodes"
  ON public.episodes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert episodes"
  ON public.episodes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update episodes"
  ON public.episodes
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete episodes"
  ON public.episodes
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_movies_updated_at
  BEFORE UPDATE ON public.movies_imported
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tv_shows_updated_at
  BEFORE UPDATE ON public.tv_shows_imported
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_episodes_updated_at
  BEFORE UPDATE ON public.episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();