const https = require('https');
const fs = require('fs');

https.get('https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Key_icon_blue.svg/120px-Key_icon_blue.svg.png', (res) => {
  const data = [];
  res.on('data', (chunk) => data.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(data);
    fs.writeFileSync('tte.b64', buffer.toString('base64'));
    console.log('Done');
  });
});
