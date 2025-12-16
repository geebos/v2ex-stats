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

const SlideTitlesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
`;

const HeatmapContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin: 16px 0;
`;

const HeatmapRow = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const HeatmapCell = styled.div<{ $intensity: number; $isDarkMode: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: ${props => {
    const intensity = props.$intensity;
    if (intensity === 0) {
      return props.$isDarkMode ? '#2d2d2d' : '#ebedf0';
    }
    const colors = props.$isDarkMode 
      ? ['#0e4429', '#006d32', '#26a641', '#39d353']
      : ['#9be9a8', '#40c463', '#30a14e', '#216e39'];
    const index = Math.min(Math.floor(intensity * 4), 3);
    return colors[index];
  }};
`;

const HeatmapLabel = styled.div<{ $isDarkMode: boolean }>`
  font-size: 10px;
  color: ${props => props.$isDarkMode ? '#999' : '#666'};
  width: 24px;
  text-align: right;
  margin-right: 4px;
`;

const HeatmapHourLabels = styled.div`
  display: flex;
  gap: 2px;
  margin-left: 28px;
`;

const HeatmapHourLabel = styled.div<{ $isDarkMode: boolean }>`
  width: 12px;
  font-size: 8px;
  color: ${props => props.$isDarkMode ? '#999' : '#666'};
  text-align: center;
`;

const HeatmapLegend = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
`;

const HeatmapLegendLabel = styled.span<{ $isDarkMode: boolean }>`
  font-size: 10px;
  color: ${props => props.$isDarkMode ? '#999' : '#666'};
`;

function getSlideRelatedTitles(titles: AnnualSummaryData['titles'], slideType: string) {
  const prefixMap: Record<string, string[]> = {
    login: ['login-'],
    reply: ['reply-'],
    post: ['post-'],
    thank: ['thank-'],
    receivedThank: ['received-thank-'],
    balance: ['balance-'],
    heatmap: ['activity-'],
  };

  const prefixes = prefixMap[slideType];
  if (!prefixes) return [];

  return titles.filter(title => 
    prefixes.some(prefix => title.id.startsWith(prefix))
  );
}

function hasActivityData(data: AnnualSummaryData['stats']['activityHeatmap']): boolean {
  if (!data || !data.data || data.data.length === 0) return false;
  return data.maxValue > 0;
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

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export function AnnualSummarySlides({ data }: AnnualSummarySlidesProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setIsDarkMode(getIsDarkMode());
  }, []);

  const showHeatmap = hasActivityData(data.stats.activityHeatmap);
  const totalSlides = showHeatmap ? 9 : 8;

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

  const renderHeatmap = () => {
    const { data: heatmapData, maxValue } = data.stats.activityHeatmap;
    
    return (
      <HeatmapContainer>
        <HeatmapHourLabels>
          {Array.from({ length: 24 }, (_, i) => (
            <HeatmapHourLabel key={i} $isDarkMode={isDarkMode}>
              {i % 3 === 0 ? i : ''}
            </HeatmapHourLabel>
          ))}
        </HeatmapHourLabels>
        {WEEKDAY_LABELS.map((label, weekday) => (
          <HeatmapRow key={weekday}>
            <HeatmapLabel $isDarkMode={isDarkMode}>{label}</HeatmapLabel>
            {Array.from({ length: 24 }, (_, hour) => {
              const value = heatmapData[weekday]?.[hour] ?? 0;
              const intensity = maxValue > 0 ? value / maxValue : 0;
              return (
                <HeatmapCell
                  key={hour}
                  $intensity={intensity}
                  $isDarkMode={isDarkMode}
                  title={`周${label} ${hour}:00 - ${value} 次活动`}
                />
              );
            })}
          </HeatmapRow>
        ))}
        <HeatmapLegend>
          <HeatmapLegendLabel $isDarkMode={isDarkMode}>少</HeatmapLegendLabel>
          {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
            <HeatmapCell key={i} $intensity={intensity} $isDarkMode={isDarkMode} />
          ))}
          <HeatmapLegendLabel $isDarkMode={isDarkMode}>多</HeatmapLegendLabel>
        </HeatmapLegend>
      </HeatmapContainer>
    );
  };

  const renderSlide = (index: number) => {
    const { stats, titles } = data;
    
    // 计算实际的幻灯片类型
    // 0: cover, 1: login, 2: reply, 3: post, 4: thank, 5: receivedThank, 6: balance
    // 如果有热力图: 7: heatmap, 8: titles
    // 如果没有热力图: 7: titles
    const heatmapIndex = showHeatmap ? 7 : -1;
    const titlesIndex = showHeatmap ? 8 : 7;

    switch (index) {
      case 0:
        return (
          <Slide key={0} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[0] = el; }}>
            <SlideContent>
              <SlideBody>
                <Title $isDarkMode={isDarkMode}>{data.year} 年度总结</Title>
                <Subtitle $isDarkMode={isDarkMode} style={{ marginTop: '16px' }}>@{data.username}</Subtitle>
                <StatLabel $isDarkMode={isDarkMode}>感谢你陪伴 V2EX 又一年</StatLabel>
              </SlideBody>
            </SlideContent>
          </Slide>
        );

      case 1: {
        const loginTitles = getSlideRelatedTitles(titles, 'login');
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
                {loginTitles.length > 0 && (
                  <SlideTitlesContainer>
                    {loginTitles.map(title => (
                      <TitleBadge key={title.id}>{title.name}</TitleBadge>
                    ))}
                  </SlideTitlesContainer>
                )}
              </SlideBody>
            </SlideContent>
          </Slide>
        );
      }

      case 2: {
        const replyTitles = getSlideRelatedTitles(titles, 'reply');
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
                {replyTitles.length > 0 && (
                  <SlideTitlesContainer>
                    {replyTitles.map(title => (
                      <TitleBadge key={title.id}>{title.name}</TitleBadge>
                    ))}
                  </SlideTitlesContainer>
                )}
              </SlideBody>
            </SlideContent>
          </Slide>
        );
      }

      case 3: {
        const postTitles = getSlideRelatedTitles(titles, 'post');
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
                {postTitles.length > 0 && (
                  <SlideTitlesContainer>
                    {postTitles.map(title => (
                      <TitleBadge key={title.id}>{title.name}</TitleBadge>
                    ))}
                  </SlideTitlesContainer>
                )}
              </SlideBody>
            </SlideContent>
          </Slide>
        );
      }

      case 4: {
        const thankTitles = getSlideRelatedTitles(titles, 'thank');
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
                {thankTitles.length > 0 && (
                  <SlideTitlesContainer>
                    {thankTitles.map(title => (
                      <TitleBadge key={title.id}>{title.name}</TitleBadge>
                    ))}
                  </SlideTitlesContainer>
                )}
              </SlideBody>
            </SlideContent>
          </Slide>
        );
      }

      case 5: {
        const receivedThankTitles = getSlideRelatedTitles(titles, 'receivedThank');
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
                {receivedThankTitles.length > 0 && (
                  <SlideTitlesContainer>
                    {receivedThankTitles.map(title => (
                      <TitleBadge key={title.id}>{title.name}</TitleBadge>
                    ))}
                  </SlideTitlesContainer>
                )}
              </SlideBody>
            </SlideContent>
          </Slide>
        );
      }

      case 6: {
        const balanceTitles = getSlideRelatedTitles(titles, 'balance');
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
                {balanceTitles.length > 0 && (
                  <SlideTitlesContainer>
                    {balanceTitles.map(title => (
                      <TitleBadge key={title.id}>{title.name}</TitleBadge>
                    ))}
                  </SlideTitlesContainer>
                )}
              </SlideBody>
            </SlideContent>
          </Slide>
        );
      }

      default:
        // 热力图页面（仅当 showHeatmap 为 true 时）
        if (index === heatmapIndex && showHeatmap) {
          const heatmapTitles = getSlideRelatedTitles(titles, 'heatmap');
          return (
            <Slide key={7} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[7] = el; }}>
              <SlideContent>
                <SlideTitle>
                  <Subtitle $isDarkMode={isDarkMode}>活动热力图</Subtitle>
                </SlideTitle>
                <SlideBody>
                  <StatLabel $isDarkMode={isDarkMode}>你的活跃时间分布</StatLabel>
                  {renderHeatmap()}
                  {heatmapTitles.length > 0 && (
                    <SlideTitlesContainer>
                      {heatmapTitles.map(title => (
                        <TitleBadge key={title.id}>{title.name}</TitleBadge>
                      ))}
                    </SlideTitlesContainer>
                  )}
                </SlideBody>
              </SlideContent>
            </Slide>
          );
        }

        // 称号汇总页面
        if (index === titlesIndex) {
          return (
            <Slide key={index} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[index] = el; }}>
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
        }

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

