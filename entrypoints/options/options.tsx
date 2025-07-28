import React, { useState, useEffect } from 'react';
import { ConfigOptions } from '@/types/types';
import { getConfig, setConfig, resetConfig } from '@/service/config';

// Toast 提示组件
interface ToastProps {
  message: string;
  visible: boolean;
  type?: 'success' | 'error' | 'info';
}

const Toast: React.FC<ToastProps> = ({ message, visible, type = 'success' }) => {
  // 动态样式计算
  const getToastStyles = () => {
    const baseStyles = "fixed top-4 left-1/2 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 transform transition-all duration-300 z-50";
    const typeStyles = {
      success: "bg-green-600 text-white",
      error: "bg-red-600 text-white",
      info: "bg-blue-600 text-white"
    };
    return visible 
      ? `${baseStyles} -translate-x-1/2 translate-y-0 opacity-100 ${typeStyles[type]}`
      : `${baseStyles} -translate-x-1/2 -translate-y-full opacity-0`;
  };

  // 图标渲染
  const getIcon = () => {
    const iconProps = { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" };
    switch (type) {
      case 'success':
        return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;
      case 'error':
        return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;
      case 'info':
        return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
  };

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      <span className="font-medium">{message}</span>
    </div>
  );
};

const OptionsPage: React.FC = () => {
  // 状态管理
  const [config, setConfigState] = useState<ConfigOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // 初始化加载配置
  useEffect(() => {
    const loadConfig = async () => {
      const currentConfig = await getConfig();
      setConfigState(currentConfig);
      setLoading(false);
    };
    loadConfig();
  }, []);

  // Toast 显示函数
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  // 配置更新函数
  const updateConfig = (section: keyof ConfigOptions, key: string, value: boolean) => {
    if (!config) return;
    setConfigState(prev => ({
      ...prev!,
      [section]: { ...prev![section], [key]: value }
    }));
  };

  // 保存配置
  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await setConfig(config);
      showToast('设置保存成功！', 'success');
    } catch (error) {
      console.error('保存配置失败:', error);
      showToast('保存失败，请重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 重置配置
  const handleReset = async () => {
    if (!confirm('确认要重置所有设置到默认值吗？')) return;
    try {
      await resetConfig();
      const defaultConfig = await getConfig();
      setConfigState(defaultConfig);
      showToast('设置已重置为默认值', 'info');
    } catch (error) {
      console.error('重置配置失败:', error);
      showToast('重置失败，请重试', 'error');
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    );
  }

  // 错误状态
  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-red-600">加载配置失败</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg">
          {/* 页面标题 */}
          <div className="px-6 py-3 border-b border-gray-200 bg-blue-600">
            <h1 className="text-lg font-bold text-white">V2EX Stats 设置</h1>
            <p className="text-blue-100 text-sm">配置您的 V2EX 统计扩展功能</p>
          </div>

          <div className="p-4 space-y-5">
            {/* 金币统计设置 */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                金币统计
              </h2>
              <div className="ml-5 space-y-2">
                <label className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.coinStats.enabled}
                    onChange={(e) => updateConfig('coinStats', 'enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">显示金币统计</span>
                </label>
              </div>
            </div>

            {/* 活动时间设置 */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                活动时间
              </h2>
              <div className="ml-5 space-y-2">
                <label className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.activityTime.enableStats}
                    onChange={(e) => updateConfig('activityTime', 'enableStats', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">统计活动时间</span>
                </label>
                <label className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.activityTime.showInStatusBar}
                    onChange={(e) => updateConfig('activityTime', 'showInStatusBar', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    disabled={!config.activityTime.enableStats}
                  />
                  <span className={`text-gray-700 ${!config.activityTime.enableStats ? 'opacity-50' : ''}`}>
                    在状态条上显示活动时间
                  </span>
                </label>
                <label className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.activityTime.showDetailInProfile}
                    onChange={(e) => updateConfig('activityTime', 'showDetailInProfile', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    disabled={!config.activityTime.enableStats}
                  />
                  <span className={`text-gray-700 ${!config.activityTime.enableStats ? 'opacity-50' : ''}`}>
                    在个人页面显示统计详情
                  </span>
                </label>
              </div>
            </div>

            {/* 帖子浏览设置 */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                帖子浏览
              </h2>
              <div className="ml-5 space-y-2">
                <label className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.postBrowsing.showNewComments}
                    onChange={(e) => updateConfig('postBrowsing', 'showNewComments', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">显示新增评论</span>
                </label>
                <label className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.postBrowsing.highlightNewComments}
                    onChange={(e) => updateConfig('postBrowsing', 'highlightNewComments', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    disabled={!config.postBrowsing.showNewComments}
                  />
                  <span className={`text-gray-700 ${!config.postBrowsing.showNewComments ? 'opacity-50' : ''}`}>
                    高亮新增评论
                  </span>
                </label>
                <label className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.postBrowsing.autoScrollToFirstNewComment}
                    onChange={(e) => updateConfig('postBrowsing', 'autoScrollToFirstNewComment', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    disabled={!config.postBrowsing.showNewComments}
                  />
                  <span className={`text-gray-700 ${!config.postBrowsing.showNewComments ? 'opacity-50' : ''}`}>
                    自动滚动到第一条新评论
                  </span>
                </label>
                <label className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer ml-6">
                  <input
                    type="checkbox"
                    checked={config.postBrowsing.smoothScrolling}
                    onChange={(e) => updateConfig('postBrowsing', 'smoothScrolling', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    disabled={!config.postBrowsing.showNewComments || !config.postBrowsing.autoScrollToFirstNewComment}
                  />
                  <span className={`text-gray-700 ${!config.postBrowsing.showNewComments || !config.postBrowsing.autoScrollToFirstNewComment ? 'opacity-50' : ''}`}>
                    平滑滚动
                  </span>
                </label>
                <label className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.postBrowsing.markNewPosts}
                    onChange={(e) => updateConfig('postBrowsing', 'markNewPosts', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">标记新帖子</span>
                </label>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                重置设置
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving && (
                  <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span>{saving ? '保存中...' : '保存设置'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast 组件 */}
      <Toast message={toast.message} visible={toast.visible} type={toast.type} />
    </div>
  );
};

export default OptionsPage;