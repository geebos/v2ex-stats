#!/bin/bash

# 版本号模板前缀
VERSION_PREFIX="v"

# 显示帮助信息
show_help() {
    echo "用法: $0 [-a | -b | -c] [-m <message>] [-h]"
    echo ""
    echo "选项:"
    echo "  -a          第一级版本号(A)加一，B、C设置为0"
    echo "  -b          第二级版本号(B)加一，A保持不变，C设置为0"
    echo "  -c          第三级版本号(C)加一，A、B保持不变 (默认)"
    echo "  -m <msg>    指定 tag 的注释信息"
    echo "  -h          显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0              # C版本号加一 (默认)"
    echo "  $0 -a           # A版本号加一"
    echo "  $0 -b           # B版本号加一"
    echo "  $0 -c -m 'fix'" # C版本号加一，并添加注释"
}

# 获取最新的版本号
get_latest_version() {
    # 获取所有符合模板的 tag，按版本号排序，取最新的
    git tag -l "${VERSION_PREFIX}*" | \
        sed "s/^${VERSION_PREFIX}//" | \
        sort -t. -k1,1n -k2,2n -k3,3n | \
        tail -n 1
}

# 解析版本号
parse_version() {
    local version=$1
    if [[ -z "$version" ]]; then
        echo "0 0 0"
        return
    fi
    
    local major=$(echo "$version" | cut -d. -f1)
    local minor=$(echo "$version" | cut -d. -f2)
    local patch=$(echo "$version" | cut -d. -f3)
    
    # 如果解析失败，使用默认值
    major=${major:-0}
    minor=${minor:-0}
    patch=${patch:-0}
    
    echo "$major $minor $patch"
}

# 主逻辑
main() {
    local bump_type="c"  # 默认升级 C 版本
    local message=""
    
    # 解析命令行参数
    while getopts "abcm:h" opt; do
        case $opt in
            a)
                bump_type="a"
                ;;
            b)
                bump_type="b"
                ;;
            c)
                bump_type="c"
                ;;
            m)
                message="$OPTARG"
                ;;
            h)
                show_help
                exit 0
                ;;
            \?)
                echo "无效选项: -$OPTARG" >&2
                show_help
                exit 1
                ;;
        esac
    done
    
    # 检查是否在 git 仓库中
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo "错误: 当前目录不是 git 仓库" >&2
        exit 1
    fi
    
    # 获取最新版本号
    local latest_version=$(get_latest_version)
    
    if [[ -z "$latest_version" ]]; then
        echo "未找到符合模板 '${VERSION_PREFIX}X.Y.Z' 的 tag，将从 0.0.0 开始"
        latest_version="0.0.0"
    fi
    
    echo "当前最新版本: ${VERSION_PREFIX}${latest_version}"
    
    # 解析版本号
    read major minor patch <<< $(parse_version "$latest_version")
    
    # 根据 bump_type 计算新版本号
    case $bump_type in
        a)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        b)
            minor=$((minor + 1))
            patch=0
            ;;
        c)
            patch=$((patch + 1))
            ;;
    esac
    
    local new_version="${major}.${minor}.${patch}"
    local new_tag="${VERSION_PREFIX}${new_version}"
    
    echo "新版本号: $new_tag"
    
    if [[ $? -eq 0 ]]; then
        echo "✅ 已更新 package.json 版本号为: ${new_version}"
    else
        echo "❌ 更新 package.json 失败" >&2
        exit 1
    fi
    
    # 检查 tag 是否已存在
    if git rev-parse "$new_tag" >/dev/null 2>&1; then
        echo "错误: Tag '$new_tag' 已存在" >&2
        exit 1
    fi

    # 更新 package.json 中的版本号
    npm version "${new_version}" --no-git-tag-version --allow-same-version > /dev/null 2>&1

    git add package.json
    git commit -m "chore(release): ${new_version}"
    
    
    # 设置默认 message
    if [[ -z "$message" ]]; then
        message="Release $new_version"
    fi
    
    # 创建 tag
    git tag -a "$new_tag" -m "$message"
    
    if [[ $? -eq 0 ]]; then
        echo "✅ 成功创建 tag: $new_tag"
        echo ""
        echo "推送到远程仓库:"
        echo "  git push origin $new_tag"
    else
        echo "❌ 创建 tag 失败" >&2
        exit 1
    fi
}

main "$@"
