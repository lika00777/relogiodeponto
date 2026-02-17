import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Use ANON key as standard client would, or service role if needed

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmbeddings() {
  console.log('--- Debug: Checking Face Embeddings ---');
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, face_embedding');

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('No profiles found in database.');
    return;
  }

  console.log(`Found ${profiles.length} profiles.`);
  
  let validEmbeddings = 0;
  
  profiles.forEach(p => {
    let status = '❌ Missing';
    let length = 0;

    if (p.face_embedding) {
      try {
        // Supabase returns vector as string or array depending on client/version
        let descriptor = p.face_embedding;
        if (typeof descriptor === 'string') {
           // Parse string vector format '[0.1, 0.2, ...]'
           descriptor = JSON.parse(descriptor);
        }
        
        if (Array.isArray(descriptor)) {
            length = descriptor.length;
            if (length === 128) {
                status = '✅ Valid (128 dims)';
                validEmbeddings++;
            } else {
                status = `⚠️ Invalid Length (${length})`;
            }
        } else {
             status = '⚠️ Not an array';
        }
      } catch (e) {
        status = '⚠️ Parse Error';
      }
    }
    
    console.log(`- ${p.full_name} (${p.role}): ${status}`);
  });
  
  console.log(`\nSummary: ${validEmbeddings} valid embeddings out of ${profiles.length} profiles.`);
  
  // Test RPC call if valid embeddings exist
  if (validEmbeddings > 0) {
      console.log('\n--- Testing RPC Call (match_profile_faces) ---');
      // Create a dummy query vector (zeros) just to see if function exists/runs
      // Note: This won't match anything, but checks if function crashes
      const dummyVector = new Array(128).fill(0.01);
      
      const { data, error: rpcError } = await supabase.rpc('match_profile_faces', {
        query_embedding: dummyVector,
        match_threshold: 0.99, // Super high threshold should theoretically return something if distance calc works (dependent on metric)
        match_count: 1
      });
      
      if (rpcError) {
          console.error('RPC Error:', rpcError);
          console.log('Suggestion: The function match_profile_faces might not exist or has signature mismatch.');
      } else {
          console.log('RPC Success (Empty result expected): Function exists and runs.');
          console.log('Result:', data);
      }
  }
}

checkEmbeddings();
