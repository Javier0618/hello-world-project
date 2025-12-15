-- Create sections table for managing content sections on the homepage
CREATE TABLE public.sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('category', 'custom')),
  category text,
  position integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create section_items table for custom sections
CREATE TABLE public.section_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  item_id integer NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('movie', 'tv')),
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sections
CREATE POLICY "Public can view visible sections"
  ON public.sections FOR SELECT
  USING (visible = true);

CREATE POLICY "Admins can manage sections"
  ON public.sections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for section_items
CREATE POLICY "Public can view section items"
  ON public.section_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sections
      WHERE sections.id = section_items.section_id
      AND sections.visible = true
    )
  );

CREATE POLICY "Admins can manage section items"
  ON public.section_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better performance
CREATE INDEX idx_sections_position ON public.sections(position);
CREATE INDEX idx_section_items_section_id ON public.section_items(section_id);
CREATE INDEX idx_section_items_position ON public.section_items(section_id, position);

-- Add trigger for updated_at
CREATE TRIGGER update_sections_updated_at
  BEFORE UPDATE ON public.sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();