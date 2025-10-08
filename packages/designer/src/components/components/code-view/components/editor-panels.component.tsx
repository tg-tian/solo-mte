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
import { defineComponent, ref, SetupContext, onMounted, onUnmounted, inject } from 'vue';
import './code-view.scss';
import { cloneDeep } from 'lodash-es';
import { DEFAULT_PLUGINS_URL_MAP } from '../composition/config/plugins.config';
import FViewIframeDesign from './view-iframe.component';
import { EditorPanelsProps, editorPanelsProps } from '../props/editor-panels.props';
import { DesignerMode } from '../../../../components/types/designer-context';

export default defineComponent({
    name: 'FEditorPanelsDesign',
    props: editorPanelsProps,
    emits: [''] as (string[] & ThisType<void>) | undefined,
    setup(props: EditorPanelsProps, context: SetupContext) {
        /** 代码编辑器插件数据 */
        const editorPanels = ref([] as any);

        /** 当前显示的文件路径 */
        const activePath = ref('');

        const designerMode = inject('designerMode') as DesignerMode;
        /**
         * 获取打开该文件所需的插件的地址
         * @param path 文件路径
         * @returns 插件地址
         */
        function getPluginUrl(path: string): string {
            // 合并默认配置与自定义配置
            const config = cloneDeep(DEFAULT_PLUGINS_URL_MAP) || {};
            const customConfig = config && config['fileSuffix2PluginsUrlMap'] || {};
            Object.assign(config, customConfig);
            // 返回符合要求的路径配置
            for (const suffixKey in config) {
                if (path.endsWith(suffixKey)) {
                    return config[suffixKey];
                }
            }
            return '';
        }
        /**
         * 获取代码编辑器面板页面的Url
         * @param path 文件路径
         * @param param 额外的查询参数
         * @returns 编辑面板路径
         */
        function getCodeEditorPanelUrl(path: string, param?: { [key: string]: string }): string {
            const pluginUrl = getPluginUrl(path);
            if (!pluginUrl) {
                return "";
            }
            let url = `${pluginUrl}/index.html?id=${path}&eventBusId=${props.eventBusId}&fromCodeView=true`;
            if (param) {
                for (const key in param) {
                    if (key === 'id') {
                        continue;
                    }
                    if (param[key]) {
                        url += `&${key}=${param[key]}`;
                    }
                }
            }
            if (designerMode) {
                url += `&designerMode=${designerMode}`;
            }
            return url;
        }

        function show(path: string): boolean {
            const targetPanel = editorPanels.value.find(panel => panel.path === path);
            if (!targetPanel) {
                return false;
            }
            activePath.value = path;
            return true;
        }

        function open(path: string, param?: { [key: string]: string }): boolean {
            if (show(path)) {
                return true;
            }
            const newPanel = { path, url: getCodeEditorPanelUrl(path, param) };
            if (!newPanel.url) {
                return false;
            }
            editorPanels.value.push(newPanel);
            show(path);
            return true;
        }

        function close(path: string) {
            const idx = editorPanels.value.findIndex(panel => panel.path === path);
            if (idx >= 0) {
                if (activePath.value === path) {
                    activePath.value = '';
                }
                editorPanels.value.splice(idx, 1);
            }
        }
        context.expose({ close, open, show });

        return () => {
            return (editorPanels.value.map(frame => (
                <div key={frame.path} class={{ 'plugin-frame': true, 'active': frame.path === activePath.value }}>
                    <FViewIframeDesign src={frame.url}></FViewIframeDesign>
                </div>
            ))
            );
        };
    }
});
