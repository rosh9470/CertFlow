const { sql, poolPromise } = require('../config/db');

// Retrieve a user record by email
async function getUserByEmail(email) {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Users WHERE email = @email');
    return result.recordset[0];
  } catch (err) {
    console.error("Error in getUserByEmail:", err);
    throw err;
  }
}

// Insert a new user record into the database
async function createUser({ name, email, password, role = 'user' }) {
  try {
    const pool = await poolPromise;
    // NOTE: For production, hash the password before storing!
    const result = await pool.request()
      .input('name', sql.VarChar, name)
      .input('email', sql.VarChar, email)
      .input('password', sql.VarChar, password)
      .input('role', sql.VarChar, role)
      .query(`
        INSERT INTO Users (name, email, password, role)
        VALUES (@name, @email, @password, @role);
        SELECT SCOPE_IDENTITY() as id;
      `);
    return result.recordset[0];
  } catch (err) {
    console.error("Error in createUser:", err);
    throw err;
  }
}

module.exports = { getUserByEmail, createUser };
