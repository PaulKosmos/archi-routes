// Check building moderation status
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;

// Test with anon key (like the browser)
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Test with service key (like the test script)
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

async function checkBuilding() {
  const buildingId = '17aff3e4-14da-46dc-8c91-600c2f2b14c9';

  console.log('🔍 Checking building moderation status');
  console.log('='.repeat(60));
  console.log('');

  // Check with service key
  console.log('1️⃣  Using SERVICE KEY (like test script):');
  const { data: serviceData, error: serviceError } = await supabaseService
    .from('buildings')
    .select('id, name, moderation_status, created_by')
    .eq('id', buildingId)
    .single();

  if (serviceError) {
    console.error('❌ Error:', serviceError);
  } else if (serviceData) {
    console.log('✅ Building found');
    console.log('   Name:', serviceData.name);
    console.log('   Moderation status:', serviceData.moderation_status);
    console.log('   Created by:', serviceData.created_by);
  }

  console.log('');

  // Check with anon key (unauthenticated)
  console.log('2️⃣  Using ANON KEY (like browser - unauthenticated):');
  const { data: anonData, error: anonError } = await supabaseAnon
    .from('buildings')
    .select('id, name, moderation_status, created_by')
    .eq('id', buildingId)
    .single();

  if (anonError) {
    console.error('❌ Error:', anonError);
  } else if (anonData) {
    console.log('✅ Building found');
    console.log('   Name:', anonData.name);
    console.log('   Moderation status:', anonData.moderation_status);
  } else {
    console.log('❌ Building not found (filtered by RLS)');
  }

  console.log('');

  // Test the .in() query with anon key
  console.log('3️⃣  Testing .in() query with ANON KEY:');
  const { data: anonBuildings, error: anonInError } = await supabaseAnon
    .from('buildings')
    .select('id, name, architect, year_built, city, country, latitude, longitude, image_url, architectural_style')
    .in('id', [buildingId]);

  if (anonInError) {
    console.error('❌ Error:', anonInError);
  } else {
    console.log(`✅ Found ${anonBuildings?.length || 0} buildings`);
    if (anonBuildings && anonBuildings.length > 0) {
      console.log('   Building:', anonBuildings[0].name);
    }
  }

  console.log('');
  console.log('='.repeat(60));
}

checkBuilding().catch(console.error);
