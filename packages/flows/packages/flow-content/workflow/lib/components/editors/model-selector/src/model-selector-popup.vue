<template>
  <TPopup trigger="click" placement="auto" :zIndex="20">
    <div class="f-icon f-icon-gear"></div>
    <template #content>
      <div class="model-settings-popup">
        <div class="settings-header">
          <h3>模型设置</h3>
        </div>

        <div class="settings-section">
          <label class="section-title">模型风格</label>
          <div class="style-radio-group">
            <label v-for="style in modelStyleEnumData" :key="style.value" class="radio-label">
              <input
                type="radio"
                name="modelStyle"
                :value="style.value"
                :checked="currentStyle === style.value"
                @change="modelStyleChange($event.target.value)"
              />
              <span>{{ style.name }}</span>
            </label>
          </div>
        </div>

        <div v-if="currentStyle === 'Custom'" class="settings-section" style="width: 100%">
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
                  :value="temperatureValue"
                  @input="temperatureChange"
                  class="custom-slider"
                  :style="`--value: ${(temperatureValue || 0.6) * 100}%`"
                />
                <span class="slider-max">1</span>
              </div>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                :value="temperatureValue"
                @input="temperatureInputChange"
                class="slider-input"
              />
            </div>
          </div>
        </div>

        <div v-if="currentStyle === 'Custom'" class="settings-section" style="width: 100%">
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
                  :value="topPValue"
                  @input="topPChange"
                  class="custom-slider"
                  :style="`--value: ${(topPValue || 0.7) * 100}%`"
                />
                <span class="slider-max">1</span>
              </div>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                :value="topPValue"
                @input="topPInputChange"
                class="slider-input"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </TPopup>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { TPopup } from '@farris/flow-devkit';

const props = defineProps<{
  currentStyle: any;
  temperatureValue: any;
  topPValue: any;
  nodeData: any;
}>();

const emit = defineEmits<{
  modelStyleChange: [value: string];
  temperatureChange: [event: Event];
  temperatureInputChange: [event: Event];
  topPChange: [event: Event];
  topPInputChange: [event: Event];
}>();

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

function modelStyleChange(newValue: string): void {
  emit('modelStyleChange', newValue);
}

function temperatureChange(event: Event): void {
  emit('temperatureChange', event);
}

function temperatureInputChange(event: Event): void {
  emit('temperatureInputChange', event);
}

function topPChange(event: Event): void {
  emit('topPChange', event);
}

function topPInputChange(event: Event): void {
  emit('topPInputChange', event);
}
</script>

<style lang="scss" scoped>
.model-settings-popup {
  background: white;
  border-radius: 8px;
  padding: 12px 20px;
  width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.settings-header {
  margin-bottom: 16px;
}

.settings-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.settings-section {
  margin-bottom: 20px;
  width: 100%;
}

.section-title {
  display: block;
  font-size: 14px;
  color: #666;
  font-weight: 500;
  margin-bottom: 8px;
}

.style-radio-group {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}

.radio-label:hover {
  color: #1890ff;
}

.radio-label input[type="radio"] {
  width: 16px;
  height: 16px;
  accent-color: #1890ff;
  cursor: pointer;
}

.radio-label input[type="radio"]:checked + span {
  color: #1890ff;
  font-weight: 500;
}

.slider-item {
  margin-bottom: 16px;
}

.slider-item label {
  display: block;
  font-size: 14px;
  color: #666;
  font-weight: 500;
  margin-bottom: 8px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  height: 24px;
}

.slider-min,
.slider-max {
  font-size: 12px;
  color: #999;
  width: 12px;
  text-align: center;
}

.custom-slider {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(to right, #1890ff var(--value, 50%), #f0f0f0 var(--value, 50%));
  outline: none;
  -webkit-appearance: none;
  transition: background 0.2s;
  margin: 0;
}

.custom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #1890ff;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.3);
  cursor: pointer;
  transition: all 0.2s;
  margin-top: -6px;
}

.custom-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.4);
}

.custom-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #1890ff;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.3);
  cursor: pointer;
  transition: all 0.2s;
}

.custom-slider::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.4);
}

.custom-slider::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  border: none;
  background: linear-gradient(to right, #1890ff var(--value, 50%), #f0f0f0 var(--value, 50%));
}

.slider-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  text-align: center;
  outline: none;
  transition: border-color 0.2s;
}

.slider-input:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

input[type="range"]::-webkit-slider-runnable-track {
  -webkit-appearance: none;
  height: 4px;
  background: transparent;
}

input[type="range"]:focus::-webkit-slider-runnable-track {
  background: transparent;
}
</style>
