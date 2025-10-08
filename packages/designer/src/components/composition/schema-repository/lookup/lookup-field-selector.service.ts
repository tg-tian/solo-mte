import axios from 'axios';
import { DesignerMode } from '../../../../components/types/designer-context';
import { useDesignerContext } from '../../designer-context/use-designer-context';

import { MetadataService } from "../../metadata.service";

export class LookupFieldSelectorService {
    private designerMode = useDesignerContext().designerMode;

    constructor(private metadataService: MetadataService) {
    }

    /**
     * schema字段集合组装成树
     * @param fields schema字段集合
     */
    private assembleFields2Tree(fields: any[]) {
        const treeData: any = [];
        fields.forEach(element => {
            // 关联表字段 / UDT字段
            let children = [];
            if (element.type && element.type.fields && element.type.fields.length > 0) {
                children = this.assembleFields2Tree(element.type.fields);

            }
            // 适配旧的帮助元数据没有bindingPath属性
            if (!element.bindingPath) {
                element.bindingPath = element['parentPath'] ? element['parentPath'] + '.' + element.label : element.label;
            }
            treeData.push({
                data: element,
                children,
                expanded: true,
                selectable: !children.length
            });
        });
        return treeData;
    }

    private buildTreeData(schema: any) {
        if (!schema || !schema.entities || schema.entities.length === 0) {
            return;
        }
        const mainTable = schema.entities[0];
        if (mainTable.type && mainTable.type.fields) {
            return this.assembleFields2Tree(mainTable.type.fields);
        }

    }

    getData(editorParams: any) {
        const { propertyData, formBasicInfo } = editorParams;
        const metadataPath = formBasicInfo?.relativePath;

        return this.metadataService && this.metadataService.getRefMetadata(metadataPath, propertyData?.helpId).then((res) => {
            const metadata = JSON.parse(res.data.content);
            return metadata && metadata.schema && metadata.schema.main && this.buildTreeData(metadata.schema.main);
        });
    }

    private async getMetadata(id: string) {
        return await this.metadataService.getRefMetadata('', id).then(res => res.data);
    }

    async getLookupConditions(editorParams: any) {
        const { dataSourceId, viewModelId, propertyData } = editorParams;
        const { dataSource } = propertyData;
        const configElementId = dataSource.uri.replace('.', '/');
        if (viewModelId) {
            const voMetadata = await this.getMetadata(viewModelId);
            if (voMetadata && voMetadata.content) {
                const voMetadataContent = JSON.parse(voMetadata.content);
                // 提取帮助过滤条件
                const valueHelpConfigs = voMetadataContent.ValueHelpConfigs || [];
                const helpConfig = valueHelpConfigs.find(config => config.ElementID === configElementId && config.HelperID === dataSourceId);
                if (helpConfig && helpConfig.HelpExtend.BeforeHelp && helpConfig.HelpExtend.BeforeHelp.length > 0) {
                    const { ParameterCollection } = helpConfig.HelpExtend.BeforeHelp[0];

                    const filterCondition = ParameterCollection && ParameterCollection.length > 0 ? ParameterCollection.find(param => param.ParamCode === 'filterCondition') : null;
                    if (filterCondition && filterCondition.ParamActualValue && filterCondition.ParamActualValue.Enable && filterCondition.ParamActualValue.HasValue) {
                        const actualValue = filterCondition.ParamActualValue.Value || '';
                        if (actualValue) {
                            return JSON.parse(actualValue);
                        }
                    }
                }
            }
        }

        return null;
    }

