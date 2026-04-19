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
  code = code.replace(/navigate\(\(process\.env\.REACT_APP_API_URL \|\| ''\) \+ '(\/[^']+)'\)/g, "navigate('$1')");
  // Also fix possible navigate(..., { state }) combinations where there's a comma
  code = code.replace(/navigate\(\(process\.env\.REACT_APP_API_URL \|\| ''\) \+ '(\/[^']+)',/g, "navigate('$1',");
  if(code !== original) {
    fs.writeFileSync(f, code);
    console.log('Fixed navigate in', f);
  }
});
