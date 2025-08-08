const fs = require("fs");
const path = require("path");

// Copy PDF.js worker file to public directory
const sourcePath = path.join(
  __dirname,
  "../node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
);
const destPath = path.join(__dirname, "../public/pdf.worker.min.js");

try {
  fs.copyFileSync(sourcePath, destPath);
  console.log("PDF.js worker file copied successfully");
} catch (error) {
  console.error("Failed to copy PDF.js worker file:", error.message);
  process.exit(1);
}
