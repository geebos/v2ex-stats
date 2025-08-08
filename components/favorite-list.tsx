// React 相关导入
import { createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import styled from 'styled-components';

// 业务逻辑导入
import { getFavoriteList, initUpdateFavoriteListTrigger, updateFavoriteList } from "@/service/favorite/operate";
import { getCollapsedStatus, setCollapsedStatus } from "@/service/favorite/status";
import xpath from "@/service/xpath";
import type { FavoriteRecord } from "@/types/types";

// 收藏列表容器样式组件
const FavoriteListContainer = styled.div<{ $isCollapsed: boolean, $shouldAnimate: boolean, $isEmpty: boolean }>`
    // 折叠动画效果（仅在用户交互时启用）
    transition: ${props => (props.$shouldAnimate ? 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-in-out' : 'none')};
    transform-origin: top;
    height: ${props => {
      if (props.$isCollapsed) return '0';
      return 'auto';
    }};
    max-height: 400px;
    opacity: ${props => (props.$isCollapsed ? '0' : '1')};
    padding-top: ${props => (props.$isCollapsed ? '0' : 'initial')};
    padding-bottom: ${props => (props.$isCollapsed ? '0' : 'initial')};
    overflow-y: ${props => {
      if (props.$isCollapsed) return 'hidden';
      return props.$isEmpty ? 'visible' : 'auto';
    }};
    
    // 自定义滚动条样式
    scrollbar-width: thin;
    scrollbar-color: #d1d5db #f9fafb;

    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: #f9fafb;
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb:hover {
      background: #9ca3af;
    }
  `;

// 收藏列表组件
const FavoriteList = (props: { favoriteList: FavoriteRecord[], username: string, isCollapsed: boolean }) => {
  const [isCollapsed, setIsCollapsed] = useState(props.isCollapsed);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // 切换折叠状态
  const handleToggleCollapse = async () => {
    setShouldAnimate(true);
    setIsCollapsed(!isCollapsed);
    await setCollapsedStatus(props.username, !isCollapsed)
  };

  return <>
    {/* 收藏列表标题和折叠控制 */}
    <div className="cell flex-one-row">
      <span className="fade">关注的主题</span>
      <span
        onClick={handleToggleCollapse}
        style={{
          transition: 'transform 0.2s ease-in-out',
          display: 'inline-block',
          cursor: 'pointer',
          color: 'var(--link-color)',
        }}
      >
        {isCollapsed ? '▼ 展开' : '▲ 折叠'}
      </span>
    </div>

    {/* 收藏列表内容 */}
    <FavoriteListContainer $isCollapsed={isCollapsed} $shouldAnimate={shouldAnimate} $isEmpty={props.favoriteList.length === 0}>
      {props.favoriteList.length === 0 ? (
        <div className="cell" style={{ textAlign: 'center', color: 'var(--secondary-color, #9ca3af)' }}>
          暂无更新
        </div>
      ) : (
        props.favoriteList.map((item) => (
          <div className="cell from_" key={item.postId}>
            <table cellPadding="0" cellSpacing="0" border={0} width="100%">
              <tbody><tr>
                <td width="24" valign="middle" align="center">
                  <a href={item.memberLink}>
                    <img src={item.avatarUrl} width="24" style={{ borderRadius: '4px', verticalAlign: 'bottom' }} alt={item.title} />
                  </a>
                </td>
                <td width="10"></td>
                <td width="auto" valign="middle">
                  <span className="item_hot_topic_title">
                    <a href={item.postLink}>{item.title}</a>
                  </span>
                </td>
              </tr>
              </tbody></table>
          </div>
        ))
      )}
    </FavoriteListContainer>
  </>
}

// 尝试初始化收藏列表到页面
export const tryInitFavoriteList = async (username: string) => {
  console.log('尝试初始化收藏列表');

  // 初始化收藏列表更新触发器
  await initUpdateFavoriteListTrigger(username);

  // 创建收藏列表容器
  const box = document.createElement('div');
  box.className = 'box';

  // 找到插入位置
  const sep = xpath.findNode('//div[@id="Rightbar"]/div[@class="sep"][1]', document);
  if (!sep) {
    console.log('没有找到定位元素');
    return;
  }

  // 插入分隔符和容器
  const sep2 = document.createElement('div');
  sep2.className = 'sep';
  sep.parentElement?.insertBefore(sep2, sep);
  sep.parentElement?.insertBefore(box, sep);

  // 获取收藏列表数据并渲染
  const favoriteList = await getFavoriteList(username);
  const isCollapsed = await getCollapsedStatus(username);
  console.log('收藏列表', favoriteList);
  createRoot(box).render(createElement(FavoriteList, { favoriteList, username, isCollapsed }));
  console.log('收藏列表初始化完成');
}