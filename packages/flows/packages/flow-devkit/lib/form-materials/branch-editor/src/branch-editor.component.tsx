import { defineComponent, computed, ref, onMounted } from 'vue';
import { branchEditorProps } from './branch-editor.props';
import { useBem, ValueExpressUtils, uuid } from '@farris/flow-devkit/utils';
import { type SelectorBranch } from '@farris/flow-devkit/types';
import { ConditionEditor } from '@farris/flow-devkit/form-materials/condition-editor';
import Sortable, { type SortableEvent } from 'sortablejs';

import './branch-editor.scss';

const name = 'FvfBranchEditor';

export default defineComponent({
  name,
  props: branchEditorProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    const { bem } = useBem(name);
    const branchListRef = ref<HTMLDivElement>();

    const branches = computed<SelectorBranch[]>(() => {
      const currentBranches = props.modelValue || [];
      const conditionBranches = currentBranches.filter((branch) => {
        return branch && branch.conditionExpr;
      });
      return conditionBranches;
    });

    const hasMultipleBranches = computed<boolean>(() => {
      return branches.value.length > 1;
    });

    function getElseBranchPortID(): string {
      const currentBranches = props.modelValue || [];
      const elseBranch = currentBranches.find((branch) => {
        return branch && !branch.conditionExpr && branch.port;
      });
      return elseBranch?.port || uuid();
    }

    function updateValue(newBranches: SelectorBranch[]): void {
      const allBranches: SelectorBranch[] = [
        ...newBranches,
        { port: getElseBranchPortID() },
      ];
      context.emit('update:modelValue', allBranches);
    }

    const handleDragEnd = (event: SortableEvent) => {
      const { oldIndex, newIndex } = event;
      if (oldIndex === newIndex || typeof oldIndex !== 'number' || typeof newIndex !== 'number') {
        return;
      }
      const newBranches = [...branches.value];
      const [movedItem] = newBranches.splice(oldIndex, 1);
      newBranches.splice(newIndex, 0, movedItem);
      updateValue(newBranches);
    };

    onMounted(() => {
      if (branchListRef.value) {
        new Sortable(branchListRef.value, {
          handle: `.${bem('list-handle')}`,
          animation: 150,
          onEnd: handleDragEnd,
        });
      }
    });

    function addBranch(): void {
      const newBranch = ValueExpressUtils.createSelectorBranch(
        ValueExpressUtils.createLogicExpr([
          ValueExpressUtils.createCompareExpr()
        ])
      );
      const newBranches: SelectorBranch[] = [...branches.value, newBranch];
      updateValue(newBranches);
    }

    function deleteBranch(branch: SelectorBranch): void {
      const portId = branch.port;
      const newBranches = branches.value.filter((branch) => {
        return branch && branch.port && branch.port !== portId;
      });
      updateValue(newBranches);
    }

    function renderDividerLine() {
      return (
        <div class={bem('divider-line')}></div>
      );
    }

    function getBranchTitle(index: number): string {
      return index === 0 ? '如果' : '否则如果';
    }

    function renderBranch(branch: SelectorBranch, index: number) {
      return (
        <div class={bem('branch')} key={branch.port}>
          <div class={bem('branch-header')}>
            {hasMultipleBranches.value && (<div class={bem('list-handle')}></div>)}
            <div class={bem('branch-title')}>{getBranchTitle(index)}</div>
            {hasMultipleBranches.value && (<div class={bem('branch-sub-title')}>{`条件 ${index + 1}`}</div>)}
          </div>
          <ConditionEditor
            modelValue={branch.conditionExpr}
            canDelete={hasMultipleBranches.value}
            onDelete={() => deleteBranch(branch)}
          />
          {renderDividerLine()}
        </div>
      );
    }

    function renderBranches() {
      return (
        <div class={bem('branch-list')} ref={branchListRef}>
          {branches.value.map((branch, index) => renderBranch(branch, index))}
        </div>
      );
    }

    function renderAddBranchButton() {
      return (
        <div class={bem('add-branch-container')}>
          <button class={['btn', 'btn-md', 'btn-icontext', 'btn-secondary', bem('add-branch')]} onClick={addBranch}>
            <i class="f-icon f-icon-add"></i>
            <span>{'添加分支'}</span>
          </button>
        </div>
      );
    }

    function renderElseBranch() {
      return (
        <div class={bem('else-branch')}>
          <div class={bem('else-branch-title')}>{'否则'}</div>
          <div class={bem('else-branch-desc')}>{'用于定义当 if 条件不满足时应执行的逻辑。'}</div>
        </div>
      );
    }

    return () => (
      <div class={bem()}>
        {renderBranches()}
        {renderAddBranchButton()}
        {renderDividerLine()}
        {renderElseBranch()}
        {renderDividerLine()}
      </div>
    );
  },
});
