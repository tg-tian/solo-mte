/* eslint-disable no-restricted-syntax */
import { FormComponent, FormMetadaDataDom, FormViewModel, MetadataDto, UseFormSchema } from "../types";

export function useFormSchema(): UseFormSchema {
    /** 表单元数据外层信息 */
    let formMetaBasicInfo: MetadataDto;
    /** 表单元数据 */
    let formSchema: FormMetadaDataDom;

    /** 获取表单元数据外层信息 */
    function getFormMetadataBasicInfo(): MetadataDto {
        return formMetaBasicInfo;
    }
    function setFormMetadataBasicInfo(metadata: MetadataDto) {
        formMetaBasicInfo = metadata;
    }

    /** 获取表单元数据 */
    function getFormSchema() {
        return formSchema;
    }
    function setFormSchema(newFormSchema: FormMetadaDataDom) {
        formSchema = newFormSchema;
    }
    /** 查找组件节点 */
    function getComponentById(targetComponentId: string): FormComponent | undefined {
        if (!formSchema.module || !formSchema.module.components || formSchema.module.components.length === 0) {
            return;
        }

        return formSchema.module.components.find(component => component.id === targetComponentId);
    }

    function getComponentByViewModelId(targetViewModelId: string): FormComponent | undefined {
        if (!formSchema.module || !formSchema.module.components || formSchema.module.components.length === 0) {
            return;
        }

        return formSchema.module.components.find(component => component.viewModel === targetViewModelId);
    }
    function getViewModelById(targetViewModelId: string): FormViewModel | undefined {
        if (!formSchema.module || !formSchema.module.viewmodels || formSchema.module.viewmodels.length === 0) {
            return;
        }

        return formSchema.module.viewmodels.find(viewModel => viewModel.id === targetViewModelId);
    }

    /**
     * 根据指定的条件遍历查找节点
     * @param rootNode 容器节点
     * @param predict 条件
     */
    function selectNode(rootNode: any, predict: (item: any) => boolean): any {
        if (!rootNode) {
            return null;
        }
        if (predict(rootNode)) {
            return rootNode;
        }
        if (rootNode.contents) {
            for (const item of rootNode.contents) {
                const found = selectNode(item, predict);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }
    /**
     * 根据指定的条件遍历查找节点，返回节点及其父节点
     * @param rootNode 容器节点
     * @param predict 预设的判断逻辑
     * @param parentNode 父节点
     */
    function selectNodeAndParentNode(
        rootNode: any,
        predict: (item: any) => boolean, parentNode: any
    ): { node: any; parentNode: any } | undefined {
        if (!rootNode) {
            return;
        }
        if (predict(rootNode)) {
            return {
                node: rootNode,
                parentNode
            };
        }
        if (rootNode.contents) {
            for (const item of rootNode.contents) {
                const found = selectNodeAndParentNode(item, predict, rootNode);
                if (found) {
                    return found;
                }
            }
        }
    }
    return {
        getFormSchema,
        setFormSchema,
        getComponentById,
        getComponentByViewModelId,
        getViewModelById,
        selectNode,
        selectNodeAndParentNode,
        getFormMetadataBasicInfo,
        setFormMetadataBasicInfo
    };
}
