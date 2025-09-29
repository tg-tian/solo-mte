/**
 * Copyright (c) 2020 - present, Inspur Genersoft Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { defineComponent, ref, SetupContext, onMounted, watch } from 'vue';
import { navTreeProps, NavTreeProps } from '../props/nav-tree.props';
import { VisualData, VisualDataCell, FTreeView } from '@farris/ui-vue';
import { NavTreeNode } from '../composition/type/tree';
import { CommonFileNavTreeDataService } from '../composition/type/nav/common-file';
import { NavTreeNodeIconService } from '../composition/type/nav/node-icon';

export default defineComponent({
    name: 'FNavTreeDesign',
    props: navTreeProps,
    emits: ['selectRow'] as (string[] & ThisType<void>) | undefined,
    setup(props: NavTreeProps, context: SetupContext) {
        const treeGridInstance = ref();
        // 资源是否加载完成
        const loadedSource = ref(false);
        /**
         * 由文件路径到树节点Id的映射
         * @remarks 在导航树中可能存在多个文件路径相同的节点，所以需要记录右侧编辑器中的文件是由那个节点双击打开的
         */
        const path2IdMap = new Map<string, string>();

        let currentId = '';
        let treeData: any = [];
        // 取数服务
        let dataService: CommonFileNavTreeDataService;
        // 获取图标服务
        let iconService: NavTreeNodeIconService | undefined;
        const columns = [{
            field: 'name',
            title: '',
            visible: true,
            // width: '100%',
            formatter: (cell: VisualDataCell, visualDataRow: VisualData) => {
                return visualDataRow.raw['CodeViewNav--ContentInnerHTML'];
            }
        }];
        const rowNumber = { enable: false };
        /**
         * 清空选中状态
         */
        function clearSelection(): void {
            treeGridInstance.value?.selectItemById();
        }

        function findNodeByPath(node: NavTreeNode, path: string): NavTreeNode | null {
            if (!node || !node.data) {
                return null;
            }
            if (node.data.path === path) {
                return node;
            }
            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    const target = findNodeByPath(child, path);
                    if (target) {
                        return target;
                    }
                }
            }
            return null;
        }
        /**
         * 通过文件路径获取文件条目标识
         * @remarks 当不存在路径标识映射时，通过该方法获取文件条目标识
         * @param path 文件路径
         * @returns 条目标识
         */
        function getIdByPath(path: string): string {
            const nodes = treeData;
            for (const node of nodes) {
                const target = findNodeByPath(node, path);
                if (target) {
                    return target.id;
                }
            }
            return '';
        }
        /**
         * 根据文件路径选中节点
         * @param path 文件路径
         * @returns 是否成功，如果节点不存在则失败
         */
        function selectByPath(path: string): boolean {
            if (!path) {
                clearSelection();
                return false;
            }
            // 优先通过路径标识映射获取对应标识
            let id = path2IdMap.get(path);
            if (!id) {
                id = getIdByPath(path);
            }
            if (id) {
                treeGridInstance.value?.selectItemById(id);
                currentId = id;
            }
            return true;
        }
        /**
         * 重新加载导航树节点数据
         * @param selectNodePath 数据加载完成后，选中该路径节点
         */
        function reloadTreeData(selectNodePath = ''): Promise<void> {
            // 如果没有指定节点，则尝试选中之前选中的节点
            // selectNodePath = selectNodePath || (
            //     treeCmp.treeTable.selectedRow
            //     && treeCmp.treeTable.selectedRow.data
            //     && treeCmp.treeTable.selectedRow.data.path
            // );
            // 如果数据服务或者根路径为空则直接清空树数据
            if (props.entryFilePath) {
                return dataService['getChildrenWithValidId'](props.entryFilePath).then((data) => {
                    treeData = data;
                    treeGridInstance.value?.updateDataSource(treeData);
                    selectByPath(selectNodePath);
                });
                // setIcon();
            } else {
                return new Promise((resolve, reject) => {
                    // 模拟异步请求
                    treeData = [];
                    treeGridInstance.value?.updateDataSource(treeData);
                    resolve();
                });
            }
        }
        /**
         * 直接设置导航树数据和图标服务
         */
        function setDataService(dataSource: CommonFileNavTreeDataService,iconSource?: NavTreeNodeIconService): void {
            dataService = dataSource;
            iconService = iconSource;
            // 注册刷新导航树数据回调函数，让数据服务可以通过该方法控制导航树何时刷新数据
            if (dataService) {
                dataService['refreshNavTreeCallback'] = async () => {
                    await reloadTreeData();
                };
            }
            loadedSource.value = true;
        }
        // 监听资源加载
        watch(loadedSource, () => {
            reloadTreeData();
        });

        onMounted(() => {
            if (dataService) {
                loadedSource.value = true;
                reloadTreeData();
            }
        });
        function clickRowHandler(item) {
            // 仅支持打开TS
            if (!dataService || item.path.indexOf('.webcmd') > -1 || item.path.indexOf('.webcmp') > -1) {
                return;
            }
            const { data } = item;
            // 执行服务自定义节点双击处理回调
            const toOpenFile = dataService.handleDblClick(item);
            if (toOpenFile && data.canOpen) {
                path2IdMap.set(data.path, data.id);
                context.emit('selectRow', item);
            }
        }
        /** 更新导航树节点图标 */
        function setIcon(): void {

        }

        context.expose({ reloadTreeData, setDataService,selectByPath, controllers: () => {
            return treeData;
        } });

        return () => {
            return (
                <FTreeView
                    ref={treeGridInstance}
                    rowNumber={rowNumber}
                    columnOption={{fitColumns: true, fitMode: 'expand'}}
                    columns={columns}
                    data={treeData}
                    fit={true}
                    onDoubleClickRow={(dataIndex, dataItem) => clickRowHandler(dataItem)}
                ></FTreeView>
            );
        };
    }
});
