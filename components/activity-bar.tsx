import { getTodayTotalUsedSeconds } from "@/service/time/query";
import { createElement, useMemo } from "react";
import { createRoot } from "react-dom/client";
import styled from 'styled-components';

// 组件属性类型定义
export type ActivityBarProps = {
  username: string;
  percentage: number;
  seconds: number;
  color: {
    background: string;
    progress: string;
  };
};

// 样式组件定义
const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BarContainer = styled.div<{ $backgroundColor: string }>`
  height: 3px;
  background-color: ${props => props.$backgroundColor};
  border-radius: 2.5px;
  flex: 1;
  overflow: hidden;
`;

const ProgressBar = styled.div<{ $width: number; $progressColor: string }>`
  height: 100%;
  width: ${props => props.$width}%;
  background-color: ${props => props.$progressColor};
  border-radius: 2.5px;
  transition: width 0.3s ease;
`;

const TimeText = styled.a`
  font-size: 12px;
  color: #999!important;
  white-space: nowrap;
  cursor: pointer;
`;

// 格式化秒数为 1h10m, 30m 等格式
export const formatTime = (seconds: number, option?: {hour: string, minute: string, second: string}): string => {
  if(!option) {
    option = {hour: 'h', minute: 'm', second: 's'};
  }

  if (seconds < 60) {
    return `${seconds}${option.second}`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}${option.minute}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes === 0 ? `${hours}${option.hour}` : `${hours}${option.hour}${remainingMinutes}${option.minute}`;
};

// 活动状态条组件
const ActivityBar = (props: ActivityBarProps) => {
  const formattedTime = useMemo(() => {
    return formatTime(props.seconds);
  }, [props.seconds]);
  const formattedReadableTime = useMemo(() => {
    return formatTime(props.seconds, {hour: '小时', minute: '分钟', second: '秒'});
  }, [props.seconds]);

  return (
    <Container>
      <BarContainer $backgroundColor={props.color.background}>
        <ProgressBar
          $width={props.percentage}
          $progressColor={props.color.progress}
        />
      </BarContainer>
      <TimeText href={`/member/${props.username}`} title={`今日在线${formattedReadableTime}，点击查看在线详情`} target="_blank">{formattedTime}</TimeText>
    </Container>
  );
};

// 初始化活动条组件
export const tryInitActivityBar = async (username: string) => {
  // 查找活动条容器元素
  const activityDiv = document.getElementById('member-activity');
  if (!activityDiv) {
    console.log('没有找到活动条，不初始化');
    return;
  }

  // 获取外层进度条元素
  const outerBar = activityDiv.querySelector('.member-activity-bar')
  if (!outerBar) {
    console.log('没有找到外层进度条，不初始化');
    return;
  }

  // 获取内层进度条元素
  const innerBar = outerBar.querySelector('div');
  if (!innerBar) {
    console.log('没有找到内层进度条，不初始化');
    return;
  }

  // 提取样式和数据
  const backgroundColor = getComputedStyle(outerBar).backgroundColor;
  const progressColor = getComputedStyle(innerBar).backgroundColor;
  const percentage = parseInt(innerBar.style.width) || 0;
  const seconds = await getTodayTotalUsedSeconds(username);

  // 构建组件属性
  const props: ActivityBarProps = {
    username,
    percentage,
    seconds,
    color: {
      background: backgroundColor,
      progress: progressColor,
    },
  };

  console.log('初始化活动条参数', props);
  // 渲染活动条组件
  createRoot(activityDiv).render(createElement(ActivityBar, props));
};
