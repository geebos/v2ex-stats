#!/usr/bin/env bash
# 获取 Chrome Web Store API 的 refresh_token
# 依赖: .env 中配置 CLIENT_ID, CLIENT_SECRET
# 参考: https://cloud.tencent.com/developer/article/1545519

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "错误: 未找到 .env 文件，请在项目根目录创建 .env 并配置 CLIENT_ID、CLIENT_SECRET"
  exit 1
fi

# 加载 .env（兼容含空格和注释）
set -a
source "$ENV_FILE"
set +a

if [[ -z "${CLIENT_ID:-}" ]] || [[ -z "${CLIENT_SECRET:-}" ]]; then
  echo "错误: .env 中必须包含 CLIENT_ID 和 CLIENT_SECRET"
  exit 1
fi

AUTH_URL="https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=${CLIENT_ID}&redirect_uri=urn:ietf:wg:oauth:2.0:oob"

echo "========== 第一步：获取 code =========="
echo "请在浏览器中打开以下链接并完成授权："
echo ""
echo "$AUTH_URL"
echo ""
echo "授权完成后，页面会显示 code，请复制。"
echo ""

read -r -p "请输入得到的 code: " CODE

if [[ -z "$CODE" ]]; then
  echo "错误: code 不能为空"
  exit 1
fi

echo ""
echo "========== 第二步：用 code 换取 refresh_token =========="

RESPONSE=$(curl -s "https://accounts.google.com/o/oauth2/token" \
  -d "client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${CODE}&grant_type=authorization_code&redirect_uri=urn:ietf:wg:oauth:2.0:oob")

if command -v jq &>/dev/null; then
  REFRESH_TOKEN=$(echo "$RESPONSE" | jq -r '.refresh_token')
  if [[ "$REFRESH_TOKEN" == "null" ]] || [[ -z "$REFRESH_TOKEN" ]]; then
    echo "获取失败，接口返回："
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
  fi
else
  echo "RESPONSE: $RESPONSE"
  REFRESH_TOKEN=$(echo "$RESPONSE" | grep -o '"refresh_token"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
  if [[ -z "$REFRESH_TOKEN" ]]; then
    echo "获取失败（未安装 jq，尝试解析失败），接口返回："
    echo "$RESPONSE"
    exit 1
  fi
fi

echo ""
echo "========== refresh_token =========="
echo "$REFRESH_TOKEN"
echo ""
echo "请将上述 refresh_token 妥善保存，可写入 .env 作为 REFRESH_TOKEN 用于发布。"
