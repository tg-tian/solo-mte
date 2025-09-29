import { UseDesignViewModel, UseSchemaService } from "../../../../components/types";
import { MetadataService } from "../../metadata.service";
import { LookupFieldSelectorService } from "../lookup/lookup-field-selector.service";

export function useEventMapping(designViewModelUtils: UseDesignViewModel, schemaService: UseSchemaService) {
    const metadataService = new MetadataService();
    async function getHelpFields(helpMetadataId: string) {
        const lookupFieldSelectorService = new LookupFieldSelectorService(metadataService);
        const path = metadataService.getMetadataPath();
        return await lookupFieldSelectorService.getData({ propertyData: { helpId: helpMetadataId }, formBasicInfo: { relativePath: path }});
    }

    async function getFormFields(viewModelId: string) {
        const fields = designViewModelUtils.getAllFields2TreeByVMId(viewModelId);
        const primaryField = schemaService.getPrimaryField();
        if (primaryField) {
            return fields.filter(item => item.data.bindingPath !== primaryField);
        }
        return fields;
    }

    return {
        getHelpFields,
        getFormFields
    };
}
