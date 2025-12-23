import { Ref } from "vue";

export interface UsePage {

    createPage: () => void;

    pages: Ref<Record<string, any>[]>;

    metadataGroup: Ref<Record<string, any>[]>;

    getPages: () => Promise<Record<string, any>[]>;

    getAllMetadata: () => Promise<Record<string, any>[]>;

    getAllMetadataTypes: () => Promise<Record<string, any>[]>;

    getMetadataGroup: () => Promise<Record<string, any>[]>;

    frameworkData: Record<string, any>[];

    metadataTypeData: Record<string, any>[];
}
