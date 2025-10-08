import { inject, ref, SetupContext } from "vue";
import { FMessageBoxService } from '@farris/ui-vue';
import { F_MODAL_SERVICE_TOKEN, FModalService } from "@farris/ui-vue";
import { FormSchema, FormSchemaEntity, FormSchemaEntityField, UseControlCreator, UseDesignViewModel, UseFormSchema, UseSchemaService } from "../../../types";
import FDesignerChangeSet from '../../change-set/change-set.component';
import { FLoadingService } from "@farris/ui-vue";

export function useUpdateEntitySchema(
    schemaService: UseSchemaService,
    useFormSchema: UseFormSchema,
    designViewModelUtils: UseDesignViewModel,
    controlCreatorUtils: UseControlCreator,
    context: SetupContext
) {
    const modalService: FModalService | null = inject(F_MODAL_SERVICE_TOKEN, null);
    const modalInstance = ref();

    /**
     * 判断主对象ID是否变更
     */
    function mainEntitiyIdHasChanged(currentSchemaEntities: FormSchemaEntity[], newSchemaEntities: FormSchemaEntity[]) {
        const currentMainEntity = currentSchemaEntities[0];
        const currentMainEntityId = currentMainEntity.id;
        const newMainEntityId = newSchemaEntities[0].id;
        return currentMainEntityId !== newMainEntityId;
    }

    /**
     * 旧表单升级：遍历schema字段
     */
    function recursiveField(oldField: FormSchemaEntityField, newField, formSchemaString: string): string {
        if (!oldField || !newField) {
            return formSchemaString;
        }
        if (oldField.$type === 'SimpleField') {
            // 简单字段：原表单中所有的id全量替换为新schema字段的id
            const regExp = new RegExp(oldField.id, 'g');
            formSchemaString = formSchemaString.replace(regExp, newField.id);
        } else if (oldField.type.fields && oldField.type.fields.length > 0) {
            // 复杂字段
            oldField.type.fields.forEach(f => {
                const childField = newField.type.fields.find(n => n.originalId === f.originalId);
                formSchemaString = recursiveField(f, childField, formSchemaString);
            });
        }
        return formSchemaString;
    }

    /**
     * 旧表单升级：遍历schema实体，原表单中所有的id全量替换为新schema字段的id
     */
    function recursiveSchema(
        currentSchemaEntities: FormSchemaEntity[],
        newSchemaEntities: FormSchemaEntity[],
        formSchemaString: string
    ): string {
        if (!currentSchemaEntities || currentSchemaEntities.length === 0 || !newSchemaEntities || newSchemaEntities.length === 0) {
            return formSchemaString;
        }
        currentSchemaEntities.forEach(entity => {
            const entityId = entity.id;
            const newEntity = newSchemaEntities.find(e => e.id === entityId);
            if (!newEntity) {
                return;
            }
            entity.type.fields.forEach(field => {
                const newField = newEntity.type.fields.find(f => f.originalId === field.originalId);
                formSchemaString = recursiveField(field, newField, formSchemaString);
            });
            if (entity.type.entities && entity.type.entities.length > 0) {
                formSchemaString = recursiveSchema(entity.type.entities, newEntity.type.entities as FormSchemaEntity[], formSchemaString);
            }
        });

        return formSchemaString;
    }

    /**
     * 升级历史实体结构, 解决id与originalId不匹配的问题
     */
    function updateEntitySchemaToLatest(
        currentSchemaEntities: FormSchemaEntity[],
        newSchemaEntities: FormSchemaEntity[]
    ): FormSchemaEntity[] {
        const currentFormSchema = useFormSchema.getFormSchema();
        let currentFormSchemaString = JSON.stringify(currentFormSchema);

        currentFormSchemaString = recursiveSchema(currentSchemaEntities, newSchemaEntities, currentFormSchemaString);
        useFormSchema.setFormSchema(JSON.parse(currentFormSchemaString));

        const schema = useFormSchema.getSchemas() as FormSchema;
        return schema.entities;
    }

    /**
     * 旧表单升级：判断主表的主键字段id和originalId是否相等 => 判断表单是否需要更新
     */
    function checkIfNeedToUpdateEntitySchema(oldSchemaEntities: FormSchemaEntity[]): boolean {
        if (!oldSchemaEntities || oldSchemaEntities.length === 0) {
            return false;
        }
        const mainEntity = oldSchemaEntities[0];
        const primaryLabel = mainEntity.type.primary;
        const { fields } = mainEntity.type;
        const primaryField = fields.find(f => f.label === primaryLabel);
        if (primaryField && primaryField.id === primaryField.originalId) {
            return false;
        }
        return true;
    }
    /**
     * 关闭弹窗
     */
    function onCancelChangesetModal() {
        if (modalInstance?.value?.close) {
            modalInstance.value.close();
        }
    }
    function onSubmitChangesetModal() {
        if (modalInstance?.value?.close) {
            modalInstance.value.close();
        }
        // 触发更新实体树以及画布
        context.emit('entityUpdated');
    }
    /**
     * 更新Schema节点
     */
    function updateEntitySchema(currentFormSchema: FormSchema, targetFormSchema: FormSchema) {
        // 升级历史实体结构：解决id与originalId不匹配的问题
        const updateVersion = useFormSchema.getUpdateVersion();
        if (updateVersion && updateVersion <= '190103' && checkIfNeedToUpdateEntitySchema(currentFormSchema.entities)) {
            currentFormSchema.entities = updateEntitySchemaToLatest(currentFormSchema.entities, targetFormSchema.entities);
        }
        const designerService = {
            formSchemaUtils: useFormSchema,
            designViewModelUtils,
            schemaService,
            controlCreatorUtils
        };
        const dialog = modalService?.open({
            title: '更新实体结构',
            draggable: true,
            fitContent: false,
            height: 560,
            width: 950,
            showButtons: false,
            render: () => {
                return <FDesignerChangeSet style="margin:0 1rem" currentFormSchema={currentFormSchema} targetFormSchema={targetFormSchema}
                    designerService={designerService}
                    onCancel={onCancelChangesetModal} onSubmit={onSubmitChangesetModal}></FDesignerChangeSet>;
            }
        });

        modalInstance.value = dialog?.modalRef?.value;
    }

    /**
     * 校验并更新Schema
     */
    function checkAndUppdateEntitySchema(currentSchema: FormSchema, newSchema: FormSchema) {
        if (!newSchema) {
            return;
        }

        if (mainEntitiyIdHasChanged(currentSchema.entities, newSchema.entities)) {
            FMessageBoxService.question('询问', '视图对象主对象的Id已经变更, 更新后需要重新添加控件, 是否继续更新？',
                () => {
                    // 场景①：表单主对象ID已更改，但用户选择更新
                    updateEntitySchema(currentSchema, newSchema);
                }, () => {
                    // 场景②：表单主对象ID已更改，但用户选择不更新
                    return;
                });
        } else {
            // 场景③：表单主对象ID未更改，表单升级后更新schema节点
            updateEntitySchema(currentSchema, newSchema);
        }
    }

    /**
     * 由视图对象向页面同步实体结构
     */
    function synchronizeFromViewObject(loadingService: FLoadingService | any) {
        const loadingInstance = loadingService.show();
        const schema = useFormSchema.getSchemas() as FormSchema;
        schemaService.convertViewObjectToEntitySchema(schema.id, '').then((newSchema: FormSchema | undefined) => {
            if (newSchema) {
                checkAndUppdateEntitySchema(schema, newSchema);
            }
            loadingInstance.value?.close();
        }, (error) => {
            FMessageBoxService.error(error?.response?.data?.Message || '更新失败', '');
            loadingInstance.value?.close();
        });
    }

    return { synchronizeFromViewObject };

}
