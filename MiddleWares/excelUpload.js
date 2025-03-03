const multer = require("multer");
const fs = require('fs');
const path = require('path');

// Define the upload directory in the root of the project
const uploadDir ='excel-uploads'

// Ensure the upload directory exists
fs.access(uploadDir, (error) => {
  if (error) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
});
const excelFilter = (req, file, cb) => {
  if (
    file.mimetype === "application/vnd.ms-excel" ||
    file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Please upload only excel file."), false);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-Excel-sheet-products-${file.originalname}`);
  },
});

const uploadFile = multer({ 
  storage: storage, 
  fileFilter: excelFilter,
  limits: { fileSize: 1024 * 1024 * 5 } // Limit file size to 5MB
})// Assuming the file field name is 'file'

module.exports = uploadFile;