    async saveFilterCondition(conditions, editorParams) {
        conditions = conditions.filter(c => c.filterField);
        const conditionsStr = JSON.stringify(conditions);
        const { propertyData, formBasicInfo, viewModelId, dataSourceId } = editorParams;
        const { dataSource } = propertyData;
        const configElementId = dataSource.uri.replace('.', '/');

        const voMetadata = await this.getMetadata(viewModelId);
        const voMetadataContent = JSON.parse(voMetadata.content);

        const filterComponentEntityId = '07156c90-f6ee-4d1b-ad57-a40e4027c50c'; // 过滤筛选构件id
        const valueHelpConfigs = voMetadataContent.ValueHelpConfigs;
        const helpConfig = valueHelpConfigs.find(config => config.ElementID === configElementId);

        const requestHelpConfig: any = {
            filterCondition: conditionsStr,
            helpConfig: {
                ElementID: configElementId,
                HelperID: dataSourceId,
                FilterExpression: '',
                CustomizationInfo: null,
                EnableCustomHelpAuth: false,
                HelpExtend: {}
            },
            path: formBasicInfo.relativePath,
            sortCondition: ''
        };

        if (helpConfig) {
            requestHelpConfig.helpConfig.FilterExpression = helpConfig.FilterExpression;
            requestHelpConfig.helpConfig.CustomizationInfo = helpConfig.CustomizationInfo;
            requestHelpConfig.helpConfig.EnableCustomHelpAuth = helpConfig.EnableCustomHelpAuth;
            requestHelpConfig.helpConfig.HelpExtend = helpConfig.HelpExtend || {};

            if (helpConfig.HelpExtend && helpConfig.HelpExtend.BeforeHelp) {
                const oldFilterConfig = helpConfig.HelpExtend.BeforeHelp.find(config => config.ComponentEntityId === filterComponentEntityId);
                if (oldFilterConfig && oldFilterConfig.ParameterCollection) {
                    const sortCondition = oldFilterConfig.ParameterCollection.find(param => param.ParamName === 'orderByCondition');
                    if (sortCondition && sortCondition.ParamActualValue && sortCondition.ParamActualValue.Enable) {
                        requestHelpConfig.sortCondition = sortCondition.ParamActualValue.Value || '';
                    }
                }
            }
        }
        this.setFilterExpressionAndDimensionForRtc(requestHelpConfig, editorParams);
        requestHelpConfig.helpConfig = JSON.stringify(requestHelpConfig.helpConfig);


        // 调用接口获取全量的voHelpConfig
        const convertHelpConfigFilterSortUrl = '/api/dev/main/v1.0/bff/handleHelpConfigFilterSort';

        return axios.put(convertHelpConfigFilterSortUrl, requestHelpConfig).then((res: any) => {
            const { data } = res;
            if (!data || !data.HelpExtend || !data.HelpExtend.BeforeHelp) {
                return;
            }

            if (helpConfig) {
                Object.assign(helpConfig, data);
            } else {
                voMetadataContent.ValueHelpConfigs.push(data);
            }

            // 保存
            voMetadata.content = JSON.stringify(voMetadataContent);

            const content = {
                ID: voMetadata.id,
                NameSpace: voMetadata.nameSpace,
                Code: voMetadata.code,
                Name: voMetadata.name,
                FileName: voMetadata.fileName,
                RelativePath: voMetadata.relativePath,
                Content: voMetadata.content,
                Type: voMetadata.type,
                BizobjectID: voMetadata.bizobjectID,
                ExtendProperty: voMetadata.extendProperty,
                Extendable: voMetadata.extendable,
                NameLanguage: !voMetadata.nameLanguage ? null : voMetadata.nameLanguage,
                Properties: voMetadata.properties,
            };

            return this.metadataService.saveMetadata(content, formBasicInfo);
        });

    }

    /**
     * 运行时定制：在帮助配置中添加FilterExpression以及维度信息
     */
    private setFilterExpressionAndDimensionForRtc(requestHelpConfig: any, editorParams: any) {
        if (requestHelpConfig.helpConfig && editorParams.formBasicInfo && this.designerMode === DesignerMode.PC_RTC) {

            const { dimension1, dimension2 } = editorParams.formBasicInfo;
            requestHelpConfig.helpConfig.FilterExpression = requestHelpConfig.filterCondition || '';
            requestHelpConfig.helpConfig.CustomizationInfo = {
                Customized: true,
                DimensionInfo: {
                    FirstDimension: dimension1,
                    FirstDimensionCode: dimension1,
                    SecondDimension: dimension2,
                    SecondDimensionCode: dimension2
                }
            };
        }
    }
}
