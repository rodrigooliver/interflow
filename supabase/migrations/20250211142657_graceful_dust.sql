-- Add language field to profiles table
ALTER TABLE profiles
ADD COLUMN language TEXT DEFAULT 'pt';

-- Create index for better performance
CREATE INDEX profiles_language_idx ON profiles(language);

-- Update existing profiles to use default language
UPDATE profiles SET language = 'pt' WHERE language IS NULL;