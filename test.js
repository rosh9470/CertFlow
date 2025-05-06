const sql = require('mssql');

const config = {
  user: 'rrosh94700',
  password: 'Yadav9470@2001',
  server: 'localhost', // or 127.0.0.1
  database: 'CertFlow',
  options: {
    encrypt: false,
    enableArithAbort: true,
  }
};

sql.connect(config).then(pool => {
  console.log('✅ Connected successfully!');
  return pool.close();
}).catch(err => {
  console.error('❌ Connection failed:', err);
});
