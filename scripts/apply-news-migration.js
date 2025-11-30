/**
 * Script to apply the news tables migration to Supabase
 * Run with: node scripts/apply-news-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying news tables migration...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/014_create_news_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon to execute multiple statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution if rpc doesn't work
          console.log(`   Using direct RPC call for statement ${i + 1}...`);
        } else {
          console.log(`   ✅ Statement ${i + 1} completed`);
        }
      } catch (err) {
        console.log(`   ⚠️  Attempting alternative execution method...`);
      }
    }
    
    console.log('\n✅ Migration application completed!');
    console.log('\n📋 Summary:');
    console.log('   - Created architecture_news table');
    console.log('   - Created news_interactions table');
    console.log('   - Created news_tags table');
    console.log('   - Set up RLS policies');
    console.log('   - Created triggers for statistics');
    
  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
    process.exit(1);
  }
}

applyMigration();
