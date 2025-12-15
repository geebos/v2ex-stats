请根据以下要求生成 Git 提交信息和提交命令：
1. 遵循 Conventional Commit 规范。
2. 使用简体中文描述。
3. 提交信息格式：
   <type>(<scope>): <subject>

   [可选 body]
   [可选 footer]

4. 各部分规则：
   - type：必须是以下之一
     feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert
   - scope：可选，表示影响范围，如模块/功能名，使用小写英文。
   - subject：简洁、清晰地描述修改，**不超过 50 个字符**，不用大写字母开头，不加句号。
   - body：可选，说明修改动机、变化的细节。每行不超过 72 字符。
   - footer：可选，用于 BREAKING CHANGE 或关联 issue（如 `Closes #123`）。

tips:
- 默认当前目录为工作目录