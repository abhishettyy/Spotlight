// cPanel CloudLinux Passenger Startup File for Spotlight Backend
// This file serves as the entry point when running under GoDaddy cPanel "Setup Node.js App".

const fs = require('fs');
const path = require('path');

// Ensure dist exists
const distEntry = path.join(__dirname, 'dist', 'index.js');
if (!fs.existsSync(distEntry)) {
  console.error('[Startup Error] dist/index.js not found. Please run "npm run build" first.');
}

const mod = require('./dist/index.js');
const app = mod.default || mod.app || mod;

// In Passenger, Passenger manages the server binding automatically via the exported app or port.
if (process.env.PORT) {
  const port = process.env.PORT;
  if (!app.listening) {
    app.listen(port, () => {
      console.log(`[Spotlight] Server listening on port ${port}`);
    });
  }
}

module.exports = app;
