#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all page files that use auth
const appDir = path.join(__dirname, '../app');
const authPages = [];

function findFiles(dir, pattern) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item === 'page.tsx' || item === 'page.ts') {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('useAuth') || content.includes('useSession')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return files;
}

function updatePage(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let updated = content;
  
  // Add dynamic exports if not present
  if (!content.includes('export const dynamic')) {
    const imports = content.split('\n');
    const lastImportIndex = imports.findIndex(line => 
      line.startsWith('import') && !line.startsWith('//')
    );
    
    if (lastImportIndex !== -1) {
      imports.splice(lastImportIndex + 1, 0, 
        '// Force dynamic rendering to prevent SSR issues with auth\n' +
        'export const dynamic = \'force-dynamic\'\n' +
        'export const runtime = \'nodejs\'\n'
      );
      updated = imports.join('\n');
    }
  }
  
  // Replace useAuth with useSafeAuth
  updated = updated.replace(/useAuth\(/g, 'useSafeAuth(');
  
  // Replace useSession with useSafeSession  
  updated = updated.replace(/useSession\(/g, 'useSafeSession(');
  
  // Add import for safe auth if needed
  if (updated.includes('useSafeAuth') || updated.includes('useSafeSession')) {
    if (!updated.includes('import { useSafeAuth')) {
      const firstImport = updated.indexOf('import');
      const insertPos = updated.indexOf('\n', firstImport);
      updated = updated.slice(0, insertPos + 1) + 
        "import { useSafeAuth, useSafeSession } from '@/lib/auth/safe-auth'\n" +
        updated.slice(insertPos + 1);
    }
  }
  
  if (updated !== content) {
    fs.writeFileSync(filePath, updated);
    console.log(`Updated: ${filePath}`);
    return true;
  }
  
  return false;
}

// Main execution
const pages = findFiles(appDir);
console.log(`Found ${pages.length} pages using auth`);

let updatedCount = 0;
for (const page of pages) {
  if (updatePage(page)) {
    updatedCount++;
  }
}

console.log(`Updated ${updatedCount} pages`);
