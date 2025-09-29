import { MetadataService } from "../../metadata.service";
import { SchemaItem, SchemaRepositoryPagination } from "@farris/ui-vue";

export class FormSelectorSchemaService {
    private metadataType = '.frm';
    constructor(private metadataService: MetadataService) {
    }

    private getLocalMetadata(metadataPath) {
        return this.metadataService?.getMetadataListInSu(metadataPath, this.metadataType);
    }

    private metadata2SchemaItem(metadata: any[], category: string): SchemaItem[] {
        return metadata.filter((metadataItem) => {
            // 只允许vue表单
            if (metadataItem.properties?.framework === 'Vue') {
                return {
                    id: metadataItem.id,
                    name: metadataItem.name,
                    code: metadataItem.code,
                    nameSpace: metadataItem.nameSpace,
                    data: metadataItem,
                    category
                };
            }
        });
    }
    public getRecommandData = async (searchingText: string, pagination: SchemaRepositoryPagination, editorParams): Promise<SchemaItem[]> => {
        const { relativePath } = editorParams.formBasicInfo;

        const suMetadataRequest = await this.getLocalMetadata(relativePath);
        const localData = this.metadata2SchemaItem(suMetadataRequest.data, 'local');

        return localData;
    };
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
