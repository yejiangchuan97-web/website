import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import * as M from '../../src/sanding/model.mjs';
const HERE=dirname(fileURLToPath(import.meta.url));
assert(M.validCenter(1.2,.6)); // The circular envelope clears the diagonal corner.
assert(!M.validCenter(1.2,.9)); // Same x, alongside the opening: envelope intrudes.
assert(M.dryCheck(M.makeRoute()).valid);
const bad=M.dryCheck(M.makeRoute(.24,.1));assert(!bad.valid);assert(M.openingDistance(bad.hazard.x,bad.hazard.z)<M.R);
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});const errors=[];
try{const p=await b.newPage({viewport:{width:1440,height:810},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.goto(new URL('../../6-3.html',import.meta.url).href);await p.locator('[data-tab="coverage"]').click();await p.locator('#offset').fill('0.1');await p.locator('#dryRun').click();await p.locator('#coverageEnd').click();assert(await p.locator('#contactRun').isDisabled());await p.screenshot({path:join(HERE,'wrong-map.png')});await p.locator('#offset').fill('0');await p.locator('#dryRun').click();await p.locator('#coverageEnd').click();assert(!await p.locator('#contactRun').isDisabled());await p.locator('#contactRun').click();await p.locator('#coverageEnd').click();assert(await p.locator('#mapCells rect').count()>0);assert.equal(errors.length,0);writeFileSync(join(HERE,'final-check.json'),JSON.stringify({passed:true,circularCornerClearance:true,hazard:bad.hazard,errors},null,2));console.log('Final circular-envelope, failure-location and contact-flow checks passed.');}finally{await b.close();}
