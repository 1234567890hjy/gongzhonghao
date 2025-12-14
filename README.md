# 文件管理应用使用指南

## 1. 项目介绍
这是一个功能完善的文件管理应用，支持文件上传、管理、查看、搜索和删除等功能。应用采用响应式设计，可在桌面和移动设备上使用。

## 2. 核心功能
- ✅ 文件上传（支持批量上传、文件夹上传）
- ✅ 文件查看（PDF、HTML、图片等格式）
- ✅ 文件搜索与过滤
- ✅ 文件排序（按时间、名称）
- ✅ 文件收藏功能
- ✅ 分页显示
- ✅ 批量删除、删除全部、按后缀删除
- ✅ PWA支持（可添加到手机主屏幕）

## 3. 在手机上使用

### 3.1 通过本地服务器访问
1. **启动服务器**
   ```bash
   # 使用Python启动服务器
   python -m http.server 8080
   
   # 或使用Node.js启动服务器
   node server.js
   ```

2. **获取电脑IP地址**
   - Windows: `ipconfig` 查看IPv4地址
   - macOS/Linux: `ifconfig` 或 `ip addr` 查看inet地址

3. **手机访问**
   在手机浏览器中输入：`http://电脑IP地址:8080`

### 3.2 作为PWA添加到主屏幕
1. 使用Chrome/Safari浏览器访问应用
2. **Android (Chrome)**:
   - 点击右上角三个点菜单
   - 选择「添加到主屏幕」
   - 点击「添加」

3. **iOS (Safari)**:
   - 点击底部分享按钮
   - 选择「添加到主屏幕」
   - 点击「添加」

## 4. 打包成原生App

### 4.1 使用Cordova打包

#### 环境准备
1. 安装Node.js (https://nodejs.org/)
2. 安装Cordova CLI
   ```bash
   npm install -g cordova
   ```

#### 打包步骤
1. **创建Cordova项目**
   ```bash
   cordova create FileManagerApp io.example.filemanager "File Manager"
   cd FileManagerApp
   ```

2. **添加平台**
   ```bash
   # 添加Android平台
   cordova platform add android
   
   # 添加iOS平台（需要macOS）
   cordova platform add ios
   ```

3. **复制文件**
   将项目中的所有文件（index.html, style.css, script.js, manifest.json, service-worker.js等）复制到 `www` 目录下，替换默认文件。

4. **构建应用**
   ```bash
   # 构建Android应用
   cordova build android
   
   # 构建iOS应用（需要macOS）
   cordova build ios
   ```

5. **安装应用**
   - Android: 在 `platforms/android/app/build/outputs/apk/debug/` 目录下找到APK文件，复制到手机安装
   - iOS: 使用Xcode打开项目，连接iPhone进行安装测试

### 4.2 其他打包工具
- **Capacitor**: 更现代化的打包工具，支持iOS/Android/Web
- **PhoneGap**: Cordova的商业版本，提供更多云服务

## 5. 文件说明

- `index.html` - 应用主界面
- `style.css` - 应用样式
- `script.js` - 应用核心功能逻辑
- `manifest.json` - PWA配置文件
- `service-worker.js` - PWA离线功能
- `server.js` - Node.js服务器

## 6. 技术特点

### PWA特性
- ✅ 可安装到主屏幕
- ✅ 离线访问功能
- ✅ 响应式设计
- ✅ 原生应用体验

### 性能优化
- 🚀 批量上传优化（支持700+文件）
- 📱 移动端适配
- 💾 低内存占用（使用createObjectURL）
- 🎨 流畅的UI交互

## 7. 浏览器兼容性

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## 8. 注意事项

1. **文件存储**：应用使用localStorage存储文件信息，文件内容通过createObjectURL管理
2. **批量上传**：建议每次上传不超过700个文件
3. **浏览器限制**：某些浏览器可能限制文件大小和数量
4. **PWA要求**：需要通过HTTPS访问才能使用完整的PWA功能

## 9. 更新日志

### v1.0.0
- 初始版本发布
- 支持文件上传、查看、管理
- 支持PWA功能
- 支持批量操作

---

如有问题或建议，欢迎反馈！
