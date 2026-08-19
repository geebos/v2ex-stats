import { createElement, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import styled from 'styled-components';
import { FaTimes } from 'react-icons/fa';
import type { AnnualSummaryData } from '@/types/summary';
import { AnnualSummarySlides } from './annual-summary-slides';

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 999999;
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled.div`
  position: relative;
  width: 420px;
  height: 667px;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.32);
  }
`;

// 遮罩层上的控制按钮容器（幻灯片通过 portal 渲染进来，不遮挡幻灯片内容）
const ControlsHost = styled.div`
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
`;

interface AnnualSummaryModalProps {
  data: AnnualSummaryData | null;
  isOpen: boolean;
  onClose: () => void;
}

function AnnualSummaryModal({ data, isOpen, onClose }: AnnualSummaryModalProps) {
  const [controlsHost, setControlsHost] = useState<HTMLDivElement | null>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !data) {
    return null;
  }

  return (
    <ModalOverlay $isOpen={isOpen} onClick={handleOverlayClick}>
      <CloseButton onClick={onClose}>
        <FaTimes size={16} />
      </CloseButton>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <AnnualSummarySlides data={data} controlsHost={controlsHost} />
      </ModalContent>
      <ControlsHost ref={setControlsHost} />
    </ModalOverlay>
  );
}

let modalRoot: ReturnType<typeof createRoot> | null = null;
let modalContainer: HTMLDivElement | null = null;

function ModalWrapper({ data }: { data: AnnualSummaryData }) {
  const [isOpen, setIsOpen] = useState(true);

  function handleClose() {
    setIsOpen(false);
    setTimeout(() => {
      if (modalContainer) {
        modalContainer.remove();
        modalContainer = null;
        modalRoot = null;
      }
    }, 300);
  }

  return createElement(AnnualSummaryModal, {
    data,
    isOpen,
    onClose: handleClose,
  });
}

export function showAnnualSummaryModal(data: AnnualSummaryData): void {
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'v2ex-stats-annual-summary-modal';
    document.body.appendChild(modalContainer);
    modalRoot = createRoot(modalContainer);
  }

  modalRoot!.render(createElement(ModalWrapper, { data }));
}
