import { SetupContext, defineComponent, ref, inject } from "vue";
import { FNotifyService } from "@farris/ui-vue";
import { methodEditorProps, MethodEditorProps } from "./method-editor.props";
import { UseFormSchema } from "../../../../../types";

export default defineComponent({
    name: 'FMethodEditor',
    props: methodEditorProps,
    emits: ['cancel', 'submit'],
    setup(props: MethodEditorProps, context) {

        const commandData = ref<any>({
            id: props.command?.id,
            code: props.command?.code || '',
            name: props.command?.name || ''
        });

        const commandsInViewModel = ref(props.activeViewModel?.commands || []);
        const activeViewModelId = ref(props.activeViewModel?.id || '');

        const notifyService: any = new FNotifyService();
        notifyService.globalConfig = { position: 'top-center' };

        const useFormSchema = inject('useFormSchema') as UseFormSchema;

        /**
         * 校验方法编号、名称是否合规
         */
        function validateCommand() {
            // 1、同一个视图模型下名称不可重复
            const commandNames = commandsInViewModel.value.map((command: any) => {
                if (command.id !== commandData.value.id) { return command.name; }
            });
            if (commandNames.includes(commandData.value.name.trim())) {
                notifyService.warning({ message: `【${commandData.value.name.trim()}】已存在，请修改！` });
                return false;
            }

            const newCommandCode = commandData.value.code.trim();
            // 2、当前视图模型下编号不可重复，编号不区分大小写
            const commandCodes = commandsInViewModel.value.filter((command) => command.id !== commandData.value.id)
                .map((command) => command.code.toLowerCase());
            if (commandCodes.includes(newCommandCode.toLowerCase())) {
                notifyService.warning({ message: `【${newCommandCode}】已存在，请修改！` });
                return false;
            }

            // 3、其他视图模型下编号不可重复
            const viewModels = useFormSchema.getFormSchema().module.viewmodels;
            viewModels.filter((viewModel) => viewModel.id !== activeViewModelId.value)
                .forEach((viewModel) => {
                    const commandCodesInViewModel = viewModel.commands.map((command) => command.code.toLowerCase());
                    if (commandCodesInViewModel.includes(newCommandCode)) {
                        notifyService.warning({ message: '视图模型【' + viewModel.id + '】中已存在命令编号【' + newCommandCode + '】，请修改！' });
                        return false;
                    }
                });

            // 4、编号格式：由英文字母开头，英文字母、数字和下划线组成
            const reg1 = /^[a-zA-Z][a-zA-Z0-9_]*$/;
            if (!reg1.test(newCommandCode)) {
                notifyService.warning({ message: '方法编号必须以英文字母开头，并且只能由英文字母、数字、下划线组成！' });
                return false;
            }
            return true;
        }

        function onCancelClicked() {
            context.emit('cancel');
        }
        function onSubmitClicked() {
            if (!commandData.value?.name?.trim()) {
                notifyService.warning('请输入方法名称');
                return;
            }
            if (!commandData.value?.code?.trim()) {
                notifyService.warning('请输入方法编号');
                return;
            }
            if (!validateCommand()) {
                return;
            }

            context.emit('submit', {
                code: commandData.value.code.trim(),
                name: commandData.value.name.trim()
            });
        }

        return () => {
            return (
                <div class="f-method-editor h-100  f-utils-fill-flex-column"  >
                    <div class="f-utils-fill">
                        <div class="farris-form-controls-inline p-3">

                            <div class="farris-group-wrap ">
                                <div class="form-group farris-form-group">
                                    <label class="col-form-label">
                                        <span class="farris-label-info text-danger">*</span>
                                        <span class="farris-label-text">方法名称</span>
                                    </label>
                                    <div class="farris-input-wrap">
                                        <input type="input" class="form-control" v-model={commandData.value.name}
                                            placeholder="请输入方法名称" />
                                    </div>
                                </div>
                            </div>

                            <div class="farris-group-wrap ">
                                <div class="form-group farris-form-group">
                                    <label class="col-form-label">
                                        <span class="farris-label-info text-danger">*</span>
                                        <span class="farris-label-text"> 方法编号 </span>
                                    </label>
                                    <div class="farris-input-wrap">
                                        <input type="input" class="form-control" v-model={commandData.value.code}
                                            placeholder="请输入方法编号" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onClick={onCancelClicked}>取消</button>
                        <button type="button" class="btn btn-primary" onClick={onSubmitClicked}>确定</button>
                    </div>

                </div>
            );
        };
    }
});
