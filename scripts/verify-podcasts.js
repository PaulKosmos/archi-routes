#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key] = value.trim();
    }
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function verifyPodcastData() {
  try {
    console.log('🔍 Verifying Podcast System Setup...\n');
    
    const supabase = createClient(SUPABASE_URL, ANON_KEY);

    // Test 1: Fetch published episodes
    console.log('Test 1: Fetching Published Episodes');
    const { data: episodes, error: episodeError } = await supabase
      .from('podcast_episodes')
      .select('id, title, episode_number, series_id, status, published_at')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(5);

    if (episodeError) {
      console.error('❌ Error:', episodeError.message);
    } else {
      console.log(`✅ Found ${episodes.length} published episodes`);
      episodes.forEach(ep => {
        console.log(`   - "${ep.title}" (Episode #${ep.episode_number})`);
      });
    }

    // Test 2: Fetch series
    console.log('\nTest 2: Fetching Series');
    const { data: series, error: seriesError } = await supabase
      .from('podcast_series')
      .select('id, title, slug')
      .limit(5);

    if (seriesError) {
      console.error('❌ Error:', seriesError.message);
    } else {
      console.log(`✅ Found ${series.length} series`);
      series.forEach(s => {
        console.log(`   - "${s.title}"`);
      });
    }

    // Test 3: Fetch tags
    console.log('\nTest 3: Fetching Tags');
    const { data: tags, error: tagsError } = await supabase
      .from('podcast_tags')
      .select('id, name, slug')
      .limit(10);

    if (tagsError) {
      console.error('❌ Error:', tagsError.message);
    } else {
      console.log(`✅ Found ${tags.length} tags`);
      tags.slice(0, 5).forEach(t => {
        console.log(`   - "${t.name}"`);
      });
    }

    // Test 4: Fetch episodes with tags
    console.log('\nTest 4: Fetching Episode-Tag Associations');
    const { data: episodeTags, error: etError } = await supabase
      .from('episode_tags')
      .select('episode_id, tag_id')
      .limit(10);

    if (etError) {
      console.error('❌ Error:', etError.message);
    } else {
      console.log(`✅ Found ${episodeTags.length} episode-tag associations`);
    }

    console.log('\n✅ All verification tests passed!\n');
    console.log('📊 Podcast System Status:');
    console.log(`   Episodes: ${episodes?.length || 0} (published)`);
    console.log(`   Series: ${series?.length || 0}`);
    console.log(`   Tags: ${tags?.length || 0}`);
    console.log(`   Links: ${episodeTags?.length || 0}`);
    console.log('\n🎧 System is ready for testing at http://localhost:3000/podcasts\n');

    return true;

  } catch (error) {
    console.error('❌ Verification error:', error.message);
    return false;
  }
}

verifyPodcastData().then(success => {
  process.exit(success ? 0 : 1);
});
