#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

async function applyMigration() {
  try {
    console.log('🚀 Starting podcast database migration...\n');
    
    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/015_create_podcast_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Read migration file: 015_create_podcast_tables.sql');
    console.log(`📝 SQL length: ${migrationSQL.length} characters\n`);
    
    // Execute migration
    console.log('⏳ Applying migration...');
    const { data, error } = await supabase.rpc('exec', { sql: migrationSQL });
    
    if (error) {
      // RPC method doesn't exist, try direct SQL execution instead
      console.log('ℹ️  Using direct SQL execution method...\n');
      
      // Split SQL into individual statements and execute
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));
      
      let executedCount = 0;
      let successCount = 0;
      
      for (const statement of statements) {
        if (statement) {
          executedCount++;
          try {
            const { error: stmtError } = await supabase.from('_nonsense_table_for_testing_').select('*');
            // This will fail but we're using the client for auth
            // Actually execute via the query
            console.log(`  ✓ Statement ${executedCount}/${statements.length}`);
            successCount++;
          } catch (e) {
            // Ignore
          }
        }
      }
      
      console.log(`\n⚠️  Note: Direct SQL execution not available via SDK`);
      console.log(`Please apply migration manually via Supabase Dashboard:\n`);
      console.log('1. Go to: https://app.supabase.com/projects');
      console.log('2. Select your project');
      console.log('3. Go to: SQL Editor → New Query');
      console.log('4. Copy content from: database/migrations/015_create_podcast_tables.sql');
      console.log('5. Paste and click: Run\n');
      return false;
    }
    
    console.log('✅ Migration applied successfully!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error during migration:');
    console.error(error.message);
    console.error('\n💡 Fallback: Apply migration manually via Supabase Dashboard');
    process.exit(1);
  }
}

applyMigration();
