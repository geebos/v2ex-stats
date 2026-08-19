import { createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import styled from 'styled-components';
import { FaTimes } from 'react-icons/fa';
import { initBalanceData } from '@/service/balance/crawler';
import { setAnnualReportInited } from '@/service/storage';
import { THEME_GRADIENT, THEME_LIGHT_RGB } from './theme';

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 999998;
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled.div`
  position: relative;
  width: 400px;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 24px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  color: #666;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.2);
  }
`;

const Title = styled.h3`
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
`;

const Description = styled.p`
  margin: 0 0 20px 0;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  ${props => props.$primary ? `
    background: ${THEME_GRADIENT};
    color: white;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(${THEME_LIGHT_RGB}, 0.4);
    }
  ` : `
    background: #f3f4f6;
    color: #666;
    
    &:hover {
      background: #e5e7eb;
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ProgressContainer = styled.div`
  margin-top: 16px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 30%;
    height: 100%;
    background: ${THEME_GRADIENT};
    animation: loading 1.5s ease-in-out infinite;
  }

  @keyframes loading {
    0% {
      left: -30%;
    }
    100% {
      left: 100%;
    }
  }
`;

const ProgressText = styled.div`
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  text-align: center;
`;

interface AnnualDataInitModalProps {
  isOpen: boolean;
  username: string;
  year: number;
  onClose: () => void;
  onComplete: () => void;
}

function AnnualDataInitModal({ isOpen, username, year, onClose, onComplete }: AnnualDataInitModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<string>('');

  const handleConfirm = async () => {
    setIsLoading(true);
    
    try {
      // 使用 initBalanceData 抓取数据（与 balance-chart 逻辑一致）
      await initBalanceData(username, undefined, {
        onCrawl: (page, maxPage, records) => {
          // 从最后一条记录获取当前抓取到的月份
          if (records.length > 0) {
            const lastRecordDate = new Date(records[records.length - 1].timestamp);
            const monthStr = `${lastRecordDate.getFullYear()}年${lastRecordDate.getMonth() + 1}月`;
            setCurrentMonth(monthStr);
            
            // 检查 records 最后一条记录的 year 是否小于传入的 year，小于说明数据足够可以停止爬取
            if (lastRecordDate.getFullYear() < year) return false;
          }
        },
        onFinish: () => {
          console.log('[年度数据初始化] 完成');
        },
      });
      
      // 标记年度报告已初始化
      await setAnnualReportInited(username, year, true);
      onComplete();
    } catch (error) {
      console.error('[年度数据初始化] 失败:', error);
      alert('数据初始化失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalOverlay $isOpen={isOpen}>
      <ModalContent>
        {!isLoading && (
          <CloseButton onClick={onClose}>
            <FaTimes size={14} />
          </CloseButton>
        )}
        <Title>📊 初始化年度数据</Title>
        <Description>
          检测到您还没有 {year} 年的完整数据，需要先抓取数据才能生成年度报告。
          <br /><br />
          点击确认后将自动从您的余额页面抓取 {year} 年的记录，这可能需要几分钟时间。
          <br /><br />
          🔒 <strong>所有数据仅保存在您的浏览器本地，不会上传或以任何形式共享。</strong>
        </Description>
        
        {isLoading ? (
          <ProgressContainer>
            <ProgressBar />
            <ProgressText>
              正在抓取数据... {currentMonth ? `已抓取到 ${currentMonth}` : '准备中'}
            </ProgressText>
          </ProgressContainer>
        ) : (
          <ButtonGroup>
            <Button onClick={onClose}>取消</Button>
            <Button $primary onClick={handleConfirm}>确认初始化</Button>
          </ButtonGroup>
        )}
      </ModalContent>
    </ModalOverlay>
  );
}

let modalRoot: ReturnType<typeof createRoot> | null = null;
let modalContainer: HTMLDivElement | null = null;

interface ModalWrapperProps {
  username: string;
  year: number;
  onComplete: () => void;
  onCancel: () => void;
}

function ModalWrapper({ username, year, onComplete, onCancel }: ModalWrapperProps) {
  const [isOpen, setIsOpen] = useState(true);

  function handleClose() {
    setIsOpen(false);
    setTimeout(() => {
      cleanup();
      onCancel();
    }, 300);
  }

  function handleComplete() {
    setIsOpen(false);
    setTimeout(() => {
      cleanup();
      onComplete();
    }, 300);
  }

  return createElement(AnnualDataInitModal, {
    isOpen,
    username,
    year,
    onClose: handleClose,
    onComplete: handleComplete,
  });
}

function cleanup() {
  if (modalContainer) {
    modalContainer.remove();
    modalContainer = null;
    modalRoot = null;
  }
}

export function showAnnualDataInitModal(username: string, year: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'v2ex-stats-annual-data-init-modal';
      document.body.appendChild(modalContainer);
      modalRoot = createRoot(modalContainer);
    }

    modalRoot!.render(
      createElement(ModalWrapper, {
        username,
        year,
        onComplete: () => resolve(true),
        onCancel: () => resolve(false),
      })
    );
  });
}
