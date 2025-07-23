// public/api/upload-chat-file/index.js
// أو يمكن استخدام Express.js server منفصل

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();

// إعداد multer لرفع الملفات
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // إنشاء مجلد للمحادثة
    const uploadPath = path.join(__dirname, '../../uploads/chat-files/', req.body.conversationId);
    
    // إنشاء المجلد إذا لم يكن موجود
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // إنشاء اسم ملف فريد
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  }
});

// فلترة أنواع الملفات المسموحة
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// API endpoint لرفع الملفات
app.post('/api/upload-chat-file', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم العثور على ملف' });
    }

    // إنشاء رابط الملف
    const fileUrl = `/uploads/chat-files/${req.body.conversationId}/${req.file.filename}`;
    
    // معلومات الملف
    const fileInfo = {
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    res.json(fileInfo);
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'خطأ في رفع الملف' });
  }
});

// تقديم الملفات المرفوعة
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// معالجة الأخطاء
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'حجم الملف كبير جداً' });
    }
  }
  res.status(500).json({ error: error.message });
});

module.exports = app;

// لتشغيل السيرفر منفصل:
// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//   console.log(`File upload server running on port ${PORT}`);
// });