import { inject, Ref, ref, SetupContext, computed } from "vue";
import { ExternalComponentSchema, ExternalComponentType, UseExternalComponent } from "./types";
import { SchemaItem, FNotifyService, getSchemaByType, lookupDataSourceConverter } from "@farris/ui-vue";
import { UseFormSchema } from "../../../../../../components/types";
import { IdService } from "../../../../../../components/components/view-model-designer/method-manager/service/id.service";
import { MetadataService } from "../../../../../../components/composition/metadata.service";

export default function (context: SetupContext): UseExternalComponent {

    const notifyService = new FNotifyService();
    notifyService.globalConfig = { position: 'top-center' };
    const formSchemaUtils = inject('useFormSchema') as UseFormSchema;
    const idService = new IdService();
    const metadataService = new MetadataService();

    const module = formSchemaUtils.getModule();
    module.externalComponents = module.externalComponents || [];
    const externalComponents: Ref<ExternalComponentSchema[]> = ref(module.externalComponents);

    function getComponents(): Ref<ExternalComponentSchema[]> {
        return externalComponents;
    }

    function isPropertyValueUnique(propertyName: string, propertyValue: any): boolean {
        return externalComponents.value.findIndex((externalComponent) => {
            return externalComponent[propertyName] === propertyValue;
        }) < 0;
    }

    function getNewIdAndName(idPrefix: string, namePrefix: string): { newId: string, newName: string } {
        const DEFAULT_PREFIX = 'external-component';
        idPrefix = idPrefix || DEFAULT_PREFIX;
        namePrefix = namePrefix || DEFAULT_PREFIX;
        const needNameSuffix = isPropertyValueUnique('name', namePrefix) === false;
        while (true) {
            const randomSuffix = Math.random().toString(36).slice(2, 6);
            const newId = `${idPrefix}-${randomSuffix}`;
            const newName = needNameSuffix ? `${namePrefix}-${randomSuffix}` : namePrefix;
            if (isPropertyValueUnique('id', newId) === false) {
                continue;
            }
            if (needNameSuffix && isPropertyValueUnique('name', newName) === false) {
                continue;
            }
            return { newId, newName };
        }
    }

    /**
     * 获取帮助属性
     * @param component 帮助元数据
     */
    function getLookupPropertyValue(component: SchemaItem): Promise<any> {
        const formInfo = formSchemaUtils.getFormMetadataBasicInfo();
        const helpPropertyValue = getSchemaByType('lookup') || {};
        helpPropertyValue.enableToSelect = false;
        const propertyValue = {
            editor: helpPropertyValue
        };
        return metadataService.getPickMetadata(formInfo.relativePath, component)
            .then((result: any) => {
                const metadataContent = JSON.parse(result?.metadata.content);
                const metadata = {
                    id: metadataContent.id,
                    code: metadataContent.code,
                    name: metadataContent.name,
                    metadataContent
                };
                lookupDataSourceConverter.convertTo(propertyValue, 'dataSource', [metadata]);
                helpPropertyValue.dialog = helpPropertyValue.dialog || {};
                helpPropertyValue.dialog.title = metadataContent.name;
                const { newId, newName } = getNewIdAndName(metadataContent.code, metadataContent.name);
                propertyValue.editor.id = newId;
                propertyValue.editor.name = newName;
                return propertyValue;
            });
    }

    /**
     * 获取弹窗属性
     * @param component 表单元数据
     */
    function getModalPropertyValue(component: SchemaItem): any {
        const propertyValue = getSchemaByType('modal') || {};
        const { newId, newName } = getNewIdAndName(component.code, component.name);
        propertyValue.id = newId;
        propertyValue.name = newName;
        propertyValue.title = component.name;
        const idSuffix = idService.uuid().slice(5, 10);
        const externalContainerId = `external-container-${idSuffix}`;

        propertyValue["contents"] = [
            {
                id: externalContainerId,
                type: "external-container",
                appearance: {
                    class: "position-relative h-100"
                },
                externalComponent: {
                    id: component.id,
                    code: component.code,
                    name: component.name,
                    fileName: component.fileName || '',
                    relativePath: component.relativePath
                },
                onCommunication: ""
            }
        ];
        return propertyValue;
    }

    const selectedComponentId: Ref<string | undefined> = ref();

    function selectExternalComponent(externalComponentSchema?: ExternalComponentSchema): void {
        selectedComponentId.value = externalComponentSchema?.id || '';
        context.emit('selectionChange', externalComponentSchema);
    }

    function clearExternalComponentSelection(): void {
        selectedComponentId.value = '';
    }

    /**
     * 添加外部组件
     * @param component             目标元数据
     * @param externalComponentType 外部组件类型
     */
    function addComponent(component: SchemaItem, externalComponentType: ExternalComponentType) {
        const idSuffix = idService.uuid().slice(5, 10);
        const propertyValueId = `external-component-${idSuffix}`;

        if (externalComponentType === 'Lookup') {
            getLookupPropertyValue(component).then(propertyValue => {
                const helpPropertyValue = { id: propertyValueId, ...propertyValue.editor };
                externalComponents.value.push(helpPropertyValue);
                selectExternalComponent(helpPropertyValue);
            });
        } else {
            const propertyValue = { id: propertyValueId, ...getModalPropertyValue(component) };
            externalComponents.value.push(propertyValue);
            selectExternalComponent(propertyValue);
        }
    }

    /**
     * 删除外部组件
     * @param externalComponentSchema 待删除的外部组件
     */
    function deleteComponent(externalComponentSchema: ExternalComponentSchema) {
        const componentIndex = externalComponents.value.findIndex(component => component.id === externalComponentSchema.id);
        if (componentIndex > -1) {
            externalComponents.value.splice(componentIndex, 1);
        }
        selectExternalComponent(undefined);
    }

    const isSelected = computed(() => {
        return (externalComponentSchema: ExternalComponentSchema) => externalComponentSchema.id === selectedComponentId.value;
    });

    return {
        getComponents,
        addComponent,
        deleteComponent,
        selectExternalComponent,
        clearExternalComponentSelection,
        isSelected,
    };
}
