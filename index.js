const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const resumeTheme = require('jsonresume-theme-spartan');

const resumeLang = argv.lang || 'en';
const resumeRaw = fs.readFileSync(path.join(__dirname, 'src', resumeLang, '/resume.json'));
const resumeJSON = JSON.parse(resumeRaw, 'utf-8');
const resumeHTML = resumeTheme.render(resumeJSON);

// English is primary language
if (resumeLang !== 'en') {
  var mkdirp = require('mkdirp');
  mkdirp(argv.lang, function (err) {});
}

// Write in current directory in english or in a specific iso-lang 2 characters sub-directory
fs.writeFile(
  path.join(__dirname, resumeLang == 'en' ? '' : resumeLang, '/index.html'),
  resumeHTML,
  function (generationError) {
    console.log(generationError || 'Resume exported to index.html in ' + resumeLang);
  }
);
