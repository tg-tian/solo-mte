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
import { defineComponent, ref, SetupContext } from 'vue';
import { FTreeView } from '@farris/ui-vue/components/tree-view';
import { UseEntityTreeData } from '../composition/use-entity-tree-data';
import { entityTreeProps, EntityTreeProps } from './entity-tree-view.props';

import '../composition/entity-tree-view.css';

export default defineComponent({
    name: 'FEntityTreeView',
    props: entityTreeProps,
    emits: [] as (string[] & ThisType<void>) | undefined,
    setup(props: EntityTreeProps, context: SetupContext) {
        const entityTreeRef = ref();
        const { resolveEntityTreeData } = UseEntityTreeData();

        /** 原始实体数据 */
        const entityData = ref(props.data.module?.entity);

        /** 树表绑定数据 */
        let treeViewData: any[] = [];

        /** 树节点图标 */
        const treeNodeIconsData = {
            fold: 'f-icon f-icon-file-folder-close text-primary mr-1',
            unfold: 'f-icon f-icon-file-folder-open text-primary mr-1',
            leafnodes: 'f-icon f-icon-preview mr-1'
        };

        /** 获取树表绑定数据 */
        function getTreeViewData() {
            if (!entityData.value) {
                return;
            }
            treeViewData = [];
            const mainEntity = entityData.value[0].entities[0];
            resolveEntityTreeData(mainEntity, 0, null, treeViewData);
        }

        /** 刷新实体树 */
        function refreshEntityTree() {
            getTreeViewData();
            if (entityTreeRef.value && entityTreeRef.value.updateDataSource) {
                entityTreeRef.value.updateDataSource(treeViewData);
            }
        }
        context.expose({
            refreshEntityTree
        });

        getTreeViewData();

        return () => {
            return <div class="designer-schema-tree">
                <FTreeView
                    ref={entityTreeRef}
                    data={treeViewData}
                    selectable={true}
                    showTreeNodeIcons={true}
                    treeNodeIconsData={treeNodeIconsData}></FTreeView>
            </div>;
        };
    }
});
