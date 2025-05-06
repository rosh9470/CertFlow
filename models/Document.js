// models/Document.js
const { sql, poolPromise } = require('../config/db');

// Insert a new document record
async function addDocument({ userId, title, description, fileUrl, status }) {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('title', sql.VarChar, title)
      .input('description', sql.VarChar, description)
      .input('fileUrl', sql.VarChar, fileUrl)
      .input('status', sql.VarChar, status)
      .query(`
        INSERT INTO Documents (userId, title, description, fileUrl, status, uploadDate)
        VALUES (@userId, @title, @description, @fileUrl, @status, GETDATE());
        SELECT SCOPE_IDENTITY() as id;
      `);
    return result.recordset[0];
  } catch (err) {
    console.error("Error in addDocument:", err);
    throw err;
  }
}

// Retrieve documents for a specific user
async function getDocumentsByUserId(userId) {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM Documents WHERE userId = @userId ORDER BY uploadDate DESC');
    return result.recordset;
  } catch (err) {
    console.error("Error in getDocumentsByUserId:", err);
    throw err;
  }
}

// Retrieve all documents (for admin view)
async function getAllDocuments() {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT * FROM Documents ORDER BY uploadDate DESC');
    return result.recordset;
  } catch (err) {
    console.error("Error in getAllDocuments:", err);
    throw err;
  }
}

// Update document status (for rejections, for example)
async function updateDocumentStatus(documentId, status) {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('documentId', sql.Int, documentId)
      .input('status', sql.VarChar, status)
      .query('UPDATE Documents SET status = @status WHERE id = @documentId');
    return true;
  } catch (err) {
    console.error("Error in updateDocumentStatus:", err);
    throw err;
  }
}

async function requestMoreInfo(documentId, adminNotes) {
  try {
  const pool = await poolPromise;
  return pool.request()
    .input('documentId', sql.Int, documentId)
    .input('adminNotes', sql.NVarChar, adminNotes)
    .input('status',    sql.VarChar,  'needs_info')
    .query(`
      UPDATE Documents
      SET status     = @status,
          adminNotes = @adminNotes
      WHERE id = @documentId;
    `);
  } catch (err) {
    console.error("Error in requestMoreInfo:", err);
    throw err;
  }
}

async function addAdditionalDocument(documentId, fileUrl) {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('documentId', sql.Int, documentId)
      .input('fileUrl',      sql.VarChar, fileUrl)
      .query(`
        UPDATE Documents
        SET fileUrl      = @fileUrl,
            status       = 'pending'
        WHERE id = @documentId;
      `);
    return true;
  } catch (err) {
    console.error('Error in addAdditionalDocument:', err);
    throw err;
  }
}

// Update document status and certificateUrl (for when a document is approved)
async function updateDocumentWithCertificate(documentId, status, certificateUrl, businessName) {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('documentId', sql.Int, documentId)
      .input('status', sql.VarChar, status)
      .input('certificateUrl', sql.VarChar, certificateUrl)
      .input('businessName', sql.NVarChar, businessName)
      .query(`
         UPDATE Documents 
         SET status = @status, certificateUrl = @certificateUrl, businessName   = @businessName
         WHERE id = @documentId;
      `);
    return true;
  } catch (err) {
    console.error("Error in updateDocumentWithCertificate:", err);
    throw err;
  }
}

module.exports = { 
  addDocument,
  getDocumentsByUserId,
  getAllDocuments,
  updateDocumentStatus,
  updateDocumentWithCertificate,
  requestMoreInfo,
  addAdditionalDocument,
};
