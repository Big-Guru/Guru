const fs = require('fs');
const storeContent = fs.readFileSync('/Users/amine/Documents/Guru/src/lib/alerts.ts', 'utf8');
console.log(storeContent.match(/alerts\.push/g)?.length);
