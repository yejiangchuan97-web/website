# 智能建筑机械与机器人 · 课程总入口

[打开课程首页](../index.html)

首页延续各章的蓝白风格，八张章节卡片与三维展品标签均直接进入章节入口。每章可以从“任务目录”查看当前任务；“全部任务”支持名称、编号搜索和章节筛选。“学习路线”串联八章，也可独立选课。

第一章、第八章与任务5-3为阅读导读，目录中明确标注。其余任务使用现有交互课堂。总入口不合并各任务的进度或导出记录。

## 更新与打包

运行 `python scripts/build-course-cover.py` 从任务清单生成 `data.js` 和根目录 `index.html`。八章入口在该脚本的 `spec` 中统一维护，任务入口从 `任务清单.json` 读取；缺失入口时构建失败。

运行 `python scripts/build-course-cover.py --package --output <输出目录>` 生成 `site` 与完整 ZIP。打包保持原相对目录，包含全部八章入口、30个当前任务页面、导航所需跳转页与本地运行资源。任务 HTML 按原字节复制，原有页面功能保留。随包 `manifest.json` 提供校验值。

本次更新第三章入口返回课程总览的导航，并将第三章共用界面的初始主题改为深色；任务模型、学习流程和记录功能保留。修改任务内容时仍按对应章节的构建方式更新。

## 检查

运行 `python scripts/check-links.py` 检查本地链接；安装 Playwright 后运行 `node scripts/check-course.cjs`，可加 `--site <site目录>` 检查离线包，`--screenshots <目录>` 保存预览。设置 `COURSE_BROWSER=msedge` 可使用已安装的 Edge。
