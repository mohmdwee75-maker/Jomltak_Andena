const fs = require('fs');
const path = require('path');

// كل الـ routes اللي في السيرفر بس مش فيها /api/
const NON_API_ROUTES = [
  '/send-otp',
  '/verify-otp',
  '/resend-otp',
  '/login_details',
  '/save_account_details',
  '/signin',
  '/forgot-password',
  '/reset-password',
  '/change-password',
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) walkDir(fullPath, callback);
    else callback(fullPath);
  });
}

let totalFixed = 0;

function fixFile(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  NON_API_ROUTES.forEach(route => {
    // Single quotes: '/send-otp'
    const sq = `'${route}'`;
    const sqFixed = `(process.env.REACT_APP_API_URL || '') + '${route}'`;
    content = content.split(sq).join(sqFixed);

    // Double quotes: "/send-otp"
    const dq = `"${route}"`;
    const dqFixed = `(process.env.REACT_APP_API_URL || "") + "${route}"`;
    content = content.split(dq).join(dqFixed);

    // Backtick: `${...}/send-otp` - only fix plain starts like `/send-otp`
    const bt = '`' + route;
    const btFixed = '`${process.env.REACT_APP_API_URL || ""}' + route;
    content = content.split(bt).join(btFixed);
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
    totalFixed++;
  }
}

const srcDir = path.join(__dirname, '..', 'client', 'src');
walkDir(srcDir, fixFile);
console.log(`\n✔️ Done! Fixed ${totalFixed} files.`);
