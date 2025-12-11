import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { openingQuestionsEditorProps, type OpeningQuestion } from './opening-questions-editor.props';
import { useBem, uuid } from '@farris/flow-devkit';
import Sortable, { type SortableEvent } from 'sortablejs';

import './opening-questions-editor.scss';

const name = 'OpeningQuestionsEditor';

export default defineComponent({
  name,
  props: openingQuestionsEditorProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    const { bem } = useBem(name);
    const questionsListRef = ref<HTMLDivElement>();

    const questions = computed<OpeningQuestion[]>(() => {
      const modelQuestions = props.modelValue || [];
      // 如果没有问题，创建一个默认的空问题
      if (modelQuestions.length === 0) {
        return [{
          id: uuid(),
          text: ''
        }];
      }
      return modelQuestions;
    });

    const canAddMore = computed<boolean>(() => {
      if (!props.maxQuestions) return true;
      return questions.value.length < props.maxQuestions;
    });

    const updateValue = (newQuestions: OpeningQuestion[]): void => {
      context.emit('update:modelValue', newQuestions);
    };

    const handleDragEnd = (event: SortableEvent) => {
      const { oldIndex, newIndex } = event;
      if (oldIndex === newIndex || typeof oldIndex !== 'number' || typeof newIndex !== 'number') {
        return;
      }
      const newQuestions = [...questions.value];
      const [movedItem] = newQuestions.splice(oldIndex, 1);
      newQuestions.splice(newIndex, 0, movedItem);
      updateValue(newQuestions);
    };

    onMounted(() => {
      if (questionsListRef.value) {
        new Sortable(questionsListRef.value, {
          handle: `.${bem('list-handle')}`,
          animation: 150,
          ghostClass: bem('drag-ghost'),
          chosenClass: bem('drag-chosen'),
          onEnd: handleDragEnd,
        });
      }
    });

    // 监听modelValue变化，确保数据同步
    watch(() => props.modelValue, (newValue) => {
      // 如果外部数据为空，确保内部至少有一个空问题
      if (!newValue || newValue.length === 0) {
        const defaultQuestion = [{
          id: uuid(),
          text: ''
        }];
        context.emit('update:modelValue', defaultQuestion);
      }
      // 确保不超过最大限制
      if (newValue && props.maxQuestions && newValue.length > props.maxQuestions) {
        const trimmedQuestions = newValue.slice(0, props.maxQuestions);
        context.emit('update:modelValue', trimmedQuestions);
      }
    }, { immediate: true });

    const addQuestion = (): void => {
      if (!canAddMore.value) return;

      const newQuestion: OpeningQuestion = {
        id: uuid(),
        text: ''
      };
      const newQuestions = [...questions.value, newQuestion];
      updateValue(newQuestions);
    };

    const deleteQuestion = (questionId: string): void => {
      const currentQuestions = questions.value;
      // 如果只有一个问题，不允许删除，而是清空其内容
      if (currentQuestions.length <= 1) {
        const clearedQuestions = currentQuestions.map(q =>
          q.id === questionId ? { ...q, text: '' } : q
        );
        updateValue(clearedQuestions);
      } else {
        // 多个问题时可以正常删除
        const newQuestions = currentQuestions.filter(q => q.id !== questionId);
        updateValue(newQuestions);
      }
    };

    const updateQuestionText = (questionId: string, text: string): void => {
      const newQuestions = questions.value.map(q =>
        q.id === questionId ? { ...q, text } : q
      );
      updateValue(newQuestions);
    };

    const renderQuestion = (question: OpeningQuestion, index: number) => {
      const currentQuestions = questions.value;
      const showDeleteButton = currentQuestions.length > 1;
      const showDragHandle = currentQuestions.length > 1;

      return (
        <div class={bem('question-item')} key={question.id}>
          <div class={bem('question-row')}>
            {showDragHandle && <div class={bem('list-handle')}></div>}
            <div class={bem('input-container')}>
              <f-input-group
                modelValue={question.text}
                placeholder={props.placeholder || '请输入问题内容'}
                maxLength={props.maxLength}
                enableClear={false}
                onUpdate:modelValue={(value: string) => updateQuestionText(question.id, value)}
              />
            </div>
            {showDeleteButton && (
              <button
                class={[bem('delete-btn')]}
                onClick={() => deleteQuestion(question.id)}
                title="删除问题"
              >
                <i class="f-icon f-icon-enclosure_delete"></i>
              </button>
            )}
          </div>
        </div>
      );
    };

    const renderQuestions = () => {
      return (
        <div class={bem('questions-list')} ref={questionsListRef}>
          {questions.value.map((question, index) => renderQuestion(question, index))}
        </div>
      );
    };

    const renderAddButton = () => {
      if (!canAddMore.value) return null;

      return (
        <div class={bem('add-question-container')}>
          <button
            class={['btn', 'btn-md', 'btn-icontext', 'btn-secondary', bem('add-question')]}
            onClick={addQuestion}
          >
            <i class="f-icon f-icon-add"></i>
            <span>添加预置问题</span>
          </button>
        </div>
      );
    };

    return () => (
      <div class={bem()}>
        <div class={bem('header')}>
          <span class={bem('title')}>开场白预置问题</span>
          <div class={bem('header-actions')}>
            {props.maxQuestions && (
              <span class={bem('question-count')}>
                {questions.value.length}/{props.maxQuestions}
              </span>
            )}
          </div>
        </div>
        {renderQuestions()}
        {renderAddButton()}
      </div>
    );
  },
});
