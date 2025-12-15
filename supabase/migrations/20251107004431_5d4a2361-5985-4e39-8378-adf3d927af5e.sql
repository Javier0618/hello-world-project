-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view imported movies" ON public.movies_imported;
DROP POLICY IF EXISTS "Anyone can view imported tv shows" ON public.tv_shows_imported;
DROP POLICY IF EXISTS "Anyone can view seasons" ON public.seasons;
DROP POLICY IF EXISTS "Anyone can view episodes" ON public.episodes;

-- Create new policies that work for both authenticated and anonymous users
CREATE POLICY "Public can view movies"
  ON public.movies_imported
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view tv shows"
  ON public.tv_shows_imported
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view seasons"
  ON public.seasons
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view episodes"
  ON public.episodes
  FOR SELECT
  TO public
  USING (true);