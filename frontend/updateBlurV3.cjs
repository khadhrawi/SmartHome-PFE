const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.css') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Reset all blurs back to 25px
    content = content.replace(/blur\(40px\)/g, 'blur(25px)');
    content = content.replace(/blur\(30px\)/g, 'blur(25px)'); // just in case any 30px slipped through

    if (filePath.endsWith('index.css')) {
        content = content.replace(/--card-bg:\s*rgba\([^\)]+\)/, '--card-bg: rgba(255, 255, 255, 0.05)');
        content = content.replace(/--card-bg-heavy:\s*rgba\([^\)]+\)/, '--card-bg-heavy: rgba(255, 255, 255, 0.08)');
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
