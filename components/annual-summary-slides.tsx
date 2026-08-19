import { createElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import {
  FaChevronLeft,
  FaChevronRight,
  FaCoins,
  FaCommentDots,
  FaDownload,
  FaEye,
  FaEyeSlash,
  FaFire,
  FaHeart,
  FaPenNib,
  FaSignInAlt,
  FaStar,
  FaTrophy,
} from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { toPng } from 'html-to-image';
import type { AnnualSummaryData, Title } from '@/types/summary';
import { getIsDarkMode } from '@/service/utils';

// ==================== 成就（称号）展示配置 ====================

// 稀有度配置：按 priority(1-4) 映射为 青铜/白银/黄金/钻石
const TIER_CONFIG = [
  { label: '青铜', gradient: 'linear-gradient(135deg, #a47148 0%, #d9a05b 100%)', glow: 'rgba(169, 113, 72, 0.35)' },
  { label: '白银', gradient: 'linear-gradient(135deg, #8e9eab 0%, #c7d3da 100%)', glow: 'rgba(142, 158, 171, 0.35)' },
  { label: '黄金', gradient: 'linear-gradient(135deg, #e6a700 0%, #ffd966 100%)', glow: 'rgba(230, 167, 0, 0.4)' },
  { label: '钻石', gradient: 'linear-gradient(135deg, #00b4d8 0%, #a78bfa 100%)', glow: 'rgba(0, 180, 216, 0.4)' },
];

const CATEGORY_META: Record<Title['category'], { icon: IconType; label: string }> = {
  login: { icon: FaSignInAlt, label: '登录' },
  content: { icon: FaCommentDots, label: '内容' },
  interaction: { icon: FaHeart, label: '互动' },
  wealth: { icon: FaCoins, label: '财富' },
  activity: { icon: FaFire, label: '活跃' },
};

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function getTier(priority: number): number {
  return Math.min(Math.max(priority, 1), 4);
}

// ==================== 页面背景与装饰 ====================

const SlidesContainer = styled.div<{ $isDarkMode: boolean }>`
  width: 100%;
  height: 100%;
  background: ${props => props.$isDarkMode
    ? 'linear-gradient(160deg, #1a1a2e 0%, #16213e 55%, #1f1040 100%)'
    : 'linear-gradient(160deg, #f2f5ff 0%, #ffffff 55%, #fdf1ff 100%)'};
  overflow: hidden;
  position: relative;
`;

const Orb = styled.div<{ $size: number; $color: string; $isDarkMode: boolean }>`
  position: absolute;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  border-radius: 50%;
  background: radial-gradient(circle, ${props => props.$color} 0%, transparent 70%);
  opacity: ${props => props.$isDarkMode ? 1 : 0.8};
  pointer-events: none;
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
  margin-top: 36px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SectionIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 10px rgba(102, 126, 234, 0.35);
`;

const Subtitle = styled.h2<{ $isDarkMode: boolean }>`
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: ${props => props.$isDarkMode ? '#fff' : '#2d2d3f'};
`;

const SlideBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
`;

// ==================== 数据统计 ====================

const StatGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 10px 0;
`;

const StatNumber = styled.div`
  font-size: 46px;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #667eea 0%, #a855f7 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
`;

const StatLabel = styled.div<{ $isDarkMode: boolean }>`
  font-size: 14px;
  color: ${props => props.$isDarkMode ? '#a9a9c8' : '#8a8aa3'};
`;

// ==================== 封面 ====================

const CoverYear = styled.div`
  font-size: 72px;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
`;

const CoverTitle = styled.h1<{ $isDarkMode: boolean }>`
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 20px 0;
  color: ${props => props.$isDarkMode ? '#fff' : '#2d2d3f'};
`;

const CoverUser = styled.div<{ $isDarkMode: boolean }>`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.$isDarkMode ? '#c6c6de' : '#666'};
  margin-bottom: 8px;
`;

const Tagline = styled.div<{ $isDarkMode: boolean }>`
  font-size: 13px;
  color: ${props => props.$isDarkMode ? '#8d8dab' : '#9a9ab0'};
`;

const FloatingEmoji = styled.span<{ $isDarkMode: boolean }>`
  position: absolute;
  font-size: 26px;
  opacity: ${props => props.$isDarkMode ? 0.45 : 0.3};
  pointer-events: none;
  animation: float 4s ease-in-out infinite;

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
`;

// ==================== 成就章（统计页底部） ====================

const SlideTitlesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  max-width: 340px;
`;

const AchievementChip = styled.span<{ $tier: number }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: ${props => TIER_CONFIG[props.$tier - 1].gradient};
  box-shadow: 0 2px 8px ${props => TIER_CONFIG[props.$tier - 1].glow};
  white-space: nowrap;
`;

// ==================== 年度成就页（奖牌墙） ====================

const AchievementsLayout = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px 24px;
  box-sizing: border-box;
`;

const AchievementsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  width: 100%;
`;

const MedalCard = styled.div<{ $tier: number; $isDarkMode: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: calc(50% - 6px);
  min-width: 140px;
  padding: 14px 10px;
  border-radius: 16px;
  box-sizing: border-box;
  background: ${props => props.$isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.92)'};
  border: 1px solid ${props => props.$isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(102, 126, 234, 0.16)'};
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
`;

const MedalIcon = styled.div<{ $tier: number }>`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  background: ${props => TIER_CONFIG[props.$tier - 1].gradient};
  box-shadow: 0 4px 12px ${props => TIER_CONFIG[props.$tier - 1].glow};
`;

const MedalName = styled.div<{ $isDarkMode: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${props => props.$isDarkMode ? '#fff' : '#333'};
  text-align: center;
`;

const MedalDesc = styled.div<{ $isDarkMode: boolean }>`
  font-size: 11px;
  color: ${props => props.$isDarkMode ? '#9a9ac0' : '#8a8aa3'};
  text-align: center;
  line-height: 1.4;
`;

const MedalTag = styled.span<{ $tier: number }>`
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: ${props => TIER_CONFIG[props.$tier - 1].gradient};
  opacity: 0.9;
`;

// ==================== 热力图 ====================

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

// ==================== 控制按钮（渲染到遮罩层，不遮挡幻灯片） ====================

const ControlsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const NavButton = styled.button`
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.16);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

const PageIndicator = styled.div`
  color: #fff;
  font-size: 14px;
  padding: 0 8px;
  min-width: 44px;
  text-align: center;
`;

const ControlsDivider = styled.div`
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.28);
  margin: 0 4px;
`;

const ActionButton = styled.button`
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(102, 126, 234, 0.9);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: rgba(102, 126, 234, 1);
  }
`;

// ==================== 工具函数 ====================

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

interface AnnualSummarySlidesProps {
  data: AnnualSummaryData;
  controlsHost?: HTMLElement | null;
}

export function AnnualSummarySlides({ data, controlsHost }: AnnualSummarySlidesProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setIsDarkMode(getIsDarkMode());
  }, []);

  const showHeatmap = hasActivityData(data.stats.activityHeatmap);
  const totalSlides = showHeatmap ? 9 : 8;
  const { stats, titles } = data;
  const heatmapIndex = showHeatmap ? 7 : -1;
  const titlesIndex = showHeatmap ? 8 : 7;

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
      const dataUrl = await toPng(currentSlide, {
        pixelRatio: 2,
        backgroundColor: isDarkMode ? '#1a1a2e' : '#f2f5ff',
        skipFonts: true,
        cacheBust: true,
        filter: (node: HTMLElement) => {
          // 跳过可能导致问题的节点
          if (node.tagName === 'SCRIPT' || node.tagName === 'LINK') {
            return false;
          }
          return true;
        },
      });
      
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `v2ex-annual-summary-${data.year}-page-${currentIndex + 1}.png`;
      a.click();
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const renderStat = (value: number, label: string, key: string) =>
    createElement(
      StatGroup,
      { key },
      createElement(AnimatedNumber, { value }),
      createElement(StatLabel, { $isDarkMode: isDarkMode }, label)
    );

  const renderStatSlide = (
    index: number,
    slideType: string,
    sectionText: string,
    icon: IconType,
    statBlocks: ReturnType<typeof renderStat>[]
  ) => {
    return (
      <Slide key={index} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[index] = el; }}>
        <SlideContent>
          <SlideTitle>
            <SectionIcon>{createElement(icon)}</SectionIcon>
            <Subtitle $isDarkMode={isDarkMode}>{sectionText}</Subtitle>
          </SlideTitle>
          <SlideBody>
            {statBlocks}
            {renderAchievementChips(slideType)}
          </SlideBody>
        </SlideContent>
      </Slide>
    );
  };

  const renderAchievementChips = (slideType: string) => {
    const related = getSlideRelatedTitles(titles, slideType);
    if (related.length === 0) return null;

    return createElement(
      SlideTitlesContainer,
      null,
      related.map(title =>
        createElement(
          AchievementChip,
          { key: title.id, $tier: getTier(title.priority) },
          createElement(CATEGORY_META[title.category].icon, { size: 10 }),
          title.name
        )
      )
    );
  };

  const renderHeatmap = () => {
    const { data: heatmapData, maxValue } = stats.activityHeatmap;
    
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
    switch (index) {
      case 0:
        return (
          <Slide key={0} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[0] = el; }}>
            <SlideContent>
              <SlideBody>
                <FloatingEmoji $isDarkMode={isDarkMode} style={{ top: '70px', left: '46px' }}>✨</FloatingEmoji>
                <FloatingEmoji $isDarkMode={isDarkMode} style={{ top: '110px', right: '52px', animationDelay: '1s' }}>🎉</FloatingEmoji>
                <FloatingEmoji $isDarkMode={isDarkMode} style={{ bottom: '150px', left: '64px', animationDelay: '2s' }}>💬</FloatingEmoji>
                <FloatingEmoji $isDarkMode={isDarkMode} style={{ bottom: '120px', right: '60px', animationDelay: '3s' }}>🌟</FloatingEmoji>
                <CoverYear>{data.year}</CoverYear>
                <CoverTitle $isDarkMode={isDarkMode}>年度总结</CoverTitle>
                <CoverUser $isDarkMode={isDarkMode}>@{data.username}</CoverUser>
                <Tagline $isDarkMode={isDarkMode}>感谢你陪伴 V2EX 又一年</Tagline>
              </SlideBody>
            </SlideContent>
          </Slide>
        );

      case 1:
        return renderStatSlide(1, 'login', '登录统计', FaSignInAlt, [
          renderStat(stats.login.totalCount, '总登录次数', 'login-count'),
          renderStat(stats.login.totalCoins, '获得铜币', 'login-coins'),
          renderStat(stats.login.consecutiveDays, `连续登录 ${stats.login.consecutiveDays} 天`, 'login-days'),
        ]);

      case 2:
        return renderStatSlide(2, 'reply', '回复统计', FaCommentDots, [
          renderStat(stats.reply.totalCount, '总回复次数', 'reply-count'),
          renderStat(stats.reply.totalCoinsSpent, '消耗铜币', 'reply-coins'),
        ]);

      case 3:
        return renderStatSlide(3, 'post', '发帖统计', FaPenNib, [
          renderStat(stats.post.totalCount, '总发帖次数', 'post-count'),
          renderStat(stats.post.totalCoinsSpent, '消耗铜币', 'post-coins'),
        ]);

      case 4:
        return renderStatSlide(4, 'thank', '感谢统计', FaHeart, [
          renderStat(stats.thank.totalCount, '感谢他人次数', 'thank-count'),
          renderStat(stats.thank.totalCoinsSpent, '消耗铜币', 'thank-coins'),
        ]);

      case 5:
        return renderStatSlide(5, 'receivedThank', '收到感谢', FaStar, [
          renderStat(stats.receivedThank.totalCount, '收到感谢次数', 'received-thank-count'),
          renderStat(stats.receivedThank.totalCoinsReceived, '获得铜币', 'received-thank-coins'),
        ]);

      case 6:
        return renderStatSlide(6, 'balance', '铜币收支', FaCoins, [
          renderStat(stats.balance.totalIncome, '总收入', 'balance-income'),
          renderStat(stats.balance.totalExpense, '总支出', 'balance-expense'),
          renderStat(stats.balance.netChange, '净变化', 'balance-net'),
        ]);

      default:
        // 热力图页面（仅当 showHeatmap 为 true 时）
        if (index === heatmapIndex && showHeatmap) {
          return (
            <Slide key={7} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[7] = el; }}>
              <SlideContent>
                <SlideTitle>
                  <SectionIcon>{createElement(FaFire)}</SectionIcon>
                  <Subtitle $isDarkMode={isDarkMode}>活动热力图</Subtitle>
                </SlideTitle>
                <SlideBody>
                  <StatLabel $isDarkMode={isDarkMode}>你的活跃时间分布</StatLabel>
                  {renderHeatmap()}
                  {renderAchievementChips('heatmap')}
                </SlideBody>
              </SlideContent>
            </Slide>
          );
        }

        // 年度成就页
        if (index === titlesIndex) {
          const sortedTitles = [...titles].sort((a, b) => b.priority - a.priority);
          return (
            <Slide key={index} $totalSlides={totalSlides} ref={(el) => { slideRefs.current[index] = el; }}>
              <AchievementsLayout>
                <SlideTitle>
                  <SectionIcon>{createElement(FaTrophy)}</SectionIcon>
                  <Subtitle $isDarkMode={isDarkMode}>年度成就</Subtitle>
                </SlideTitle>
                <AchievementsGrid>
                  {sortedTitles.map(title => {
                    const tier = getTier(title.priority);
                    const meta = CATEGORY_META[title.category];
                    return createElement(
                      MedalCard,
                      { key: title.id, $tier: tier, $isDarkMode: isDarkMode },
                      createElement(MedalIcon, { $tier: tier }, createElement(meta.icon)),
                      createElement(MedalName, { $isDarkMode: isDarkMode }, title.name),
                      createElement(
                        MedalDesc,
                        { $isDarkMode: isDarkMode },
                        isPrivacyMode ? title.thresholdDescription : title.description
                      ),
                      createElement(MedalTag, { $tier: tier }, `${TIER_CONFIG[tier - 1].label} · ${meta.label}`)
                    );
                  })}
                </AchievementsGrid>
              </AchievementsLayout>
            </Slide>
          );
        }

        return null;
    }
  };

  return (
    <SlidesContainer $isDarkMode={isDarkMode}>
      <Orb $size={240} $color="rgba(102, 126, 234, 0.28)" $isDarkMode={isDarkMode} style={{ top: '-80px', left: '-70px' }} />
      <Orb $size={280} $color="rgba(168, 85, 247, 0.22)" $isDarkMode={isDarkMode} style={{ top: '35%', right: '-100px' }} />
      <Orb $size={200} $color="rgba(236, 72, 153, 0.18)" $isDarkMode={isDarkMode} style={{ bottom: '-60px', left: '25%' }} />
      <SlideWrapper $currentIndex={currentIndex} $totalSlides={totalSlides}>
        {Array.from({ length: totalSlides }, (_, i) => renderSlide(i))}
      </SlideWrapper>
      {controlsHost && createPortal(
        <ControlsBar>
          <NavButton onClick={handlePrev} disabled={currentIndex === 0}>
            <FaChevronLeft />
          </NavButton>
          <PageIndicator>
            {currentIndex + 1} / {totalSlides}
          </PageIndicator>
          <NavButton onClick={handleNext} disabled={currentIndex === totalSlides - 1}>
            <FaChevronRight />
          </NavButton>
          <ControlsDivider />
          <ActionButton onClick={handleDownload} title="下载当前页面">
            <FaDownload />
          </ActionButton>
          {currentIndex === totalSlides - 1 && (
            <ActionButton onClick={() => setIsPrivacyMode(!isPrivacyMode)} title={isPrivacyMode ? '显示详细数据' : '隐藏详细数据'}>
              {isPrivacyMode ? <FaEyeSlash /> : <FaEye />}
            </ActionButton>
          )}
        </ControlsBar>,
        controlsHost
      )}
    </SlidesContainer>
  );
}
