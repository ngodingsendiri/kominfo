const { createCanvas } = require('canvas');
const fs = require('fs');

const canvas = createCanvas(100, 100);
const ctx = canvas.getContext('2d');

// Draw a simple key icon
ctx.fillStyle = '#3b82f6';
ctx.beginPath();
ctx.arc(30, 50, 20, 0, Math.PI * 2);
ctx.fill();

ctx.fillRect(50, 40, 40, 20);
ctx.fillRect(70, 60, 10, 20);

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('tte.b64', buffer.toString('base64'));
console.log('Done');
