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
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260521_create_faqs_table.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running FAQ table migration...');
  
  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } else {
    console.log('✅ FAQ Migration successful!');
  }
}

runMigration();
