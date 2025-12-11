import { defineComponent } from 'vue';
import { intentClassifierProps, type IntentClass } from './intent-classifier-editor.props';

import './intent-classifier-editor.scss';

/**
 * 自定义属性编辑器示例 - 意图分类编辑器
 * @todo 请在正式发版前移除示例节点的相关代码
 */
export default defineComponent({
    name: 'DemoIntentClassifierEditor',
    props: intentClassifierProps,
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        const addClassifier = () => {
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substr(2, 9);
            const newClassifier: IntentClass = {
                categoryId: `class_${timestamp}_${randomId}`,
                categoryName: ''
            };
            const newValue = [...(props.modelValue || []), newClassifier];
            emit('update:modelValue', newValue);
        };

        const removeClassifier = (index: number) => {
            if ((props.modelValue || []).length <= 1) {
                return;
            }
            const newValue = [...(props.modelValue || [])];
            newValue.splice(index, 1);
            emit('update:modelValue', newValue);
        };

        const updateClassifier = (index: number, field: keyof IntentClass, value: string) => {
            const newValue = [...(props.modelValue || [])];
            newValue[index] = { ...newValue[index], [field]: value };
            emit('update:modelValue', newValue);
        };

        return () => (
            <div class="demo-intent-classifier-editor">
                <div class="classifier-list">
                    {(props.modelValue || []).map((classifier, index) => (
                        <div key={classifier.categoryId} class="classifier-item">
                            <div class="classifier-content">
                                <textarea
                                    value={classifier.categoryName}
                                    onInput={(e: any) => updateClassifier(index, 'categoryName', e.target.value)}
                                    placeholder="输入分类名称"
                                    class="classifier-name-textarea"
                                    rows="1"
                                />
                            </div>

                            <div class="classifier-actions">
                                <div
                                    class={`remove-btn ${(props.modelValue || []).length <= 1 ? 'disabled' : ''}`}
                                    onClick={() => removeClassifier(index)}
                                    title="删除分类"
                                >
                                    <i class="f-icon f-icon-enclosure_delete"></i>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div class="add-section">
                    <f-button
                        type="secondary"
                        icon="f-icon-add"
                        onClick={addClassifier}
                        class="add-btn"
                    >
                        新增
                    </f-button>
                    <div class="placeholder"></div>
                </div>
            </div>
        );
    },
});
