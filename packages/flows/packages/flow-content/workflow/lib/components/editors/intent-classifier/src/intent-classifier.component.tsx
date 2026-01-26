import { defineComponent } from 'vue';
import { intentClassifierProps, type IntentClass } from './intent-classifier.props';
import './intent-classifier.scss';

export default defineComponent({
    name: 'IntentClassifierEditor',
    props: intentClassifierProps,
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        // const initializeClassifiers = (): IntentClass[] => {
        //     if (props.modelValue && props.modelValue.length > 0) {
        //         return props.modelValue.map(classifier => ({
        //             categoryId: String(classifier.categoryId || `class_${Date.now()}_${Math.random()}`),
        //             categoryName: String(classifier.categoryName || '')
        //         }));
        //     }

        //     // 默认数据
        //     const timestamp = Date.now();
        //     return [
        //         {
        //             categoryId: `class_${timestamp}_1`,
        //             categoryName: '分类1'
        //         },
        //         {
        //             categoryId: `class_${timestamp}_2`,
        //             categoryName: '分类2'
        //         }
        //     ];
        // };

        const addClassifier = () => {
            // 限制最多只能添加5个分类器
            if ((props.modelValue || []).length >= 5) {
                return;
            }
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
                return; // 至少保留一个分类
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
            <div class="intent-classifier-editor">
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
                                    class={`remove-btn ${ (props.modelValue || []).length <= 1 ? 'disabled' : '' }`}
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
                        disabled={(props.modelValue || []).length >= 5}
                        title={(props.modelValue || []).length >= 5 ? '最多只能添加5个分类器' : '新增分类器'}
                    >
                        新增
                    </f-button>
                    <div class="placeholder"></div>
                </div>
            </div>
        );
    },
});
