const fs = require('node:fs');
const path = require('node:path');
const integrate = require('../../../../../shared/动力与工作机构/integrate.cjs');
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const inline = code => '<script>' + code.replace(/<\/script/gi, '<\\/script') + '</script>';

function finish(html, lab) {
  return integrate(html, lab).replace('</body>', '<script src="assets/power-lesson.js"></script></body>')
    .replace('</head>', '<link rel="stylesheet" href="assets/power-lesson.css"></head>');
}

const motor = read('src/motor.html');
const diesel = read('diesel-source/index.html')
  .replace('<script src="../../../../../../shared/动力与工作机构/renderer.js"></script>', '')
  .replace('<link rel="stylesheet" href="src/style.css">', () => '<style>' + read('diesel-source/src/style.css') + '</style>')
  .replace('<script src="src/three.js"></script>', '<script src="../../../../../shared/vendor/three-13767d3750.js"></script>')
  .replace('<script src="src/engine-lab.js"></script>', () => inline(read('diesel-source/src/engine-lab.js')));
fs.writeFileSync(path.join(__dirname, 'motor.html'), finish(motor, 'motor'), 'utf8');
fs.writeFileSync(path.join(__dirname, 'diesel.html'), finish(diesel, 'diesel'), 'utf8');
console.log('Built motor and diesel lessons using their original model engines');
