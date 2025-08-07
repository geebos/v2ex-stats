import { getFavoriteList } from "@/service/favorite/operate";
import type { FavoriteRecord } from "@/types/types";
import xpath from "@/service/xpath";
import { createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { getCollapsedStatus, setCollapsedStatus } from "@/service/favorite/status";

const FavoriteList = (props: { favoriteList: FavoriteRecord[], username: string }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    (async () => {
      setIsCollapsed(await getCollapsedStatus(props.username))
    })()
  }, [props.username])

  const handleToggleCollapse = async () => {
    setIsCollapsed(!isCollapsed);
    await setCollapsedStatus(props.username, !isCollapsed)
  };

  return <>
    <style>{`
      .favorite-list-container {
        transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-in-out;
        overflow: hidden;
        transform-origin: top;
      }
      .favorite-list-container.collapsed {
        height: 0 !important;
        opacity: 0;
        padding-top: 0;
        padding-bottom: 0;
      }
      .favorite-list-container.expanded {
        height: 400px;
        opacity: 1;
      }
      .favorite-list-container::-webkit-scrollbar {
        width: 6px;
      }
      .favorite-list-container::-webkit-scrollbar-track {
        background: #f9fafb;
        border-radius: 3px;
      }
      .favorite-list-container::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;
      }
      .favorite-list-container::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }
    `}</style>
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
    <div
      className={`favorite-list-container ${isCollapsed ? 'collapsed' : 'expanded'}`}
      style={{
        overflowY: isCollapsed ? 'hidden' : 'auto',
        // 自定义滚动条样式
        scrollbarWidth: 'thin',
        scrollbarColor: '#d1d5db #f9fafb'
      }}
    >
      {props.favoriteList.map((item) => (
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
      ))}
    </div>
  </>
}


export const tryInitFavoriteList = async (username: string) => {
  console.log('尝试初始化收藏列表');
  const box = document.createElement('div');
  box.className = 'box';

  const sep = xpath.findNode('//div[@id="Rightbar"]/div[@class="sep"][1]', document);
  if (!sep) {
    console.log('没有找到定位元素');
    return;
  }
  const sep2 = document.createElement('div');
  sep2.className = 'sep';
  sep.parentElement?.insertBefore(sep2, sep);
  sep.parentElement?.insertBefore(box, sep);

  const favoriteList = await getFavoriteList();
  createRoot(box).render(createElement(FavoriteList, { favoriteList, username }));
  console.log('收藏列表初始化完成');
}