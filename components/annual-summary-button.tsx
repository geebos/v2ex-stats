import { createElement, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import styled from 'styled-components';
import { storage } from '@wxt-dev/storage';
import { getNearestYear } from '@/service/summary';

function isInDisplayPeriod(): boolean {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  // 12月25日 - 12月31日
  if (month === 12 && day >= 2) {
    return true;
  }
  // 1月1日 - 1月20日
  if (month === 1 && day <= 20) {
    return true;
  }
  return false;
}

function getHiddenStorageKey(username: string, year: number): `local:${string}` {
  return `local:annualSummaryHidden:${year}:${username}`;
}

const ButtonContainer = styled.div`
  margin: 16px 0 0 0;
  text-align: center;
`;

const SummaryButton = styled.button`
  width: 100%;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
`;

const FooterText = styled.div`
  margin-top: 4px;
  font-size: 10px;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HideLink = styled.a`
  color: #999;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    color: #666;
    text-decoration: underline;
  }
`;

interface AnnualSummaryButtonProps {
  username: string;
  onOpen: () => void;
}

function AnnualSummaryButton({ username, onOpen }: AnnualSummaryButtonProps) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    checkHiddenStatus();
  }, []);

  async function checkHiddenStatus() {
    const hidden = await storage.getItem<boolean>(getHiddenStorageKey(username, getNearestYear()), { fallback: false });
    setIsHidden(hidden);
  }

  async function handleHide() {
    await storage.setItem(getHiddenStorageKey(username, getNearestYear()), true);
    setIsHidden(true);
  }

  if (isHidden) {
    return null;
  }

  const nearestYear = getNearestYear();

  return (
    <ButtonContainer>
      <SummaryButton onClick={onOpen}>
        查看你的 {nearestYear} 年度总结
      </SummaryButton>
      <FooterText>
        <span>from V2EX Stats</span>
        <HideLink onClick={handleHide}>不再显示</HideLink>
      </FooterText>
    </ButtonContainer>
  );
}

export async function tryInitAnnualSummaryButton(
  username: string,
  onOpen: () => void
): Promise<void> {
  // 优先级最高：用户已点击不再显示
  const hidden = await storage.getItem<boolean>(getHiddenStorageKey(username, getNearestYear()), { fallback: false });
  if (hidden) {
    return;
  }

  // 只在首页显示
  if (window.location.pathname !== '/') {
    return;
  }

  // 只在 12.25-1.20 期间显示
  if (!isInDisplayPeriod()) {
    return;
  }

  const rightbar = document.getElementById('Rightbar');
  if (!rightbar) {
    console.log('未找到 Rightbar，跳过年终总结按钮初始化');
    return;
  }

  const profileBox = rightbar.querySelector('div.box') as HTMLDivElement | null;
  if (!profileBox) {
    console.log('未找到个人信息卡片（第一个 class=box 的 div），跳过年终总结按钮初始化');
    return;
  }

  const existingButton = document.getElementById('v2ex-stats-annual-summary-button');
  if (existingButton) {
    return;
  }

  const container = document.createElement('div');
  container.id = 'v2ex-stats-annual-summary-button';
  profileBox.after(container);

  createRoot(container).render(
    createElement(AnnualSummaryButton, { username, onOpen })
  );
}

