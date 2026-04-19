const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

function replaceInFile(filePath) {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix backticks: `/api/` => `${process.env.REACT_APP_API_URL || ''}/api/`
    content = content.replace(/`\/api\//g, "`${process.env.REACT_APP_API_URL || ''}/api/");
    
    // Fix single quotes: '/api/' => (process.env.REACT_APP_API_URL || '') + '/api/'
    content = content.replace(/'\/api\//g, "(process.env.REACT_APP_API_URL || '') + '/api/");
    
    // Fix double quotes: "/api/" => (process.env.REACT_APP_API_URL || '') + "/api/"
    content = content.replace(/"\/api\//g, '(process.env.REACT_APP_API_URL || "") + "/api/');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated paths in ${filePath}`);
    }
}

walkDir(path.join(__dirname, '..', 'client', 'src'), replaceInFile);
console.log("All relative paths updated successfully!");
