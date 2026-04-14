import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20240414000000_create_locked_dates.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running migration...');
  
  // Try to use a custom function to execute SQL if available, 
  // or just notify that table creation should be handled in Supabase Dashboard if this fails
  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    if (error.message.includes('not found')) {
      console.warn('⚠️ RPC "exec_sql" not found. Please run the migration manually in your Supabase SQL Editor:');
      console.log('---');
      console.log(sql);
      console.log('---');
    } else {
      console.error('Migration error:', error);
    }
  } else {
    console.log('✅ Migration successful!');
  }
}

runMigration();
