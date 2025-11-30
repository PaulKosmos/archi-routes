#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
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
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

async function setupStorage() {
  try {
    console.log('🚀 Setting up Supabase Storage for podcasts...\n');
    
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if bucket exists
    console.log('📦 Checking for "podcasts" bucket...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return false;
    }

    const podcastBucket = buckets?.find(b => b.name === 'podcasts');
    
    if (podcastBucket) {
      console.log('✅ Bucket "podcasts" already exists');
      console.log(`   Public: ${podcastBucket.public}`);
    } else {
      console.log('📝 Creating "podcasts" bucket...');
      const { error: createError } = await supabase.storage.createBucket('podcasts', {
        public: true,
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError.message);
        return false;
      }
      console.log('✅ Bucket "podcasts" created successfully');
    }

    // Create folders
    console.log('\n📁 Setting up storage folders...');
    
    const folders = ['audio', 'covers', 'thumbnails'];
    
    for (const folder of folders) {
      console.log(`   Creating "${folder}/" folder...`);
      // Supabase doesn't have explicit folder creation, but we can create a .gitkeep file
      const { error: uploadError } = await supabase.storage
        .from('podcasts')
        .upload(`${folder}/.gitkeep`, new File([''], '.gitkeep'), {
          upsert: true,
        });

      if (uploadError && !uploadError.message.includes('already exists')) {
        console.warn(`   ⚠️  Warning: ${uploadError.message}`);
      } else {
        console.log(`   ✅ "${folder}/" folder ready`);
      }
    }

    console.log('\n✅ Storage setup complete!\n');
    console.log('📦 Storage structure:');
    console.log('   podcasts/');
    console.log('   ├── audio/        # Audio files');
    console.log('   ├── covers/       # Cover images');
    console.log('   └── thumbnails/   # Thumbnail images');
    
    return true;

  } catch (error) {
    console.error('❌ Error during storage setup:');
    console.error(error.message);
    return false;
  }
}

setupStorage().then(success => {
  process.exit(success ? 0 : 1);
});
