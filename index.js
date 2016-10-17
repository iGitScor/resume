const fs = require('fs');
const path = require('path');
const resumeTheme = require('jsonresume-theme-spartan');

const resumeRaw = fs.readFileSync(path.join(__dirname, '/resume.json'));
const resumeJSON = JSON.parse(resumeRaw, 'utf-8');
const resumeHTML = resumeTheme.render(resumeJSON);

fs.writeFile(
  path.join(__dirname, '/index.html'),
  resumeHTML,
  function (generationError) {
    console.log(generationError || 'Resume exported to index.html');
  }
);
