import { defineComponent, computed, ref } from 'vue';
import { verifyDetailsProps, type ChecklistItem, type ValidationError } from './verify-details.props';
import { useBem, TPopup } from '@farris/flow-devkit';

import './verify-details.scss';

const COMPONENT_NAME = 'FvfVerifyDetails';

export default defineComponent({
    name: COMPONENT_NAME,
    props: verifyDetailsProps,
    emits: {
        itemClick: (_item: ChecklistItem, _validationError?: ValidationError) => {
            return true;
        },
    },
    setup(props, context) {
        const { bem } = useBem(COMPONENT_NAME);

        const visible = ref<boolean>(false);
        const items = computed<ChecklistItem[]>(() => props.list || []);
        const isEmpty = computed<boolean>(() => !items.value.length);

        function handleItemClick(event: MouseEvent, item: ChecklistItem, error?: ValidationError): void {
            event.stopPropagation();
            context.emit('itemClick', item, error);
        }

        function handleClose(event: MouseEvent): void {
            event.stopPropagation();
            visible.value = false;
        }

        function handleTriggerElementClick(event: MouseEvent): void {
            event.stopPropagation();
            visible.value = !visible.value;
        }

        function renderItem(item: ChecklistItem) {
            return (
                <div
                    key={item.id}
                    class={bem('item')}
                    onClick={(event) => handleItemClick(event, item)}
                >
                    <div class={bem('item-header')}>
                        {item.icon && (
                            <div class={bem('item-icon')}>
                                <img src={item.icon} />
                            </div>
                        )}
                        <div class={bem('item-name')} title={item.name}>{item.name}</div>
                    </div>
                    <div class={bem('item-errors')}>
                        {item.errors.map((error) => (
                            <div class={bem('item-error')} onClick={(event) => handleItemClick(event, item, error)}>
                                <div class={bem('item-error-icon')}>
                                    <i class="f-icon f-icon-close-outline" />
                                </div>
                                <div
                                    class={bem('item-error-msg')}
                                    title={error.message}
                                >{error.message}</div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        function renderPopupContent() {
            return (
                <div class={bem('panel')}>
                    <div class={bem('header')}>
                        <div class={bem('title')}>{'错误列表'}</div>
                        <div class={bem('close')} onClick={handleClose}>
                            <i class="f-icon f-icon-close" />
                        </div>
                    </div>
                    <div class={bem('list')}>
                        {items.value.map(renderItem)}
                    </div>
                </div>
            );
        }

        function renderTriggerElement() {
            if (isEmpty.value) {
                return;
            }
            return (
                <div class={bem()} onClick={handleTriggerElementClick}>
                    <i class={[bem('icon'), "f-icon f-icon-warning"]} />
                    <span class={bem('count')}>{items.value.length}</span>
                </div>
            );
        }

        function show(): void {
            visible.value = !isEmpty.value;
        }

        function hide(): void {
            visible.value = false;
        }

        context.expose({
            show,
            hide,
        });

        return () => (
            <TPopup
                trigger="click"
                zIndex={20}
                visible={visible.value}
                overlayInnerClassName={bem('popup')}
                placement="top-left"
                showArrow={true}
                default={renderTriggerElement}
                content={renderPopupContent}
            />
        );
    },
});
