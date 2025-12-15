import { createElement, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { FaChevronLeft, FaChevronRight, FaDownload } from 'react-icons/fa';
import type { AnnualSummaryData } from '@/types/summary';
import { getIsDarkMode } from '@/service/utils';

const SlidesContainer = styled.div<{ $isDarkMode: boolean }>`
  width: 100%;
  height: 100%;
  background: ${props => props.$isDarkMode ? '#1a1a1a' : '#fff'};
  overflow: hidden;
  position: relative;
`;

const SlideWrapper = styled.div<{ $currentIndex: number; $totalSlides: number }>`
  display: flex;
  width: ${props => `${100 * props.$totalSlides}%`};
  height: 100%;
  transform: translateX(-${props => (props.$currentIndex * 100) / props.$totalSlides}%);
  transition: transform 0.3s ease;
`;

const Slide = styled.div<{ $totalSlides: number }>`
  width: ${props => `${100 / props.$totalSlides}%`};
  height: 100%;
  flex-shrink: 0;
  overflow-y: auto;
  position: relative;
`;

const SlideContent = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const SlideTitle = styled.div`
  flex-shrink: 0;
  margin-top: 40px;
  margin-bottom: 24px;
`;

const SlideBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-bottom: 60px;
`;

const Title = styled.h1<{ $isDarkMode: boolean }>`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.$isDarkMode ? '#fff' : '#000'};
`;

const Subtitle = styled.h2<{ $isDarkMode: boolean }>`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
  color: ${props => props.$isDarkMode ? '#ccc' : '#666'};
`;

const StatNumber = styled.div`
  font-size: 48px;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 16px;
`;

const StatLabel = styled.div<{ $isDarkMode: boolean }>`
  font-size: 16px;
  color: ${props => props.$isDarkMode ? '#999' : '#666'};
  margin-bottom: 8px;
`;

const TitleBadge = styled.span`
  display: inline-block;
  padding: 6px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
`;

const Navigation = styled.div`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  align-items: center;
`;

const NavButton = styled.button`
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.7);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const PageIndicator = styled.div<{ $isDarkMode: boolean }>`
  color: ${props => props.$isDarkMode ? '#fff' : '#000'};
  font-size: 14px;
  padding: 0 12px;
`;

const DownloadButton = styled.button`
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(102, 126, 234, 0.8);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 10;

  &:hover {
    background: rgba(102, 126, 234, 1);
  }
`;

interface AnnualSummarySlidesProps {
  data: AnnualSummaryData;
}

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (displayValue === value) return;
    setIsAnimating(true);
    const startValue = displayValue;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const currentValue = Math.floor(startValue + (endValue - startValue) * progress);
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <StatNumber>{displayValue.toLocaleString()}</StatNumber>;
}

