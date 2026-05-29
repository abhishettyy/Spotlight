const fs = require('fs');
let code = fs.readFileSync('src/app/App.tsx', 'utf8');
code = code.replace(/<(div|motion\.div|span|motion\.button)([^>]*?)onClick=([^>]*?)className="([^>]*?)"/g, (m, tag, pre, post, classes) => {
  if (!classes.includes('cursor-pointer')) {
    return `<${tag}${pre}onClick=${post}className="cursor-pointer ${classes}"`;
  }
  return m;
});
// also handle single quotes className='...'
code = code.replace(/<(div|motion\.div|span|motion\.button)([^>]*?)onClick=([^>]*?)className='([^>]*?)'/g, (m, tag, pre, post, classes) => {
  if (!classes.includes('cursor-pointer')) {
    return `<${tag}${pre}onClick=${post}className='cursor-pointer ${classes}'`;
  }
  return m;
});
fs.writeFileSync('src/app/App.tsx', code);
