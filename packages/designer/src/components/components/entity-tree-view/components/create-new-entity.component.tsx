import { FNotifyService } from '@farris/ui-vue';
import axios from 'axios';
import { defineComponent, SetupContext } from 'vue';
import { CreateNewEntityProps, createNewEntityProps } from './entity-tree-view.props';
import { resolvePresetFields } from '../composition/preset-entity-fields';
import { IdService } from '../../view-model-designer/method-manager/service/id.service';

/**
 * 新建子实体
 */
export default defineComponent({
    name: 'FCreateNewEntity',
    props: createNewEntityProps,
    emits: ['cancel', 'submit'] as (string[] & ThisType<void>) | undefined,
    setup(props: CreateNewEntityProps, context: SetupContext) {
        const notifyService: any = new FNotifyService();
        notifyService.globalConfig = { position: 'top-center' };

        const entityInfo = { id: '', code: '', name: '' };
        function onCancel() {
            context.emit('cancel');
        }

        function checkValidation() {
            if (!entityInfo.code) {
                notifyService.warning('请填写实体编号！');
                return;
            }
            if (!entityInfo.name) {
                notifyService.warning('请填写实体名称！');
                return;
            }
            if (props.existedEntityCodes) {
                const lowerEntityCodes = props.existedEntityCodes.map(code => code.toLowerCase());
                if (lowerEntityCodes.includes(entityInfo.code.toLowerCase())) {
                    notifyService.warning('编号已存在，请重新输入。');
                    return;
                }
            }

            return true;
        }
        function getValidEntityLabel() {
            const voId = props.useFormSchema.getSchemas().id;
            const formBasicInfo = props.useFormSchema.getFormMetadataBasicInfo();
            const dimension1 = formBasicInfo.dimension1 || '';
            const dimension2 = formBasicInfo.dimension2 || '';
            const url = `/api/runtime/bcc/v1.0/template/newTableLabel?voId=${voId}&tableCode=${entityInfo.code}&dim1=${dimension1}&dim2=${dimension2}`;
            return axios.get(url);
        }
        function onSubmit() {
            if (!checkValidation()) {
                return;
            }
            getValidEntityLabel().then(result => {
                if (!result?.data) {
                    notifyService.warning('编号已存在，请重新输入。');
                    return;
                }
                Object.assign(entityInfo, {
                    id: new IdService().generate(),
                    label: result.data,
                    type: {
                        name: entityInfo.code,
                        primary: 'id',
                        fields: resolvePresetFields(),
                        entities: [],
                        displayName: entityInfo.name
                    }
                });

                context.emit('submit', entityInfo);
            }, () => {
                notifyService.console.error('获取子实体Label属性失败');
            });

        }
        return () => {
            return <div class="h-100 d-flex flex-column flex-fill">
                <div class="farris-form-controls-inline p-3">
                    <div class="farris-group-wrap">
                        <div class="form-group farris-form-group">
                            <label class="col-form-label">
                                <span class="farris-label-text">实体编号</span>
                            </label>
                            <div class="farris-input-wrap">
                                <input class="form-control" type="text" v-model={entityInfo.code} />
                            </div>
                        </div>
                    </div>

                    <div class="farris-group-wrap">
                        <div class="form-group farris-form-group">
                            <label class="col-form-label">
                                <span class="farris-label-text">实体名称</span>
                            </label>
                            <div class="farris-input-wrap">
                                <input class="form-control" type="text" v-model={entityInfo.name} />
                            </div>
                        </div>
                    </div>

                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onClick={onCancel}>取消</button>
                    <button type="button" class="btn btn-primary" onClick={onSubmit}>确定</button>
                </div>
            </div>;
        };


    }
});
