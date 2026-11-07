import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../../../../../../scripts/build-workshops.py',import.meta.url));
const result=spawnSync('python',[script,'5-3'],{stdio:'inherit'});process.exit(result.status??1);
