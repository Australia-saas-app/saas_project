const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'admin',
  password: 'adminpassword',
  database: 'saas_db'
});

async function run() {
  const res = await pool.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE column_name IN ('userId', 'user_id', 'businessUserId', 'referredUserId', 'referrerId', 'ownerId', 'senderId', 'receiverId', 'authorId', 'adminId') 
    AND table_schema = 'public';
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
run();
