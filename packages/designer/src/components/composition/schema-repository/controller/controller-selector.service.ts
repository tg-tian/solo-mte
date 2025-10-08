import { MetadataService } from "../../metadata.service";
import { SchemaItem, SchemaRepositoryPagination, SchemaCategory } from "@farris/ui-vue";
import { UseDesignerContext } from "../../../../components/types/designer-context";

export class ControllerSelectorSchemaService {
    private metadataType = '.webcmd';

    constructor(private metadataService: MetadataService, private designerContext: UseDesignerContext) {
    }

    public getNavigationData = (searchingText: string, pagination: SchemaRepositoryPagination): SchemaCategory[] => {
        return this.designerContext.controllCategories;
    };

    public getRecentlyData(searchingText: string, pagination: SchemaRepositoryPagination): SchemaItem[] {
        return [];
    }

    public getRecommandData(searchingText: string, pagination: SchemaRepositoryPagination): SchemaItem[] {
        return [];
    }

    private metadata2SchemaItem(metadata: any[], category: string): SchemaItem[] {
        const { supportedControllers } = this.designerContext;

        return metadata.filter((metadataItem) => {
            // 支持自定义构件
            if (metadataItem.nameSpace.includes('.Front')) {
                return true;
            }
            // 移除暂不支持的内置控制器
            if (!supportedControllers[metadataItem.id]) {
                return false;
            }
            return {
                id: metadataItem.id,
                name: metadataItem.name,
                code: metadataItem.code,
                nameSpace: metadataItem.nameSpace,
                data: metadataItem,
                category
            };
        }

        );
    }

    public getSchemaData = async (searchingText: string, pagination: SchemaRepositoryPagination, editorParams): Promise<SchemaItem[]> => {
        const { relativePath } = editorParams.formBasicInfo;
        const allMetadataRes = await this.metadataService?.getAllMetadataList(relativePath, this.metadataType);
        let items = allMetadataRes.data;
        if (items.metadataIndexItems) {
            items = items.metadataIndexItems;
        }
        if (items.list) {
            items = items.list.map(item => item.metadata);
        }
        return this.metadata2SchemaItem(items, 'all');
    };
}
