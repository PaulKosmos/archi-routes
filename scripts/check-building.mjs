// Check if building exists with all required fields
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
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBuilding() {
  const buildingId = '17aff3e4-14da-46dc-8c91-600c2f2b14c9';

  console.log('🔍 Checking building:', buildingId);
  console.log('');

  // Check with all fields
  const { data: building, error } = await supabase
    .from('buildings')
    .select('id, name, architect, year_built, city, country, latitude, longitude, image_url, architectural_style')
    .eq('id', buildingId)
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!building) {
    console.log('❌ Building not found!');
    return;
  }

  console.log('✅ Building found:');
  console.log(JSON.stringify(building, null, 2));
  console.log('');

  // Check which fields are missing
  const requiredFields = ['latitude', 'longitude', 'name', 'id'];
  const missingFields = requiredFields.filter(field => !building[field]);

  if (missingFields.length > 0) {
    console.log('⚠️  Missing required fields:', missingFields);
  } else {
    console.log('✅ All required fields present');
  }

  // Test the .in() query that's failing
  console.log('');
  console.log('Testing .in() query...');
  const { data: buildings, error: inError } = await supabase
    .from('buildings')
    .select('id, name, architect, year_built, city, country, latitude, longitude, image_url, architectural_style')
    .in('id', [buildingId]);

  if (inError) {
    console.error('❌ .in() query error:', inError);
  } else {
    console.log('✅ .in() query result:', buildings?.length || 0, 'buildings');
    if (buildings && buildings.length > 0) {
      console.log(JSON.stringify(buildings[0], null, 2));
    }
  }
}

checkBuilding().catch(console.error);
