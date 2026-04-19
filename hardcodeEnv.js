const fs = require('fs');
const path = require('path');

function walk(dir, cb) {
  fs.readdirSync(dir).forEach(f => {
    let p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, cb); else cb(p);
  });
}

walk(path.join(__dirname, 'client', 'src'), f => {
  if(!f.endsWith('.js') && !f.endsWith('.jsx')) return;
  let code = fs.readFileSync(f, 'utf8');
  let original = code;

  // Replace literal process.env pattern injected by my script
  code = code.replace(/\(process\.env\.REACT_APP_API_URL\s*\|\|\s*['"]['"]\)/g, "'https://jomltak-andena-server-production.up.railway.app'");
  
  if(code !== original) {
    fs.writeFileSync(f, code);
    console.log('Fixed env variable in', f);
  }
});
