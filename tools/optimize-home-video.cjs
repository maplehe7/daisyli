'use strict';
// Rebuild the background encodes from the full-quality, unchanged 30-second edit.
// Usage: node tools/optimize-home-video.cjs /path/to/ffmpeg
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const ffmpeg = process.argv[2];
if (!ffmpeg) throw Error('Pass the path to ffmpeg.');
const folder = path.resolve(__dirname, '../web/assets/home-film-v4');
const source = path.join(folder, 'film.mp4');
const variants = [
  {name:'film-1080-lite.mp4', width:1920, rate:'2200k', buffer:'4400k'},
  {name:'film-720-lite.mp4', width:1280, rate:'850k', buffer:'1700k'},
  {name:'film-480-lite.mp4', width:854, rate:'320k', buffer:'640k'}
];
function run(args) {
  const result = spawnSync(ffmpeg, ['-hide_banner','-loglevel','error','-nostdin','-y',...args], {stdio:'inherit'});
  if (result.status !== 0) throw Error('Video encoding failed.');
}
for (const variant of variants) {
  run(['-i',source,'-an','-vf',`scale=${variant.width}:-2:flags=lanczos,fps=24`,
    '-c:v','libx264','-preset','medium','-crf','25','-maxrate',variant.rate,'-bufsize',variant.buffer,
    '-threads','4','-pix_fmt','yuv420p','-profile:v','high','-level:v','4.0',
    '-g','48','-keyint_min','24','-movflags','+faststart',path.join(folder,variant.name)]);
  console.log(variant.name, fs.statSync(path.join(folder,variant.name)).size);
}
run(['-i',path.join(folder,'poster.jpg'),'-vf','scale=1280:-2','-frames:v','1','-q:v','6',path.join(folder,'poster-lite.jpg')]);
console.log('poster-lite.jpg', fs.statSync(path.join(folder,'poster-lite.jpg')).size);
