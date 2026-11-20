// Regression guard: transitions must be absent from THAOS Lite.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
for (const file of ['js/common.js', 'js/class-page.js', 'js/race-page.js', 'css/styles.css']) {
  const code = read(file);
  for (const token of ['page-gate-transition', 'thaos-ash', 'ash-veil', 'site-is-leaving', 'site-is-arriving', 'dossier-enter-prev', 'dossier-leave-next', 'thaosDossierDirection']) {
    assert.equal(code.includes(token), false, `${file}: осталось ${token}`);
  }
}
assert.match(read('js/class-page.js'), /location\.assign\(`\.\/class\.html\?id=/);
assert.match(read('js/race-page.js'), /location\.assign\(`\.\/race\.html\?id=/);
console.log('OK: no page transitions, native navigation retained.');
