#!/usr/bin/env node

const handler = require('./api/echo.js');

console.log('✅ Handler loaded successfully');
console.log('✅ Module exports:', typeof handler);
console.log('✅ Ready for Vercel deployment');
