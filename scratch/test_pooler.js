const { Pool } = require('pg');
const dns = require('dns');

const ref = 'gjhuoxitxuwrzyyoenow';
const password = 'sanjai@20060305';
const encodedPassword = encodeURIComponent(password);

// Common Supabase AWS regions
const regions = [
  'ap-south-1',     // Mumbai (India)
  'ap-southeast-1', // Singapore
  'ap-northeast-1', // Tokyo
  'us-east-1',     // North Virginia
  'us-east-2',     // Ohio
  'us-west-1',     // North California
  'us-west-2',     // Oregon
  'eu-central-1',  // Frankfurt
  'eu-west-1',     // Ireland
  'eu-west-2',     // London
  'ca-central-1',  // Canada
  'sa-east-1',     // Sao Paulo
  'ap-southeast-2'  // Sydney
];

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  
  // Transaction pooler (6543) and Session pooler (5432)
  // For Supabase connection pooler, username format MUST be: postgres.<project-ref>
  const username = `postgres.${ref}`;
  const connectionString6543 = `postgresql://${username}:${encodedPassword}@${host}:6543/postgres`;
  const connectionString5432 = `postgresql://${username}:${encodedPassword}@${host}:5432/postgres`;

  console.log(`Testing region: ${region} (${host})...`);

  // Test 6543
  const pool6543 = new Pool({
    connectionString: connectionString6543,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    const res = await pool6543.query('SELECT NOW() AS now, current_database() AS db');
    console.log(`\n🎉 FOUND CORRECT REGION: ${region}!`);
    console.log(`✓ Port 6543 (Transaction Pooler): Connected successfully! Time: ${res.rows[0].now}, DB: ${res.rows[0].db}`);
    await pool6543.end();
    return { region, host, port: 6543, poolerUri: connectionString6543 };
  } catch (err) {
    // console.log(`   6543 failed: ${err.message}`);
    await pool6543.end().catch(() => {});
  }

  // Test 5432
  const pool5432 = new Pool({
    connectionString: connectionString5432,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    const res = await pool5432.query('SELECT NOW() AS now, current_database() AS db');
    console.log(`\n🎉 FOUND CORRECT REGION: ${region}!`);
    console.log(`✓ Port 5432 (Session Pooler): Connected successfully! Time: ${res.rows[0].now}, DB: ${res.rows[0].db}`);
    await pool5432.end();
    return { region, host, port: 5432, poolerUri: connectionString5432 };
  } catch (err) {
    // console.log(`   5432 failed: ${err.message}`);
    await pool5432.end().catch(() => {});
  }

  return null;
}

async function findWorkingPooler() {
  console.log('Searching for Supabase Pooler region for project:', ref);
  for (const r of regions) {
    const found = await testRegion(r);
    if (found) {
      console.log('\n======================================================');
      console.log('EXACT SUPABASE CONNECTION POOLER DETAILS:');
      console.log(`Region: ${found.region}`);
      console.log(`Host: ${found.host}`);
      console.log(`Port: ${found.port}`);
      console.log(`Username: postgres.${ref}`);
      console.log(`Database: postgres`);
      console.log(`Masked URI: postgresql://postgres.${ref}:***@${found.host}:${found.port}/postgres`);
      console.log('======================================================\n');
      return found;
    }
  }
  console.log('No matching pooler found among tested regions.');
}

findWorkingPooler().catch(console.error);
