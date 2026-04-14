const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'upload.wikimedia.org',
  path: '/wikipedia/commons/thumb/a/a2/Lambang_Kabupaten_Jember.png/200px-Lambang_Kabupaten_Jember.png',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
};

https.get(options, (res) => {
  const data = [];
  res.on('data', (chunk) => data.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(data);
    fs.writeFileSync('logo.b64', buffer.toString('base64'));
    console.log('Done');
  });
});
