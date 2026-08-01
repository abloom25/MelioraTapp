# Meliora Tapp

[Meliora](https://github.com/abloom25/Meliora) 的 Myriad [Tapp](https://github.com/Myriad-You/tapp-store) 版本:沉浸式歌词与节拍可视化,播放内核由 Myriad 宿主提供(`Tapp.media`)。

## 功能

- 逐行歌词跟随 + 逐字高亮(宿主提供 yrc/KRC 时),点击歌词跳转
- 节拍网格(`Tapp.media.getBeatGrid`,离线全曲分析)驱动的呼吸背景;无网格时退回频谱低频能量
- 八段频谱柱(`Tapp.media.getSpectrum`,15fps 轮询 + 本地快起慢落包络)
- 基础传输控制(播放/暂停/上一首/下一首/进度跳转)

## 开发

```bash
npx --yes --package=@myriad/tapp-cli@0.1.0 myriad-tapp check . --json
npx --yes --package=@myriad/tapp-cli@0.1.0 myriad-tapp pack . --json
```

结构:`manifest.json` + `main.js`(core:包络/时钟/媒体适配)+ `page/player.js`(页面)+ `styles.css`。

## 许可

[AGPL-3.0-or-later](LICENSE)。包含移植自 [Meliora](https://github.com/abloom25/Meliora) 的逻辑(同许可)。
