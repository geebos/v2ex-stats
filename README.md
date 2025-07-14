# V2EX Coins Extension

V2EX 硬币获取记录折线图扩展插件

## 功能实现进度

### ✅ 功能点1: 检测并获取信息

已实现以下功能：

1. **检查域名是否为 v2ex.com**
   - 检测当前页面域名是否为 v2ex.com
   
2. **检查是否为金币页面**
   - 检测当前URL是否为 `/balance` 路径
   
3. **检测用户登录状态**
   - 通过查找页面中的用户链接 (`/member/{username}`) 来判断用户是否已登录
   - 如果已登录，自动获取用户名

### 测试方法

1. 构建扩展:
   ```bash
   pnpm build
   ```

2. 在 Chrome 中加载扩展:
   - 打开 Chrome 扩展页面 (`chrome://extensions/`)
   - 开启开发者模式
   - 点击"加载已解压的扩展程序"
   - 选择 `.output/chrome-mv3` 目录

3. 访问 V2EX 网站:
   - 访问 https://v2ex.com (任意页面)
   - 打开浏览器开发者工具的控制台
   - 查看输出的检测信息

4. 测试不同场景:
   - 未登录状态访问 V2EX
   - 登录后访问 V2EX 普通页面
   - 登录后访问 V2EX 金币页面 (https://v2ex.com/balance)

### 控制台输出示例

```
V2EX Coins Extension: Content script loaded
是否为 V2EX 网站: true
是否为金币页面: false
用户是否已登录: true
用户名: your_username
检测到的信息汇总: {isV2ex: true, isBalancePage: false, isLoggedIn: true, username: "your_username"}
```

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build
```
