const { Client } = require('pg');

async function check() {
  const client = new Client({
    connectionString: 'postgresql://postgres:@localhost:5432/vero2'
  });
  
  try {
    await client.connect();
    
    // Check if table exists
    const tableRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'kyc_application'
      );
    `);
    console.log('Table exists:', tableRes.rows[0].exists);
    
    if (tableRes.rows[0].exists) {
      const data = await client.query('SELECT * FROM kyc_application');
      console.log('Rows in kyc_application:', data.rows.length);
      console.log('Data:', JSON.stringify(data.rows, null, 2));
    }

    const userData = await client.query('SELECT "userId", "kycStatus" FROM "user" WHERE "kycStatus" IS NOT NULL AND "kycStatus" != \'none\'');
    console.log('Users with kycStatus:', userData.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
