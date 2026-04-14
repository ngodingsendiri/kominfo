const https = require('https');
const fs = require('fs');

https.get('https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/key.svg', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('key.svg', data);
    console.log('Done');
  });
});