export function AnnualSummarySlides({ data }: AnnualSummarySlidesProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setIsDarkMode(getIsDarkMode());
  }, []);

  const totalSlides = 9;

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalSlides - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDownload = async () => {
    const currentSlide = slideRefs.current[currentIndex];
    if (!currentSlide) return;
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(currentSlide, {
        scale: 2,
        backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `v2ex-annual-summary-${data.year}-page-${currentIndex + 1}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const renderSlide = (index: number) => {
    const { stats, titles } = data;

    switch (index) {
      case 0:
        return (
          <Slide key={0} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[0] = el; }}>
            <SlideContent>
              <SlideTitle>
                <Title $isDarkMode={isDarkMode}>我的 {data.year} 年度总结</Title>
              </SlideTitle>
              <SlideBody>
                <Subtitle $isDarkMode={isDarkMode}>@{data.username}</Subtitle>
                <StatLabel $isDarkMode={isDarkMode}>感谢你陪伴 V2EX 又一年</StatLabel>
              </SlideBody>
            </SlideContent>
          </Slide>
        );

      case 1:
        return (
          <Slide key={1} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[1] = el; }}>
            <SlideContent>
              <SlideTitle>
                <Subtitle $isDarkMode={isDarkMode}>登录统计</Subtitle>
              </SlideTitle>
              <SlideBody>
                <AnimatedNumber value={stats.login.totalCount} />
                <StatLabel $isDarkMode={isDarkMode}>总登录次数</StatLabel>
                <AnimatedNumber value={stats.login.totalCoins} />
                <StatLabel $isDarkMode={isDarkMode}>获得铜币</StatLabel>
                <AnimatedNumber value={stats.login.consecutiveDays} />
                <StatLabel $isDarkMode={isDarkMode}>连续登录 {stats.login.consecutiveDays} 天</StatLabel>
              </SlideBody>
            </SlideContent>
          </Slide>
        );

      case 2:
        return (
          <Slide key={2} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[2] = el; }}>
            <SlideContent>
              <SlideTitle>
                <Subtitle $isDarkMode={isDarkMode}>回复统计</Subtitle>
              </SlideTitle>
              <SlideBody>
                <AnimatedNumber value={stats.reply.totalCount} />
                <StatLabel $isDarkMode={isDarkMode}>总回复次数</StatLabel>
                <AnimatedNumber value={stats.reply.totalCoinsSpent} />
                <StatLabel $isDarkMode={isDarkMode}>消耗铜币</StatLabel>
              </SlideBody>
            </SlideContent>
          </Slide>
        );

      case 3:
        return (
          <Slide key={3} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[3] = el; }}>
            <SlideContent>
              <SlideTitle>
                <Subtitle $isDarkMode={isDarkMode}>发帖统计</Subtitle>
              </SlideTitle>
              <SlideBody>
                <AnimatedNumber value={stats.post.totalCount} />
                <StatLabel $isDarkMode={isDarkMode}>总发帖次数</StatLabel>
                <AnimatedNumber value={stats.post.totalCoinsSpent} />
                <StatLabel $isDarkMode={isDarkMode}>消耗铜币</StatLabel>
              </SlideBody>
            </SlideContent>
          </Slide>
        );

      case 4:
        return (
          <Slide key={4} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[4] = el; }}>
            <SlideContent>
              <SlideTitle>
                <Subtitle $isDarkMode={isDarkMode}>感谢统计</Subtitle>
              </SlideTitle>
              <SlideBody>
                <AnimatedNumber value={stats.thank.totalCount} />
                <StatLabel $isDarkMode={isDarkMode}>感谢他人次数</StatLabel>
                <AnimatedNumber value={stats.thank.totalCoinsSpent} />
                <StatLabel $isDarkMode={isDarkMode}>消耗铜币</StatLabel>
              </SlideBody>
            </SlideContent>
          </Slide>
        );

      case 5:
        return (
          <Slide key={5} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[5] = el; }}>
            <SlideContent>
              <SlideTitle>
                <Subtitle $isDarkMode={isDarkMode}>收到感谢</Subtitle>
              </SlideTitle>
              <SlideBody>
                <AnimatedNumber value={stats.receivedThank.totalCount} />
                <StatLabel $isDarkMode={isDarkMode}>收到感谢次数</StatLabel>
                <AnimatedNumber value={stats.receivedThank.totalCoinsReceived} />
                <StatLabel $isDarkMode={isDarkMode}>获得铜币</StatLabel>
              </SlideBody>
            </SlideContent>
          </Slide>
        );

      case 6:
        return (
          <Slide key={6} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[6] = el; }}>
            <SlideContent>
              <SlideTitle>
                <Subtitle $isDarkMode={isDarkMode}>铜币收支</Subtitle>
              </SlideTitle>
              <SlideBody>
                <AnimatedNumber value={stats.balance.totalIncome} />
                <StatLabel $isDarkMode={isDarkMode}>总收入</StatLabel>
                <AnimatedNumber value={stats.balance.totalExpense} />
                <StatLabel $isDarkMode={isDarkMode}>总支出</StatLabel>
                <AnimatedNumber value={stats.balance.netChange} />
                <StatLabel $isDarkMode={isDarkMode}>净变化</StatLabel>
              </SlideBody>
            </SlideContent>
          </Slide>
        );

      case 7:
        return (
          <Slide key={7} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[7] = el; }}>
            <SlideContent>
              <SlideTitle>
                <Subtitle $isDarkMode={isDarkMode}>活动热力图</Subtitle>
              </SlideTitle>
              <SlideBody>
                <StatLabel $isDarkMode={isDarkMode}>你的活跃时间分布</StatLabel>
              </SlideBody>
            </SlideContent>
          </Slide>
        );

      case 8:
        return (
          <Slide key={8} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[8] = el; }}>
            <SlideContent>
              <SlideTitle>
                <Subtitle $isDarkMode={isDarkMode}>我的称号</Subtitle>
              </SlideTitle>
              <SlideBody>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                  {titles.map(title => (
                    <TitleBadge key={title.id}>{title.name}</TitleBadge>
                  ))}
                </div>
              </SlideBody>
            </SlideContent>
          </Slide>
        );

      default:
        return null;
    }
  };

  return (
    <SlidesContainer $isDarkMode={isDarkMode}>
      <SlideWrapper $currentIndex={currentIndex} $totalSlides={totalSlides}>
        {Array.from({ length: totalSlides }, (_, i) => renderSlide(i))}
      </SlideWrapper>
      <Navigation>
        <NavButton onClick={handlePrev} disabled={currentIndex === 0}>
          <FaChevronLeft />
        </NavButton>
        <PageIndicator $isDarkMode={isDarkMode}>
          {currentIndex + 1} / {totalSlides}
        </PageIndicator>
        <NavButton onClick={handleNext} disabled={currentIndex === totalSlides - 1}>
          <FaChevronRight />
        </NavButton>
      </Navigation>
      <DownloadButton onClick={handleDownload}>
        <FaDownload />
      </DownloadButton>
    </SlidesContainer>
  );
}

