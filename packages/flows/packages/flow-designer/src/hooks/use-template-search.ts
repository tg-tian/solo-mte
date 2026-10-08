import { ref, type Ref } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import { useVueFlowDataConverter } from './use-vue-flow-data-converter';
import { TemplateApi, type TemplateItem } from '@flow-designer/api/template';
import { useNotify, useMessageBox, uuid } from '@farris/flow-devkit';
import type { FlowMetadata } from '@farris/flow-devkit';

export interface UseTemplateSearch {
    searchKeyword: Ref<string>;
    templates: Ref<TemplateItem[]>;
    loading: Ref<boolean>;
    showDropdown: Ref<boolean>;
    searchTemplates: (keyword: string) => Promise<void>;
    applyTemplate: (template: TemplateItem) => void;
    clearSearch: () => void;
}

let templateSearchInstance: UseTemplateSearch | null = null;
let afterReloadFlowRef: (() => void) | undefined;

export function useTemplateSearch(afterReloadFlow?: () => void): UseTemplateSearch {
    if (afterReloadFlow) {
        afterReloadFlowRef = afterReloadFlow;
    }

    if (templateSearchInstance) {
        return templateSearchInstance;
    }

    const searchKeyword = ref('');
    const templates = ref<TemplateItem[]>([]);
    const loading = ref(false);
    const showDropdown = ref(false);

    const notifyService = useNotify();
    const messageBoxService = useMessageBox();

    const { setNodes, setEdges } = useVueFlow();
    const { convertFlowMetadata2VueFlowData } = useVueFlowDataConverter();

    async function searchTemplates(keyword: string) {
        if (!keyword || !keyword.trim()) {
            templates.value = [];
            showDropdown.value = false;
            return;
        }

        loading.value = true;
        showDropdown.value = true;

        try {
            const result = await TemplateApi.searchTemplates(keyword.trim());
            if (result.success && result.data) {
                templates.value = result.data;
            } else {
                templates.value = [];
                notifyService.error(result.error || '搜索模板失败');
            }
        } catch (error) {
            templates.value = [];
            notifyService.error('搜索模板时发生错误');
        } finally {
            loading.value = false;
        }
    }

    function applyTemplate(template: TemplateItem) {
        try {
            const parsed = JSON.parse(template.code_file || '{}');
            const flowMetadata: FlowMetadata = {
                id: uuid(),
                kind: 'eventflow',
                code: '',
                name: '',
                description: '',
                version: '',
                nodes: parsed.nodes || [],
                edges: parsed.edges || [],
                extension: {},
            };
            const vueFlowData = convertFlowMetadata2VueFlowData(flowMetadata);
            setNodes(vueFlowData.nodes);
            setEdges(vueFlowData.edges);
            afterReloadFlowRef?.();
            notifyService.success('模板应用成功');
        } catch (error) {
            notifyService.error('模板数据解析失败，无法应用');
        }
    }

    function clearSearch() {
        searchKeyword.value = '';
        templates.value = [];
        showDropdown.value = false;
    }

    templateSearchInstance = {
        searchKeyword,
        templates,
        loading,
        showDropdown,
        searchTemplates,
        applyTemplate,
        clearSearch,
    };

    return templateSearchInstance;
}
