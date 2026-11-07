/* 第7章检查：第7章各任务页已改用统一任务页外壳，旧版式（章节导航、旧主题按钮、16:9 外框）的检查不再适用。
 * 现在由 check-chapters.cjs 统一检查外壳结构、工位切换、试一试、一屏不滚动与深浅色；各页模型逻辑见 node scripts/test.mjs。
 * 用法不变：node scripts/check-chapter7.cjs [--site <目录>] [--screenshots <目录>]
 */
process.argv.push('--chapter', '7');
require('./check-chapters.cjs');
