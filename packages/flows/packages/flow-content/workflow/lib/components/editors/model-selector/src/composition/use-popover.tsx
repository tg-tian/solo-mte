import { ref, computed } from 'vue';

/**
 * 管理Popover状态和行为的组合式函数
 */
export function usePopover(options: {
  currentStyle: any;
  diversityValue: any;
  samplingValue: any;
  nodeData: any;
}) {
  const modelStyleEnumData = [
    {
      name: '精准',
      value: 'Precise',
    },
    {
      name: '平衡',
      value: 'Balanced',
    },
    {
      name: '创意',
      value: 'Creative',
    },
    {
      name: '自定义',
      value: 'Custom',
    },
  ];

  // 解构传入的状态
  const { currentStyle, diversityValue, samplingValue, nodeData } = options;

  // Popover引用
  const popoverRef = ref();
  const popoverInstance = computed(() => popoverRef.value);

  /**
   * 关闭Popover
   */
  function closePopover(): void {
    if (popoverRef.value && typeof popoverRef.value.hide === 'function') {
      popoverRef.value.hide();
    }
  }

  /**
   * 模型风格变化处理
   */
  function modelStyleChange(newValue: string): void {
    // 确保 modelInfo 对象存在
    if (!nodeData.value.modelInfo) {
      nodeData.value.modelInfo = {};
    }

    // 更新 modelInfo 中的值
    nodeData.value.modelInfo.modelStyle = newValue;

    // 只有当风格是custom时才设置temperature和topP
    if (newValue === 'Custom') {
      // 如果切换到custom且之前没有设置过值，使用默认值
      if (nodeData.value.modelInfo.temperature === undefined) {
        nodeData.value.modelInfo.temperature = 0.6;
      }
      if (nodeData.value.modelInfo.topP === undefined) {
        nodeData.value.modelInfo.topP = 0.7;
      }
    } else {
      // 非custom风格时删除temperature和topP参数
      delete nodeData.value.modelInfo.temperature;
      delete nodeData.value.modelInfo.topP;
    }

    // 更新滑块的CSS变量（只有custom时才有滑块）
    setTimeout(() => {
      const sliders = document.querySelectorAll('.custom-slider');
      sliders.forEach((slider, index) => {
        if (newValue === 'Custom') {
          const value = index === 0 ? nodeData.value.modelInfo.temperature : nodeData.value.modelInfo.topP;
          if (slider instanceof HTMLElement) {
            slider.style.setProperty('--value', `${value * 100}%`);
          }
        }
      });
    }, 0);
  }

  /**
   * 温度滑块变化处理
   */
  function temperatureChange(event: Event): void {
    // 确保 modelInfo 对象存在
    if (!nodeData.value.modelInfo) {
      nodeData.value.modelInfo = {};
    }

    const value = parseFloat((event.target as HTMLInputElement).value);
    nodeData.value.modelInfo.temperature = value;
    // 更新滑块的渐变效果
    const slider = event.target as HTMLInputElement;
    slider.style.setProperty('--value', `${value * 100}%`);
    // 切换到自定义模式
    if (nodeData.value.modelInfo.modelStyle !== 'Custom') {
      nodeData.value.modelInfo.modelStyle = 'Custom';
    }
  }

  /**
   * Top P滑块变化处理
   */
  function topPChange(event: Event): void {
    // 确保 modelInfo 对象存在
    if (!nodeData.value.modelInfo) {
      nodeData.value.modelInfo = {};
    }

    const value = parseFloat((event.target as HTMLInputElement).value);
    nodeData.value.modelInfo.topP = value;
    // 更新滑块的渐变效果
    const slider = event.target as HTMLInputElement;
    slider.style.setProperty('--value', `${value * 100}%`);
    // 切换到自定义模式
    if (nodeData.value.modelInfo.modelStyle !== 'Custom') {
      nodeData.value.modelInfo.modelStyle = 'Custom';
    }
  }

  /**
   * 温度数字输入框变化处理
   */
  function temperatureInputChange(event: Event): void {
    // 确保 modelInfo 对象存在
    if (!nodeData.value.modelInfo) {
      nodeData.value.modelInfo = {};
    }

    let value = parseFloat((event.target as HTMLInputElement).value);
    // 限制范围在0-1之间
    value = Math.max(0, Math.min(1, value));
    // 如果是NaN，则设置为默认值0.6
    if (isNaN(value)) value = 0.6;
    nodeData.value.modelInfo.temperature = value;
    // 切换到自定义模式
    if (nodeData.value.modelInfo.modelStyle !== 'Custom') {
      nodeData.value.modelInfo.modelStyle = 'Custom';
    }
  }

  /**
   * Top P数字输入框变化处理
   */
  function topPInputChange(event: Event): void {
    // 确保 modelInfo 对象存在
    if (!nodeData.value.modelInfo) {
      nodeData.value.modelInfo = {};
    }

    let value = parseFloat((event.target as HTMLInputElement).value);
    // 限制范围在0-1之间
    value = Math.max(0, Math.min(1, value));
    // 如果是NaN，则设置为默认值0.7
    if (isNaN(value)) value = 0.7;
    nodeData.value.modelInfo.topP = value;
    // 切换到自定义模式
    if (nodeData.value.modelInfo.modelStyle !== 'Custom') {
      nodeData.value.modelInfo.modelStyle = 'Custom';
    }
  }

  /**
   * 渲染Popover内容
   */
  function renderPopoverContent() {
    return (
      <div class="model-settings">
        <div class="settings-header">
          <h3>模型设置</h3>
        </div>

        <div class="settings-section">
          <label class="section-title">模型风格</label>
          <div class="style-radio-group">
            {modelStyleEnumData.map((style: any) => (
              <label key={style.value} class="radio-label">
                <input
                  type="radio"
                  name="modelStyle"
                  value={style.value}
                  checked={currentStyle.value === style.value}
                  onChange={(e: Event) => modelStyleChange((e.target as HTMLInputElement).value)}
                />
                <span>{style.name}</span>
              </label>
            ))}
          </div>
        </div>

        {currentStyle.value === 'Custom' && (
          <div class="settings-section" style={{ width: '100%' }}>
            <div class="slider-item">
              <label>温度</label>
              <div class="slider-row">
                <div class="slider-container">
                  <span class="slider-min">0</span>
                  <input
                    type="range"
                    name="temperature"
                    min="0"
                    max="1"
                    step="0.1"
                    value={nodeData.value.modelInfo?.temperature || 0.6}
                    onInput={temperatureChange}
                    class="custom-slider"
                    style={{ '--value': `${(nodeData.value.modelInfo?.temperature || 0.6) * 100}%` }}
                  />
                  <span class="slider-max">1</span>
                </div>
                <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={nodeData.value.modelInfo?.temperature || 0.6}
                    onInput={temperatureInputChange}
                    class="slider-input"
                  />
              </div>
            </div>
          </div>
        )}

        {currentStyle.value === 'Custom' && (
          <div class="settings-section" style={{ width: '100%' }}>
            <div class="slider-item">
              <label>Top P</label>
              <div class="slider-row">
                <div class="slider-container">
                  <span class="slider-min">0</span>
                  <input
                    type="range"
                    name="topP"
                    min="0"
                    max="1"
                    step="0.1"
                    value={nodeData.value.modelInfo?.topP || 0.7}
                    onInput={topPChange}
                    class="custom-slider"
                    style={{ '--value': `${(nodeData.value.modelInfo?.topP || 0.7) * 100}%` }}
                  />
                  <span class="slider-max">1</span>
                </div>
                <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={nodeData.value.modelInfo?.topP || 0.7}
                    onInput={topPInputChange}
                    class="slider-input"
                  />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /**
   * 获取Popover组件配置
   */
  function getPopoverConfig() {
    return {
      popoverRef: popoverRef,
      popoverClass: 'model-popover',
      fitContent: true
    };
  }

  function openPopover() {
    return (
      <f-popover
        class='model-popover'
        placement='auto'
        ref={popoverRef}
        reference={popoverInstance.value}
        fitContent={true}
      >
        { renderPopoverContent() }
      </f-popover>
    )
  }



  return {
    openPopover,
    popoverInstance,
    closePopover,
    getPopoverConfig,
    renderPopoverContent,
    modelStyleChange,
    temperatureChange,
    temperatureInputChange,
    topPChange,
    topPInputChange
  };
}
