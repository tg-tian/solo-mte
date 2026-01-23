import { computed, defineComponent, ref, onMounted } from 'vue';
import { enumInputHelpProps } from './enum-input-help.props';
import { useBem, uuid, InputHelpUtils } from '@farris/flow-devkit/utils';
import type { EnumInputHelp, EnumItem } from '@farris/flow-devkit/types';
import Sortable, { type SortableEvent } from 'sortablejs';

import './enum-input-help.scss';

const name = 'FvfEnumInputHelp';

export default defineComponent({
  name,
  props: enumInputHelpProps,
  emits: {
    'update:modelValue': (_newValue: EnumInputHelp) => {
      return true;
    },
  },
  setup(props, context) {
    const { bem } = useBem(name);

    const listRef = ref<HTMLDivElement>();

    const items = computed<EnumItem[]>(() => {
      const value = props.modelValue?.items;
      return Array.isArray(value) ? value : [];
    });

    const hoveredItemId = ref<string>('');
    const focusedItemId = ref<string>('');

    function handleDeleteMouseEnter(enumItem: EnumItem): void {
      if (enumItem?.id) {
        hoveredItemId.value = enumItem.id;
      }
    }

    function handleDeleteMouseLeave(): void {
      hoveredItemId.value = '';
    }

    function handleItemFocus(enumItem: EnumItem): void {
      focusedItemId.value = '';
      if (enumItem?.id) {
        focusedItemId.value = enumItem.id;
      }
    }

    function handleItemBlur(enumItem: EnumItem): void {
      if (enumItem?.id === focusedItemId.value) {
        focusedItemId.value = '';
      }
    }

    function emitChange(newItems: EnumItem[]): void {
      const newValue = InputHelpUtils.createEnumInputHelp(newItems);
      context.emit('update:modelValue', newValue);
    }

    function handleAdd(): void {
      const newItem: EnumItem = { key: '', value: '', id: uuid() };
      const newItems = [...items.value, newItem];
      emitChange(newItems);
    }

    function handleDelete(index: number): void {
      const newItems = [...items.value];
      newItems.splice(index, 1);
      emitChange(newItems);
    }

    function handleDragEnd(event: SortableEvent): void {
      const { oldIndex, newIndex } = event;
      if (oldIndex === newIndex || typeof oldIndex !== 'number' || typeof newIndex !== 'number') {
        return;
      }
      const newItems = [...items.value];
      const [movedItem] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, movedItem);
      emitChange(newItems);
    }

    onMounted(() => {
      if (listRef.value) {
        new Sortable(listRef.value, {
          handle: `.${bem('item-handle')}`,
          animation: 150,
          onEnd: handleDragEnd,
        });
      }
    });

    function renderEnumItem(enumItem: EnumItem, index: number) {
      if (!enumItem.id) {
        enumItem.id = uuid();
      }
      return (
        <div class={{
          [bem('item')]: true,
          [bem('item', 'danger')]: enumItem.id === hoveredItemId.value,
          [bem('item', 'focus')]: enumItem.id === focusedItemId.value,
        }} key={enumItem.id} title={enumItem.value || ''}>
          <div class={['f-icon f-icon-drag-vertical', bem('item-handle')]} title=""></div>
          <input
            class={bem('item-input')}
            type="text"
            value={enumItem.value}
            title={enumItem.value || ''}
            placeholder="选项值"
            onInput={(event) => {
              const inputValue = (event.target as HTMLInputElement).value;
              if (enumItem.key === enumItem.value) {
                enumItem.key = inputValue;
              }
              enumItem.value = inputValue;
            }}
            onFocus={() => handleItemFocus(enumItem)}
            onBlur={() => handleItemBlur(enumItem)}
          />
          <input
            class={bem('item-input')}
            type="text"
            value={enumItem.key}
            title={enumItem.key || ''}
            placeholder="选项名称"
            onInput={(event) => {
              const inputValue = (event.target as HTMLInputElement).value;
              enumItem.key = inputValue;
            }}
            onFocus={() => handleItemFocus(enumItem)}
            onBlur={() => handleItemBlur(enumItem)}
          />
          <div
            class={bem('item-delete')}
            title="删除选项"
            onClick={() => handleDelete(index)}
            onMouseenter={() => handleDeleteMouseEnter(enumItem)}
            onMouseleave={handleDeleteMouseLeave}
          >
            <i class="f-icon f-icon-enclosure_delete" />
          </div>
        </div>
      );
    }

    function renderAddButton() {
      return (
        <div class={bem('add')} title="添加选项" onClick={handleAdd}>
          <i class="f-icon f-icon-add" />
          <span>添加选项</span>
        </div>
      );
    }

    return () => (
      <div class={bem()}>
        <div class={bem('list')} ref={listRef}>
          {items.value.map((item, index) => renderEnumItem(item, index))}
        </div>
        {renderAddButton()}
      </div>
    );
  },
});
