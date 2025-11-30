// Test script: Link a building to Berlin news article
// Run with: node scripts/test-building-news-link.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🧪 Testing Building-News Integration (Stage 6)');
  console.log('='.repeat(60));

  // 1. Get Berlin news article
  const { data: newsArticle, error: newsError } = await supabase
    .from('architecture_news')
    .select('id, title, slug')
    .eq('slug', 'sustainable-architecture-berlin-2025')
    .single();

  if (newsError || !newsArticle) {
    console.error('❌ Berlin news article not found:', newsError);
    return;
  }

  console.log('✅ Found Berlin news article:');
  console.log('   ID:', newsArticle.id);
  console.log('   Title:', newsArticle.title);
  console.log('');

  // 2. Get or create a test building in Berlin
  let buildingId;

  // Check if test building already exists
  const { data: existingBuilding } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('name', 'Берлинский центр устойчивой архитектуры')
    .eq('city', 'Берлин')
    .single();

  if (existingBuilding) {
    buildingId = existingBuilding.id;
    console.log('✅ Using existing building:');
    console.log('   ID:', buildingId);
    console.log('   Name:', existingBuilding.name);
  } else {
    // Get a user ID for created_by
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    // Create new building
    const { data: newBuilding, error: buildingError } = await supabase
      .from('buildings')
      .insert({
        name: 'Берлинский центр устойчивой архитектуры',
        city: 'Берлин',
        country: 'Германия',
        latitude: 52.5200,
        longitude: 13.4050,
        description: 'Инновационный центр, демонстрирующий концепции устойчивого строительства с использованием 100% переработанных материалов. Здание является примером применения новых энергоэффективных решений.',
        architect: 'Schmidt & Partners',
        year_built: 2025,
        architectural_style: 'Современная архитектура',
        image_url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        created_by: user?.id,
        moderation_status: 'approved'
      })
      .select()
      .single();

    if (buildingError) {
      console.error('❌ Error creating building:', buildingError);
      return;
    }

    buildingId = newBuilding.id;
    console.log('✅ Created new building:');
    console.log('   ID:', buildingId);
    console.log('   Name:', newBuilding.name);

    // Обновляем статус модерации на 'approved' (триггер мог установить 'pending')
    const { error: approveError } = await supabase
      .from('buildings')
      .update({ moderation_status: 'approved' })
      .eq('id', buildingId);

    if (approveError) {
      console.error('⚠️  Warning: Could not approve building:', approveError);
    } else {
      console.log('✅ Building moderation status set to approved');
    }
  }

  console.log('');

  // 3. Link building to news article using related_buildings array
  console.log('Updating related_buildings array...');

  const { data: updatedNews, error: updateError } = await supabase
    .from('architecture_news')
    .update({
      related_buildings: [buildingId]
    })
    .eq('id', newsArticle.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating related_buildings:');
    console.error('   Code:', updateError.code);
    console.error('   Message:', updateError.message);
    console.error('   Details:', updateError.details);
    return;
  }

  console.log('✅ Successfully linked building to news article');
  console.log('   Related buildings:', updatedNews.related_buildings);

  console.log('');

  // 4. Verify the link
  const { data: verification, error: verifyError } = await supabase
    .from('architecture_news')
    .select('id, title, related_buildings')
    .eq('id', newsArticle.id)
    .single();

  if (verifyError) {
    console.error('❌ Error verifying link:', verifyError);
    return;
  }

  console.log('✅ Verification successful:');
  console.log('   News:', verification.title);
  console.log('   Related buildings:', verification.related_buildings);
  console.log('');

  // 5. Test API endpoint
  console.log('🧪 Testing API endpoint /api/buildings/' + buildingId + '/news');

  const response = await fetch(`http://localhost:3000/api/buildings/${buildingId}/news`);
  const apiResult = await response.json();

  if (apiResult.success) {
    console.log('✅ API endpoint works!');
    console.log('   Found', apiResult.count, 'news article(s)');
    if (apiResult.news.length > 0) {
      console.log('   News titles:');
      apiResult.news.forEach(n => console.log('   -', n.title));
    }
  } else {
    console.error('❌ API endpoint failed:', apiResult.error);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Stage 6 Integration Test Complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Open http://localhost:3000/news/sustainable-architecture-berlin-2025');
  console.log('2. Verify that the building appears on the map');
  console.log('3. Click on the map marker to test interactivity');
}

main().catch(console.error);
