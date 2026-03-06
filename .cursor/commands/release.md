按照如下步骤创建新版本：
1. 使用 `git` 命令获取从上一个 tag（例如 `git describe --tags --abbrev=0`）到当前 HEAD 的提交日志。
2. 分析这些提交信息，判断需要递增的版本级别：
   - 如果包含 `BREAKING CHANGE` 或 `!`，则为 `major` 版本升级。
   - 如果包含 `feat:` 类型提交，则为 `minor` 版本升级。
   - 如果包含 `fix:` 类型提交，则为 `patch` 版本升级。
   - 如果都没有，保持原版本。
3. 根据步骤 2中获取的信息生成一个符合 Conventional Commits 的 Git commit message，格式如下：

   ```
   chore(release): vX.Y.Z

   - feat: 添加新功能 xxx
   - fix: 修复了 yyy 的问题
   - docs: 更新了文档 zzz
   ...
   ```

   这些子项来自步骤 2 中的提交摘要。
4. 调用项目根目录下的 release.sh 脚本创建新版本，使用方法如下：

   ```
   用法: $0 [-a | -b | -c] [-m <message>] [-h]
      选项:
        -a          第一级版本号(A)加一，B、C设置为0
        -b          第二级版本号(B)加一，A保持不变，C设置为0
        -c          第三级版本号(C)加一，A、B保持不变 (默认)
        -m <msg>    指定 tag 的注释信息"
        -h          显示帮助信息
      
      示例:"
        $0              # C版本号加一 (默认)
        $0 -a           # A版本号加一
        $0 -b           # B版本号加一
        $0 -c -m 'fix'" # C版本号加一，并添加注释
   ```
