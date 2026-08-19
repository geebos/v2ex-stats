// ==================== 插件主题色（铜币铜金） ====================
// V2EX 最具辨识度的元素之一是「铜币」（虚拟货币），因此主题色选用铜金渐变，
// 替换原紫色/蓝色主题，使插件整体配色统一且贴合 V2EX 站点形象。
// 色值对齐 Tailwind amber 色阶：amber-500 #f59e0b / amber-600 #d97706 / amber-700 #b45309

/** 主题主渐变（铜金 → 深铜） */
export const THEME_GRADIENT = 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)';

/** 主题渐变亮端 RGB（用于 rgba() 透明度叠加） */
export const THEME_LIGHT_RGB = '245, 158, 11';

/** 主题渐变深端 RGB（用于 rgba() 透明度叠加） */
export const THEME_DARK_RGB = '180, 83, 9';
