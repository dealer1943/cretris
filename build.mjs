import {mkdir, copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, 'dist');
const files = ['index.html', 'style.css', 'main.js', 'game.js', 'credits.js'];

await mkdir(output, {recursive:true});
await Promise.all(files.map(file => copyFile(path.join(root, file), path.join(output, file))));
