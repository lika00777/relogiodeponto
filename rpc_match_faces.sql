-- Drop first to ensure clean state if signature changed slightly
drop function if exists match_profile_faces;

-- Create the function with SECURITY DEFINER to allow anonymous/public terminal to search faces
-- Also switched to Euclidean Distance (<->) which is better for face-api.js
create or replace function match_profile_faces (
  query_embedding vector(128),
  match_threshold float,
  match_count int
)
returns setof profiles
language plpgsql
security definer -- IMPORTANT: Bypasses RLS so the terminal can see faces without login
set search_path = public -- Secure search path
as $$
begin
  return query
  select *
  from profiles
  -- Use Euclidean distance (<->) instead of Cosine (<=>)
  where (face_embedding <-> query_embedding) < match_threshold
  order by face_embedding <-> query_embedding
  limit match_count;
end;
$$;
