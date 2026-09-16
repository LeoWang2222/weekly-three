# 这周值得

每周三件事:一个目标、一份期待、一个没有白过的理由。

一个为 iPhone「添加到主屏幕」设计的纯前端 PWA 周记应用,数据只存在你自己的手机里。
一年之后,你会攒下 52 个「没有白过」。

## 功能

- **本周**:这周最想完成的一件事 🎯 / 最期待的一件事 ✨ / 因为哪件事这周没有白过 🌅
- **时光轴**:回看过去的每一周
- **年度**:已记录周数、连续记录周数、完成目标数、52 格圆点图,以及「没有白过」年度合集
- 自动保存(localStorage)、深色模式跟随系统、JSON 导出/导入备份
- 一键生成「每周日 21:00 回顾」日历提醒(.ics)

## 在 iPhone 上安装

1. 用 **Safari** 打开 `https://<你的用户名>.github.io/weekly-three/`
2. 点底部分享按钮 → **添加到主屏幕**
3. 从主屏幕图标打开,即是全屏无浏览器边框的 App 体验

> iOS 上只有 Safari 能把网页 App 添加到主屏幕;数据保存在本机,卸载图标会清除数据,请定期从菜单导出备份。

## 技术

无框架、无构建:原生 HTML / CSS / JavaScript + Service Worker,GitHub Pages 静态托管。

```
index.html              页面结构
style.css               样式(含深色模式)
app.js                  数据与交互(ISO 周计算、三个视图、导入导出)
manifest.webmanifest    PWA 清单
sw.js                   Service Worker(离线缓存)
scripts/gen_icons.py    图标生成脚本(Pillow)
```

## 本地运行

任意静态服务器即可,例如:

```bash
python -m http.server 8000
# 打开 http://localhost:8000
```
