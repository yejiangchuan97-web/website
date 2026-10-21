import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../../src/',import.meta.url);
const old=readFileSync(new URL('previous/app.js',import.meta.url),'utf8');
const start=old.indexOf('function pathFor(');
writeFileSync(new URL('csv-tools.js',root),old.slice(start,old.indexOf("$$('.sensor-tab')",start)));
const page=readFileSync(new URL('previous/page.html',import.meta.url),'utf8');
writeFileSync(new URL('dialogs.html',root),page.slice(page.indexOf('<dialog id="recordsDialog"'),page.indexOf('<div id="toast"')));
