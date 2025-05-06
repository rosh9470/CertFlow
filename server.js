const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { addDocument, getDocumentsByUserId, getAllDocuments, updateDocumentStatus, updateDocumentWithCertificate, requestMoreInfo, addAdditionalDocument } = require('./models/Document');
const { sql, poolPromise } = require('./config/db');


const app = express();
const port = process.env.PORT || 5000;

// Mount authentication routes
const authRoutes = require('./routes/auth');
const { sessions } = require('./controllers/authController');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/certificates', express.static(path.join(__dirname, 'certificates')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Use auth routes under /auth
app.use('/auth', authRoutes);

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Create certificates folder if it doesn't exist
const certDir = path.join(__dirname, 'certificates');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

// Simple authentication middleware that checks the session cookie
const authenticate = (req, res, next) => {
  const sessionId = req.cookies.sessionId;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  req.user = sessions[sessionId];
  next();
};

// Routes to render pages
app.get('/', (req, res) => {
  res.render('index');
});
app.get('/login', (req, res) => {
  res.render('login');
});
app.get('/register', (req, res) => {
  res.render('register');
});

// Document upload endpoint
app.post('/documents/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    // Insert document record with initial status "pending"
    const newDoc = await addDocument({
      userId: parseInt(req.user.id, 10),
      title,
      description,
      fileUrl,
      status: 'pending'
    });
    res.status(201).json({ success: true, document: newDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post(
  '/documents/:id/additional',
  authenticate,
  upload.single('file'),
  async (req, res) => {
    try {
      const documentId = parseInt(req.params.id, 10);
      const notes      = req.body.userNotes;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Missing file' });
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      await addAdditionalDocument(documentId, fileUrl, notes);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);


// Sample endpoint to update document status (logic to be implemented as needed

app.put('/documents/:id/status', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access only' });
  }
  const documentId = parseInt(req.params.id, 10);
  const { status, notes, businessName } = req.body; // e.g., 'approved' or 'rejected'
  
  try {
      if (status === 'approved') {
        const pool = await poolPromise;
        const result = await pool.request()
          .input('documentId', sql.Int, documentId)
          .query('SELECT * FROM Documents WHERE id = @documentId');
        
        if (result.recordset.length === 0) {
          return res.status(404).json({ success: false, message: 'Document not found' });
        }
        
        const docRecord = result.recordset[0];
        
        // Generate certificate with custom detail (e.g. business name)
        const certificateUrl = await generateCertificate({
          id: docRecord.id,
          title: docRecord.title,
          businessName, // Custom detail provided by admin
          verifiedOn: new Date().toLocaleDateString(),
        });
        
        // Update the document record with status and certificate URL
        await updateDocumentWithCertificate(documentId, status, certificateUrl, businessName);
      }
      else if (status === 'needs_info') {
        // record “request more info” notes
        await requestMoreInfo(documentId, notes);
      }
      else {
        // For rejected or other status updates, simply update
        await updateDocumentStatus(documentId, status);
      }
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });


app.get('/dashboard', authenticate, async (req, res) => {
  try {
    // Get documents uploaded by the user from MSSQL.
    const docs = await getDocumentsByUserId(req.user.id);
    res.render('dashboard', { user: req.user, documents: docs });
  } catch (error) {
    res.status(500).send("Error retrieving documents: " + error.message);
  }
});

app.get('/admin', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).render('error', { message: 'Forbidden: Admin access only' });
  }
  try {
    const docs = await getAllDocuments();
    res.render('admin', { user: req.user, documents: docs });
  } catch (error) {
    res.status(500).send("Error retrieving documents: " + error.message);
  }
});

// Sample endpoint to download a generated certificate (logic placeholder)
app.get('/documents/:id/certificate', authenticate, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id, 10);
    // Query the database to get the certificate URL for this document.
    const pool = await poolPromise;
    const result = await pool.request()
      .input('documentId', sql.Int, documentId)
      .query('SELECT certificateUrl FROM Documents WHERE id = @documentId');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    const doc = result.recordset[0];
    if (!doc.certificateUrl) {
      return res.status(404).json({ success: false, message: 'Certificate not available' });
    }
    
    // The certificateUrl is stored as a URL (e.g., "/certificates/certificate-123.pdf")
    // Remove the leading slash if present, then build the full file path.
    let filePath = doc.certificateUrl;
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    const fullPath = path.join(__dirname, filePath);
    
    // Send the file using res.download. You can specify a name for the download.
    res.download(fullPath, `certificate-${documentId}.pdf`, err => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).send("Error downloading file");
      }
    });
  } catch (error) {
    console.error("Error in certificate download endpoint:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// We assume 'docObj' might contain keys like { id, title, businessName, verifiedOn }
async function generateCertificate(docObj) {
  const { id, title, businessName, verifiedOn } = docObj;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 18;

  // Title
  page.drawText('Certificate of Authenticity', {
    x: 100,
    y: 700,
    size: 30,
    font,
    color: rgb(0, 0.2, 0.4)
  });

  // Business Name
  if (businessName) {
    page.drawText(`Issued for: ${businessName}`, {
      x: 100,
      y: 660,
      size: fontSize,
      font,
    });
  }

  // Document Title
  page.drawText(`Document: ${title || ''}`, {
    x: 100,
    y: 620,
    size: fontSize,
    font,
  });

  // Verified On Date
  page.drawText(`Verified on: ${verifiedOn || new Date().toLocaleDateString()}`, {
    x: 100,
    y: 580,
    size: fontSize,
    font,
  });

  // Document ID
  page.drawText(`Document ID: ${id}`, {
    x: 100,
    y: 540,
    size: fontSize,
    font,
  });

  // Footer
  page.drawText('CertFlow Authentication Service', {
    x: 100,
    y: 200,
    size: fontSize,
    font,
    color: rgb(0, 0.2, 0.4)
  });

  // Save PDF, write to disk
  const pdfBytes = await pdfDoc.save();
  const certFileName = `certificate-${id}.pdf`;
  const certPath = path.join(certDir, certFileName);
  fs.writeFileSync(certPath, pdfBytes);

  // Return the path that your app uses to serve the certificates
  return `/certificates/${certFileName}`;
}



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Visit http://localhost:${port} to access the application`);
});
