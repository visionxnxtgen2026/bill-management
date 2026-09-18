const { Pool } = require('pg');

const ref = 'gjhuoxitxuwrzyyoenow';
const password = 'sanjai@20060305';
const encodedPassword = encodeURIComponent(password);

// Supabase AWS regions
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
  const username = `postgres.${ref}`;
  const connectionString6543 = `postgresql://${username}:${encodedPassword}@${host}:6543/postgres`;
  const connectionString5432 = `postgresql://${username}:${encodedPassword}@${host}:5432/postgres`;

  process.stdout.write(`Testing region: ${region} (${host})... `);

  // Test 6543 (Transaction Pooler - standard for serverless Vercel)
  const pool6543 = new Pool({
    connectionString: connectionString6543,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 4000,
  });

  try {
    const res = await pool6543.query('SELECT NOW() AS now, current_database() AS db');
    console.log(`\n🎉 FOUND CORRECT REGION: ${region}!`);
    console.log(`✓ Port 6543 (Transaction Pooler): Connected successfully! DB: ${res.rows[0].db}`);
    await pool6543.end();
    return { region, host, port: 6543, poolerUri: connectionString6543, poolerUriSession: connectionString5432 };
  } catch (err) {
    // try 5432
    await pool6543.end().catch(() => {});
  }

  const pool5432 = new Pool({
    connectionString: connectionString5432,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 4000,
  });

  try {
    const res = await pool5432.query('SELECT NOW() AS now, current_database() AS db');
    console.log(`\n🎉 FOUND CORRECT REGION: ${region}!`);
    console.log(`✓ Port 5432 (Session Pooler): Connected successfully! DB: ${res.rows[0].db}`);
    await pool5432.end();
    return { region, host, port: 5432, poolerUri: connectionString6543, poolerUriSession: connectionString5432 };
  } catch (err) {
    console.log('failed.');
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
      console.log('EXACT SUPABASE CONNECTION POOLER DETAILS (IPv4 COMPATIBLE):');
      console.log(`Region: ${found.region}`);
      console.log(`Host: ${found.host}`);
      console.log(`Port: 6543 (Transaction mode) / 5432 (Session mode)`);
      console.log(`Username: postgres.${ref}`);
      console.log(`Database: postgres`);
      console.log(`Transaction Mode URI (for Vercel Serverless / Express):`);
      console.log(`postgresql://postgres.${ref}:${encodedPassword}@${found.host}:6543/postgres`);
      console.log(`Session Mode URI:`);
      console.log(`postgresql://postgres.${ref}:${encodedPassword}@${found.host}:5432/postgres`);
      console.log('======================================================\n');
      return found;
    }
  }
  console.log('No matching pooler found among tested regions.');
}

findWorkingPooler().catch(console.error);
