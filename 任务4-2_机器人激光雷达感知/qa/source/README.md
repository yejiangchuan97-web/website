# PCL 公开点云示例溯源

- 原文件：[固定版本](https://raw.githubusercontent.com/PointCloudLibrary/data/084fa0e260580cc765ded83de4ec3f495f1d6f1e/tutorials/table_scene_lms400.pcd)
- 官方教程：[StatisticalOutlierRemoval](https://pointclouds.org/documentation/tutorials/statistical_outlier.html)
- 数据仓库许可证：[BSD-3-Clause](https://raw.githubusercontent.com/PointCloudLibrary/data/master/LICENSE)；完整文本随 assets/lidar/PCL-DATA-LICENSE.txt 分发。
- SHA256：`e285d415641e0d9de695b611db874cc8fe995e8089b77a50d6056d24d8cbcc58`
- 原文件 Git blob：`5631e4b0d659bfea286819b97fdec93f6de88600`
- 原文件 5649007 bytes、460400 点；有限 XYZ 460400 点；保留 12116 点。
- 原始索引顺序逐行检查有限 XYZ，保留第 0、38、76… 个有效点；固定步长 38；sourceIndex 为原文件零基索引；不补点、不平滑、不重建。
- 单位未在源文件声明；未确认单位前只作形状识读，不提供米制净宽结论。
- 未改变原始 XYZ，未补点。二进制压缩数据的 LZF 解压脚本保存在 qa/lidar/prepare-pcl-sample.mjs，可重复生成静态资产。
