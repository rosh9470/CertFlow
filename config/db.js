const sql = require('mssql');

const config = {
  user: 'rrosh9470',
  password: 'Yadav9470@2001',
  server: 'MSI\\SQLEXPRESS',
  database: 'CertFlow',          
  options: {
    encrypt: false,               
    enableArithAbort: true,
    port: 1433          
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch(err => {
    console.error('Database Connection Failed!', err);
  });

module.exports = { sql, poolPromise };
