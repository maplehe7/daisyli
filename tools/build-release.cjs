'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'site');
const destination = path.join(root, 'wordpress/daisy-site/public');
const base = 'https://maplehe7.github.io/daisyli/web/';
const rootAssets = fs.readdirSync(source).filter(name => /\.(js|css)$/.test(name));
function copy(directory, target) {
  fs.mkdirSync(target, {recursive: true});
  for (const file of fs.readdirSync(directory, {withFileTypes: true})) {
    const from = path.join(directory, file.name), to = path.join(target, file.name);
    if (file.isDirectory()) { copy(from, to); continue; }
    if (/\.(js|css|html)$/.test(file.name)) {
      let text = fs.readFileSync(from, 'utf8')
        .replaceAll('/assets/', base + 'assets/')
        .replaceAll('/vendor/', base + 'vendor/')
        .replaceAll('/api/idx/', '/wp-json/daisy/v1/idx/');
      if (file.name === 'index.html') {
        text = text.replace(/\s*<meta name="robots" content="noindex,nofollow">/, '');
        for (const asset of rootAssets) text = text.replaceAll('"/' + asset + '"', '"' + base + asset + '?v=1.0.0"');
      }
      fs.writeFileSync(to, text);
    } else fs.copyFileSync(from, to);
  }
}
copy(source, destination);
const html = fs.readFileSync(path.join(destination, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="(https:\/\/maplehe7\.github\.io\/daisyli\/web\/[^"?]+)/g)) {
  if (!fs.existsSync(path.join(destination, decodeURIComponent(match[1].slice(base.length))))) throw Error('Missing asset: ' + match[1]);
}
fs.cpSync(destination, path.join(root, 'web'), {recursive:true});
console.log('Built GitHub-hosted assets, WordPress fallback assets, and verified every entry-point asset.');
