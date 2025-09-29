import { computed, defineComponent, Ref, ref } from "vue";
import { externalComponentSelectorProps, ExternalComponentSelectorProps } from "./external-component-selector.props";
import {
    LookupSchemaRepositoryToken, FormSchemaRepositorySymbol, FSchemaSelector,
    SchemaItem, FNotifyService, FMessageBoxService,
} from "@farris/ui-vue";
import { MetadataService } from "../../../../../../../components/composition/metadata.service";
import { FormMetadaDataDom } from "../../../../../../../components/types";

export default defineComponent({
    name: 'FExternalComponentSelector',
    props: externalComponentSelectorProps,
    emits: ['close', 'submit'],
    setup(props: ExternalComponentSelectorProps, context) {
        const selectedComponent: Ref<SchemaItem | undefined> = ref();
        const { externalComponentType, formSchemaUtils } = props;
        const notifyService = new FNotifyService();
        notifyService.globalConfig = { position: 'top-center' };

        const metadataService = new MetadataService();

        const formBasicInfo = formSchemaUtils.getFormMetadataBasicInfo();
        const editorParams = { formBasicInfo, enableGroup: false };
        const viewOptions = [
            { id: 'recommend', title: '推荐', type: 'Card', dataSource: 'Recommand', pagination: true },
            { id: 'total', title: '全部', type: 'Card', dataSource: 'Total', pagination: true }
        ];
        const injectSymbolToken = computed(() => {
            return externalComponentType === 'Independence' ? FormSchemaRepositorySymbol : LookupSchemaRepositoryToken;
        });

        /**
         * 选择外部组件
         * @param $event 已选数据
         */
        function onSelectionChange($event: any[]) {
            if (externalComponentType === 'Lookup') {
                selectedComponent.value = $event?.length ? $event[0].data : null;
            } else {
                selectedComponent.value = $event?.length ? $event[0] : null;;
            }
        }

        function queryControlByPredicate(formMetadataDom: FormMetadaDataDom, predicate: (control: any) => boolean): any {
            const controlsToScan = [...formMetadataDom.module.components];
            while (controlsToScan.length) {
                const control = controlsToScan.pop();
                if (predicate(control)) {
                    return control;
                }
                if (Array.isArray(control?.contents)) {
                    controlsToScan.push(...control.contents);
                }
            }
        }

        function containsNestedForm(formMetadataDom: FormMetadaDataDom): boolean {
            const nestedControlTypes = ['modal', 'external-container'];
            const externalComponents = formMetadataDom.module.externalComponents || [];
            for (const externalComponent of externalComponents) {
                const controlType = externalComponent?.type;
                if (nestedControlTypes.includes(controlType)) {
                    return true;
                }
            }
            const predicate = (control: any) => {
                return nestedControlTypes.includes(control?.type);
            };
            if (queryControlByPredicate(formMetadataDom, predicate)) {
                return true;
            }
            return false;
        }

        async function validateFormSchema(formSchema?: SchemaItem): Promise<boolean> {
            if (!formSchema) {
                notifyService.warning('请选择表单');
                return false;
            }
            return metadataService.getPickMetadata(formBasicInfo.relativePath, formSchema).then((result: any) => {
                const metadata = JSON.parse(result?.metadata.content);
                const formMetadataDom = metadata.Contents as FormMetadaDataDom;
                const targetFormId = formMetadataDom.module.id;
                const isCurrentFormSelected = targetFormId === formBasicInfo.id;
                if (isCurrentFormSelected || containsNestedForm(formMetadataDom)) {
                    const message = isCurrentFormSelected
                        ? `不支持将当前表单作为弹窗使用。`
                        : `表单【${formSchema.name}】嵌套了外部表单，不支持作为弹窗使用。`;
                    FMessageBoxService.warning(message, '');
                    return false;
                }
                selectedComponent.value = result.metadata;  // 使用更详细的元数据信息
                return true;
            }).catch((error) => {
                FMessageBoxService.error(error?.error || `查询表单【${formSchema.name}】失败`, '');
                return false;
            });
        }

        async function validateLookupSchema(lookupSchema?: SchemaItem): Promise<boolean> {
            if (!lookupSchema) {
                notifyService.warning('请选择帮助');
                return false;
            }
            return true;
        }

        /**
         * 校验外部组件数据
         */
        function validate(): Promise<boolean> {
            if (externalComponentType === 'Independence') {
                return validateFormSchema(selectedComponent.value);
            } else {
                return validateLookupSchema(selectedComponent.value);
            }
        }

        function onSubmit() {
            context.emit('submit', selectedComponent.value);
        }

        function onCancel() {
            context.emit('close');
        }

        return () => {
            return (
                <FSchemaSelector
                    injectSymbolToken={injectSymbolToken.value}
                    view-type='Tabs'
                    view-options={viewOptions}
                    editorParams={editorParams}
                    formSchemaUtils={formSchemaUtils}
                    show-footer={true}
                    onSelectionChange={onSelectionChange}
                    validateFunction={validate}
                    onSubmit={onSubmit}
                    onCancel={onCancel}
                ></FSchemaSelector>
            );
        };
    }

});
