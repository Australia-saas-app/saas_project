import * as fs from 'fs';
import * as path from 'path';

const getForeignKeys = async () => {
  const m = await import('./src/data-source.js');
  const ds = m.default;
  await ds.initialize();
  
  const query = `
    SELECT 
      conname, 
      conrelid::regclass AS table_from, 
      a.attname AS column_from, 
      confrelid::regclass AS table_to, 
      af.attname AS column_to 
    FROM pg_constraint c 
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid 
    JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid 
    WHERE confrelid = 'users'::regclass;
  `;
  
  const res = await ds.query(query);
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
};

getForeignKeys().catch(console.error);
