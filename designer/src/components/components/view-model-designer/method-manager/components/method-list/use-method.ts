import { inject, ref } from "vue";
import { UseFormSchema } from "../../../../../types";
import { MethodListProps } from "./method-list.props";
import { Command } from "../../entity/command";
import { ParamConfig } from "../../entity/param";

export function useViewModelMethod(props: MethodListProps) {

    /** 方法列表绑定数据源 */
    const commandsData = ref(props.commandsData || []);

    /** 当前选中的表格行数据 */
    const selectedTreeNode = ref();

    /** 当前是否选中方法行。选中方法：true；选中操作或者分支：false */
    const isCommandNodeSelected = ref(false);

    /** 当前选中方法的参数列表 */
    const paramsData = ref([]);

    /** 当前方法所属的视图模型 */
    const activeViewModel = ref(props.activeViewModel);

    const useFormSchema = inject('useFormSchema') as UseFormSchema;

    /**
     * 更新参数列表
     */
    function refreshParamListData() {
        if (commandsData.value.length === 0) {
            paramsData.value = [];
            return;
        }
        if (isCommandNodeSelected.value) {
            paramsData.value = selectedTreeNode.value.data.params || [];
        } else {
            paramsData.value = [];
        }
    }

    /**
     * 切换选中的方法
     */
    function onChangeSelectedCommand(selectedItems: any[]) {
        selectedTreeNode.value = selectedItems[0];
        // isCommandNodeSelected.value = !selectedTreeNode.value.parent;

        refreshParamListData();
    }

    /**
     * 将变更同步到表单DOM中
     * @param commands 命令列表
     */
    function updateViewModel(commands: Array<Command>) {
        if (!commands || !activeViewModel.value) {
            return;
        }

        activeViewModel.value.commands = commands.length > 0 ? commands
            .filter((command: Command) => command.data instanceof Command && command.data.toJson)
            .map((commandData: Command) => {
                return commandData.toJson();
            }) : [];

        const originalViewModel = useFormSchema?.getViewModelById(activeViewModel.value.id);
        if (originalViewModel) {
            originalViewModel.commands = activeViewModel.value.commands;
        }

    }

    /**
     * 更新当前命令的参数信息---用于构件中参数被移除的场景
     */
    function updateCommandParamFromWebCmd() {
        selectedTreeNode.value.data.params = selectedTreeNode.value.data.params.filter((parameter: ParamConfig) => !parameter.isDisused);
        selectedTreeNode.value.data.needRefreshParam = false;

        refreshParamListData();

        updateViewModel(commandsData.value);
    }

    return {
        commandsData,
        activeViewModel,
        selectedTreeNode,
        isCommandNodeSelected,
        paramsData,
        onChangeSelectedCommand,
        updateCommandParamFromWebCmd
    };
}
