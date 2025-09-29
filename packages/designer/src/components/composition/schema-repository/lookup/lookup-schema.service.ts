import { SchemaItem, SchemaRepositoryPagination } from "@farris/ui-vue";
import { MetadataService } from "../../metadata.service";

export class LookupSchemaService {

    private metadataType = '.hlp';

    constructor(private metadataService: MetadataService) { }

    private getLocalMetadata(metadataPath) {
        return this.metadataService?.getMetadataListInSu(metadataPath, this.metadataType);
    }

    private getRecentMetadata(metadataPath) {
        return this.metadataService?.getRecentMetadata(metadataPath, this.metadataType);
    }

    private metadata2SchemaItem(metadata: any[], category: string): SchemaItem[] {
        return metadata.map((metadataItem) => {
            return {
                id: metadataItem.id,
                name: metadataItem.name,
                code: metadataItem.code,
                nameSpace: metadataItem.nameSpace,
                hide: false,
                active: false,
                data: metadataItem,
                category
            };
        });
    }

    private mergeAndDeduplicateById<T extends { id: string | number }>(...items: T[][]): T[] {
        const idSet = new Set<string | number>();
        const mergedItems: T[] = [];

        for (const array of items) {
            for (const item of array) {
                if (!idSet.has(item.id)) {
                    idSet.add(item.id);
                    mergedItems.push(item);
                }
            }
        }
        return mergedItems;
    }

    getRecommandData = async (searchingText: string, pagination: SchemaRepositoryPagination, editorParams: any): Promise<SchemaItem[]> => {
        const { relativePath } = editorParams.formBasicInfo;
        const shouldDeduplicate = editorParams.enableGroup === false;
        const recentRequest = await this.getRecentMetadata(relativePath);
        const recentData = this.metadata2SchemaItem(recentRequest.data, 'recent');

        const suMetadataRequest = await this.getLocalMetadata(relativePath);
        const localData = this.metadata2SchemaItem(suMetadataRequest.data, 'local');

        if (shouldDeduplicate) {
            return this.mergeAndDeduplicateById(recentData, localData);
        }
        return recentData.concat(localData);
    };

    getSchemaData = async (searchingText: string, pagination: SchemaRepositoryPagination, editorParams: any): Promise<SchemaItem[]> => {
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
