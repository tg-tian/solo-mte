import { defineComponent, computed, watch, nextTick, ref } from 'vue';
import { requestBodyProps } from './request-body.props';
import RequestParams from '../../request-params';

import './request-body.scss';

const name = 'RequestBody';

export default defineComponent({
  name,
  props: requestBodyProps,
  emits: ['update:modelValue'],
  setup(props, context) {

    const currentBodyType = computed(() => {
      return 'form-data';
    });

    const currentContent = computed(() => {
      return props.nodeData?.restFulService?.bodyList;
    });

    const restFulService = computed(() => {
      return props.nodeData?.restFulService || {};
    });

    // JSON格式验证状态
    const isValidJson = ref(true);
    const showValidation = ref(false);

    const shouldShowContent = computed(() => {
      return ['form-data', 'x-www-form-urlencoded', 'binary', 'json', 'raw'].includes(currentBodyType.value);
    });

    const editorType = computed(() => {
      if (['form-data', 'x-www-form-urlencoded', 'binary'].includes(currentBodyType.value)) {
        return 'request-params';
      }
      if (['json', 'raw'].includes(currentBodyType.value)) {
        return 'textarea';
      }
      return null;
    });

    const textareaPlaceholder = computed(() => {
      if (currentBodyType.value === 'json') {
        return '请输入JSON格式的请求体，例如：\n{\n  "key": "value"\n}';
      }
      if (currentBodyType.value === 'raw') {
        return '请输入原始文本内容';
      }
      return '';
    });

    // function handleBodyTypeChange(newBodyType: string): void {
    //   if (!restFulService.value.bodyContent) {
    //     restFulService.value.bodyContent = {};
    //   }

    //   restFulService.value.bodyContent.bodyType = newBodyType;
    //   let content = currentContent.value;

    //   // 根据新类型重置内容
    //   if (newBodyType === 'none') {
    //     content = null;
    //     showValidation.value = false;
    //   } else if (['form-data', 'x-www-form-urlencoded', 'binary'].includes(newBodyType) &&
    //              !Array.isArray(currentContent.value)) {
    //     content = [];
    //     showValidation.value = false;
    //   } else if (['json', 'raw'].includes(newBodyType) &&
    //              typeof currentContent.value !== 'string') {
    //     content = '';
    //     // 如果是JSON类型，初始化验证状态
    //     if (newBodyType === 'json') {
    //       showValidation.value = false;
    //     }
    //   }

    //   restFulService.value.bodyContent.content = content;
    //   restFulService.value.bodyList = content;
    // }

    function handleContentChange(newContent: any): void {
      restFulService.value.bodyList = newContent;

      // 如果是JSON类型，更新验证状态
      if (currentBodyType.value === 'json' && typeof newContent === 'string') {
        validateJson(newContent);
      }
    }

    // JSON格式验证函数
    function validateJson(value: string): void {
      if (!value || typeof value !== 'string') {
        isValidJson.value = true;
        showValidation.value = false;
        return;
      }

      const trimmedValue = value.trim();
      if (!trimmedValue) {
        isValidJson.value = true;
        showValidation.value = false;
        return;
      }

      try {
        JSON.parse(trimmedValue);
        isValidJson.value = true;
        showValidation.value = true;
      } catch (error) {
        isValidJson.value = false;
        showValidation.value = true;
      }
    }

    // 暂时隐藏
    // JSON格式化函数
    // function formatJson(): void {
    //   if (currentBodyType.value !== 'json' || !currentContent.value || typeof currentContent.value !== 'string') {
    //     return;
    //   }

    //   // 检查是否为空内容
    //   const trimmedValue = currentContent.value.trim();
    //   if (!trimmedValue) {
    //     return;
    //   }

    //   try {
    //     const parsed = JSON.parse(trimmedValue);
    //     const formatted = JSON.stringify(parsed, null, 2);

    //     if (!restFulService.value.bodyContent) {
    //       restFulService.value.bodyContent = {};
    //     }

    //     restFulService.value.bodyContent.content = formatted;
    //     restFulService.value.bodyList = formatted;

    //     // 格式化后更新验证状态
    //     isValidJson.value = true;
    //     showValidation.value = true;
    //   } catch (error) {
    //     // 如果JSON格式不正确，不进行格式化，也不抛出错误
    //     // 静默处理，让用户继续编辑
    //     isValidJson.value = false;
    //     showValidation.value = true;
    //   }
    // }

    // 监听bodyType变化，清理不兼容的值
    // watch(currentBodyType, (newType, oldType) => {
    //   if (newType !== oldType) {
    //     if (newType === 'none') {
    //       handleContentChange(null);
    //       showValidation.value = false;
    //     } else if (['form-data', 'x-www-form-urlencoded', 'binary'].includes(newType) &&
    //                !Array.isArray(currentContent.value)) {
    //       handleContentChange([]);
    //       showValidation.value = false;
    //     } else if (['json', 'raw'].includes(newType) &&
    //                typeof currentContent.value !== 'string') {
    //       handleContentChange('');
    //       // 如果是JSON类型，初始化验证状态
    //       if (newType === 'json') {
    //         showValidation.value = false;
    //       }
    //     }

    //     // 如果切换到JSON类型，验证当前值
    //     if (newType === 'json' && typeof currentContent.value === 'string') {
    //       validateJson(currentContent.value);
    //     }
    //   }
    // });

    // function renderBodyTypeSelector() {
    //   return (
    //     <div class="request-body__type-selector">
    //       <f-combo-list
    //         modelValue={currentBodyType.value}
    //         data={[
    //           { text: 'none', value: 'none' },
    //           { text: 'form-data', value: 'form-data' },
    //           { text: 'x-www-form-urlencoded', value: 'x-www-form-urlencoded' },
    //           { text: 'JSON', value: 'json' },
    //           { text: 'raw', value: 'raw' },
    //           { text: 'binary', value: 'binary' }
    //         ]}
    //         valueField="value"
    //         textField="text"
    //         enableClear={false}
    //         editable={false}
    //         onUpdate:modelValue={handleBodyTypeChange}
    //       />
    //     </div>
    //   );
    // }

    function renderContent() {
      if (!shouldShowContent.value || !editorType.value) {
        return null;
      }

      if (editorType.value === 'request-params') {
        return (
          <RequestParams
            modelValue={currentContent.value || []}
            nodeData={props.nodeData}
            onUpdate:modelValue={handleContentChange}
          />
        );
      }

      if (editorType.value === 'textarea') {
        return (
          <div class="request-body__textarea-wrapper">
            {currentBodyType.value === 'json' && (
              <div class="request-body__toolbar">
                <f-button
                  size="small"
                  type="secondary"
                  onClick={formatJson}
                  class="request-body__format-btn"
                >
                  格式化
                </f-button>
              </div>
            )}
            <f-textarea
              modelValue={currentContent.value || ''}
              placeholder={textareaPlaceholder.value}
              rows={8}
              lineBreak={false}
              onUpdate:modelValue={handleContentChange}
              class="request-body__textarea"
            />
          </div>
        );
      }
    }

    return () => (
      <div class="request-body">
        <div class="request-body__content">
          {renderContent()}
        </div>
        {/* {renderBodyTypeSelector()}
        {shouldShowContent.value && (
          <div class="request-body__content">
            {renderContent()}
            {currentBodyType.value === 'json' && showValidation.value && !isValidJson.value && (
              <div class="request-body__validation invalid">
                <span class="request-body__validation-text">
                  JSON格式错误
                </span>
              </div>
            )}
          </div>
        )} */}
      </div>
    );
  },
});
