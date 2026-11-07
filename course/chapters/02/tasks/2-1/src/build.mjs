// 先用原版构建生成三维实验页（motor.html、diesel.html），再生成任务页 index.html。
import {createRequire} from 'node:module';
import {buildTaskPage} from '../../../../../../shared/动力与工作机构/build-page.mjs';
createRequire(import.meta.url)('../build.cjs');
buildTaskPage(import.meta.url, '2-1');
