#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixImportsInFile(filePath) {
  if (!filePath.endsWith('.js')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Add .js extensions to relative imports
  const importRegex = /import\s+.*?\s+from\s+['"](\.\.?\/[^'"]*?)(?<!\.js)['"]/g;
  content = content.replace(importRegex, (match, importPath) => {
    if (!importPath.endsWith('.js')) {
      modified = true;
      return match.replace(importPath, importPath + '.js');
    }
    return match;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed imports in: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else {
      fixImportsInFile(filePath);
    }
  }
}

// Fix imports in the dist directory
walkDir(path.join(__dirname, 'dist'));
console.log('Import fixing complete!');
