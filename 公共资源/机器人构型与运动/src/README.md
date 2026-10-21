# 第三章 3-3 / 3-4 / 3-5 教学演示

**3-5 已独立重做为真正的三维版**：`../../../任务3-5_移动底盘与行走机构/src/mobile.view.js` 使用内嵌 Three.js 构建实体机构与试验场，原 `../../../任务3-5_移动底盘与行走机构/src/mobile.svg.js` 仅保留作旧版源码，不再用于 3-5 主画面。当前检查以 `../../../任务3-5_移动底盘与行走机构/qa/mobile-3d.test.cjs`、`../../../任务3-5_移动底盘与行走机构/qa/verify-mobile-3d.mjs` 和 `../../../任务3-5_移动底盘与行走机构/docs/mobile-3d-qa.md` 为准。该重做只替换 3-5；3-3、3-4 的页面未重建。


直接打开同级目录的 `joint-drive.html`、`end-effectors.html`、`mobile-platforms.html`。三份 HTML 均内嵌全部运行依赖，无 CDN 或后端要求。3-3 的 MP4 与 SRT 为独立配套文件，传给别人时一并保留。

## 内容与几何约定

- **3-3**：伺服指令、电能/动力和反馈分别显示；简化 PD 位置响应不作为真实整定。行星太阳轮/行星轮/齿圈为 20/20/60，四行星，齿圈固定、行星架输出，同向 4∶1。行星轮自转角速度为输入的 -1/2，行星架为 +1/4，满足两处啮合的相对速度约束。谐波固定刚轮 202、柔轮 200、波发生器输入，输出为 -1/100；变形适度放大，齿形非制造齿廓。RV 使用分层结构高亮，不编造完整啮合运动或总比。丝杠采用教学导程 8 mm/rev；齿条用位置/节圆半径求角度；夹持连杆保持两杆长度 100 mm，末端由直线导向约束。96 秒视频和交互页共用绘图与模型；视频 1280×720、15 fps、H.264、中文字幕、无旁白。
- **3-4**：复用 `../../../任务3-2_六轴机械臂本体_关节轴与低速点动/src/model.js` 与 `../../../任务3-1_机器人构型与工作空间识读/src/render.js` 的六轴本体。工具坐标约定继承 3-2；实际法兰系偏置为 `Ry(90°) × 工具局部偏置`，四点结果明确显示为法兰系 XYZ。固定针尖由可达的起始 TCP 定义，四个不同姿态和第五复核姿态均经完整 6D 逆解、软限位与教学自碰/地面检查。记录实际法兰 t、R，解 `Ri p - pin = -ti`；QR 求解改编自教材原有 `chapter2/4AIweb/tcp-calibration-lab/dist/calibration.js`，未直接返回工具尺寸。纯位置标定不能唯一确定工具坐标轴方向。快换确认与工具参数独立；真空命令与材料接触也分别记录。0.5 mm 是练习提示值。JSON 为本机下载，不联网提交。
- **3-5**：m、s、rad；车头 +X、左侧 +Y、正 yaw 逆时针。外形 1.2×0.6 m。差速轮距 0.48 m；四轮全向中心在 (±0.40, ±0.24)，X 型滚子，几何系数 0.64 m；转向轮轴距 0.80 m、轮距 0.34 m，计算内外转角。车体恒速 twist 以 SE(2) 精确积分，小步检查完整矩形而非中心点；前伸工具计入矩形。转向例为 1×1 m 腔体连接 0.62 m 入口，0°/90°可容纳而部分中间姿态干涉，结论仅限该几何场景。履带采用无滑移近似的速度示意；四足使用两段 0.26 m 刚杆的三维逆解；支撑足在匀速直行、倒退或转向时保持世界位置，摆动足抬起换位，未模拟动力学。轨道约束横向及航向；磁吸/负压是附着条件，与轮式/履带式可组合。

## 设计与运行边界

延续 anatomy 的精密台架、支座、紧固件、标尺与金属分色。3-3 使用直接 SVG；3-4、3-5 使用 Three.js 实体层级与真实深度排序。这里没有采用 anatomy kit 的几何记录接口，因此不宣称通过 kit 专用的穿插或线端审计；另用数值模型、浏览器真实交互、离线布局和细部截图验证。Three.js r160 的 MIT 标识保留在内嵌库头。

桌面布局验证：1280×720、1366×768、1920×1080，全部活动无页面纵向滚动；390 px 手机为竖向操作布局。工具特写可放大腕部；无 WebGL 时保留真实几何投影的 SVG 模型。失焦和 Esc 停止驾驶/姿态扫描。

## 重建与检查

从仓库根目录运行：

```powershell
node '公共资源/机器人构型与运动/src/build.mjs'
node --test '公共资源/机器人构型与运动/qa/models.test.cjs'
node '公共资源/机器人构型与运动/qa/verify-browser.mjs'
node '公共资源/机器人构型与运动/qa/verify-details.mjs'
node --test '任务3-5_移动底盘与行走机构/qa/mobile-3d.test.cjs'
node '任务3-5_移动底盘与行走机构/qa/verify-mobile-3d.mjs'
node '任务3-3_关节驱动_减速器与传动机构/qa/export-video.mjs'
```

浏览器脚本需要本机 Chrome 或 Edge；可用 `CHROME_PATH` 指定。视频脚本用本机 ffmpeg 的 Windows Media Foundation H.264 编码器，可用 `FFMPEG_PATH` 指定可执行文件；默认从现有 imageio_ffmpeg 查找。页面本身不需要 Node、Python 或 ffmpeg。测试结果与截图保存在本目录，不嵌入教学页面。

## 原理参考

- [Harmonic Drive：三构件、齿差与输入/输出方向](https://legacy.harmonicdrive.net/reference/applicationnotes/principles.php)
- [Nabtesco：RV 两级结构与偏心曲轴](https://precision.nabtesco.com/en/products/introduction/)
- [Universal Robots：固定点、多种姿态与 TCP 位置示教](https://www.universal-robots.com/manuals/EN/HTML/SW5_22/Content/prod-usr-man/software/PolyScope/content/installation_g5/teaching_TCP_position.htm)
- [WPILib：麦克纳姆坐标约定、四轮位置与速度转换](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/mecanum-drive-kinematics.html)
