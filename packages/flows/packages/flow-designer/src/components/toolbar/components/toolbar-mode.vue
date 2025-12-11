<template>
  <div>
    <!-- 触发元素 -->
    <div id="hostMode" ref="hostModeRef"></div>
    <f-tooltip :content="currentMode === 'touch' ? '触控友好模式' : '鼠标友好模式'" placement="top" trigger="hover">
      <span class="tooltip-wrapper" style="width: 46px; height: 32px;" v-popover:toggle="popoverInstance">
        <img :src="currentMode === 'touch' ? ModeTouchIcon : ModeMouseIcon"
          :alt="currentMode === 'touch' ? '触控友好模式' : '鼠标友好模式'" />
        <i class="f-icon f-icon-arrow-chevron-down"></i>
      </span>
    </f-tooltip>

    <!-- 弹出层内容 -->
    <f-popover ref="modePopover" :host="hostModeRef" :reference="popoverInstance.value" title="" :z-index="20"
      placement="top-left" :keep-width-with-reference="false" :fit-content="true" class="popoverModeWraper">
      <template #default>
        <div class="popover_content">
          <div class="popover_title">交互模式</div>
          <div class="mode-list">
            <li :class="{ 'mode-selected': currentMode === 'mouse', 'mode-item': true }" @click="changeMode('mouse')">
              <div><img :src="ModeMouseIcon" alt="鼠标友好模式" /></div>
              <p>鼠标友好模式</p>
              <p>鼠标左键拖动画布，滚轮缩放</p>
            </li>
            <li :class="{ 'mode-selected': currentMode === 'touch', 'mode-item': true }" @click="changeMode('touch')">
              <div><img :src="ModeTouchIcon" alt="触控友好模式" /></div>
              <p>触控板友好模式</p>
              <p>双指同向移动拖动，双指张开捏合缩放</p>
            </li>
          </div>
        </div>
      </template>
    </f-popover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { default as ModeMouseIcon } from '../assets/toolbar/mode_mouse.svg';
import { default as ModeTouchIcon } from '../assets/toolbar/mode_touch.svg';

import './mode.css';

const modePopover = ref<HTMLElement>();
const hostModeRef = ref<HTMLElement>();
const popoverInstance = computed(() => modePopover);
// 定义当前交互模式
const currentMode = ref('touch');

// 切换交互模式
const changeMode = (mode: string) => {
  currentMode.value = mode;
};
</script>

<style lang="scss" scoped>
.popover_content {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 16px;
  width: 400px;
}

.popover_title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.mode-list {
  display: flex;
  gap: 16px;
}

.mode-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: #f9fafb;
  }

  img {
    width: 48px;
    height: 48px;
    margin-bottom: 8px;
  }

  p:first-of-type {
    font-size: 14px;
    font-weight: 500;
    color: #1f2937;
    margin-bottom: 4px;
  }

  p:last-of-type {
    font-size: 12px;
    color: #6b7280;
  }
}

.mode-selected {
  border-color: #60a5fa;
  background-color: #eff6ff;
}

.tooltip-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f0f2f5;
  }

  img {
    width: 20px;
    height: 20px;
    object-fit: contain;
    margin-right: 4px;
  }
}
</style>
