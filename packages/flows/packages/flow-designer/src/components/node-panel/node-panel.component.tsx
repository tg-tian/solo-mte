import { computed, defineComponent, ref } from "vue";
import { nodePanelProps } from './node-panel.props';
import { useDragNewNode } from '@flow-designer/hooks';
import type { NodePanelCategory, NodePanelItem } from '@flow-designer/types';
import { useNotify } from '@farris/flow-devkit';

import styles from './node-panel.module.scss';

export default defineComponent({
    name: 'NodePanel',
    props: nodePanelProps,
    emits: [],
    setup(props) {

        const { onDragStart, onDrag } = useDragNewNode();

        const searchIcon = `<span class="f-icon f-icon-search"></span>`;
        const searchText = ref<string>('');
        const searchKey = computed<string>(() => searchText.value.trim());

        const showAllNodes = ref<boolean>(false);

        const categories = computed<NodePanelCategory[]>(() => {
            return showAllNodes.value ? props.allNodeCategories : props.nodeCategories;
        });

        const filteredCategories = computed<NodePanelCategory[]>(() => {
            const allCategories = categories.value;
            const validCategories = allCategories.map(category => {
                const validNodes = (category.nodes || []).filter(node => {
                    return node.label && node.label.includes(searchKey.value);
                });
                return { ...category, nodes: validNodes };
            });
            return validCategories.filter(category => category.nodes.length);
        });

        const isEmpty = computed<boolean>(() => filteredCategories.value.length === 0);

        const notifyService = useNotify();

        function onSearchTextUpdate(newValue: string): void {
            searchText.value = newValue;
        }

        function onNodeItemClick(): void {
            notifyService.info(`请将节点拖拽到画布中`);
        }

        function renderNodeItem(node: NodePanelItem) {
            return (
                <div class={styles['node-card']}
                    key={node.type}
                    draggable={true}
                    onDragstart={(evt) => onDragStart(evt, node.type)}
                    onDrag={onDrag}
                    onClick={onNodeItemClick}
                    title={node.description || ''}
                >
                    <div class={styles['node-icon']}>
                        <img src={node.icon}></img>
                        <div class={styles['node-icon-overlay']}></div>
                    </div>
                    <div class={styles['node-title']}>{node.label}</div>
                </div>
            )
        }

        function renderNodeCategoryPanel(category: NodePanelCategory, index: number) {
            return (
                <div class={[
                    styles['node-category'],
                    index === 0 && styles['first-panel'],
                ]} key={category.id}>
                    <span class={styles['node-category-title']}>{category.label}</span>
                    <div class={styles['node-category-list']}>
                        {category.nodes.map(renderNodeItem)}
                    </div>
                </div>
            );
        }

        function renderSearchBar() {
            return (
                <f-input-group
                    modelValue={searchText.value}
                    groupText={searchIcon}
                    placeholder={'搜索'}
                    updateOn="change"
                    onUpdate:modelValue={onSearchTextUpdate}
                />
            );
        }

        function renderNoSearchResultTip() {
            if (!isEmpty.value || !searchKey.value) {
                return;
            }
            return (
                <div class={styles['search-placeholder']}>{'搜索结果为空'}</div>
            );
        }

        return () => (
            <div class={styles['node-panel-wrapper']}>
                <div class={styles['node-panel']}>
                    {renderSearchBar()}
                    <div class={styles['list-wrapper']}>
                        {renderNoSearchResultTip()}
                        {filteredCategories.value.map(renderNodeCategoryPanel)}
                    </div>
                    <div
                        class={styles['switch-mode']}
                        onClick={() => { showAllNodes.value = !showAllNodes.value }}
                    >
                        <span>{showAllNodes.value ? '显示当前流程节点' : '显示所有节点'}</span>
                    </div>
                </div>
            </div>
        );
    }
});
