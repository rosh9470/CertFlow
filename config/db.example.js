const sql = require('mssql');

const config = {
  user: '',
  password: '',
  server: '',
  database: '',          
  options: {
    encrypt: false,               
    enableArithAbort: true,
    port: ''          
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
