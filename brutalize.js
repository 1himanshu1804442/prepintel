const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend/src/Dashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

// Colors
content = content.replace(/text-white/g, 'text-black');
content = content.replace(/text-gray-200/g, 'text-black');
content = content.replace(/text-gray-300/g, 'text-gray-800');
content = content.replace(/text-gray-400/g, 'text-gray-700');
content = content.replace(/text-gray-500/g, 'text-gray-600');
content = content.replace(/text-gray-600/g, 'text-gray-500');

// Borders (make them stark black for brutalism)
content = content.replace(/border-surface-[567]00(\/50)?/g, 'border-black');

// Backgrounds (surface-800 is white, surface-700 is light gray)
content = content.replace(/bg-surface-800(\/80)?/g, 'bg-white border-2 border-black');
content = content.replace(/bg-surface-700(\/30|\/50)?/g, 'bg-surface-700');
content = content.replace(/bg-surface-600/g, 'bg-surface-700');

// Rounded corners -> None
content = content.replace(/rounded-xl/g, 'rounded-none');
content = content.replace(/rounded-2xl/g, 'rounded-none');
content = content.replace(/rounded-lg/g, 'rounded-none');
content = content.replace(/rounded-md/g, 'rounded-none');

// Accent texts
content = content.replace(/text-accent-light/g, 'text-black font-bold uppercase tracking-wider');
content = content.replace(/text-accent/g, 'text-black');

// Special tweaks for AI Coach gradient
content = content.replace(/from-accent\/10 to-transparent/g, 'bg-surface-700');
content = content.replace(/bg-gradient-to-r from-accent to-accent-light/g, 'bg-black text-white');

fs.writeFileSync(file, content, 'utf8');
console.log('Brutalized Dashboard.jsx');
