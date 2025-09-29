import { useDesignerContext } from "../designer-context/use-designer-context";

export function getAllSupportedControllers() {
    const designerContext = useDesignerContext();
    return designerContext.supportedControllers;
}

export function getSupportedControllerMethods(controllerId, commandList) {
    if (!controllerId || !commandList) {
        return [];
    }
    const supportedControllers = getAllSupportedControllers();
    const supportedCommands = supportedControllers[controllerId] || [];
    const supportedCommandIds = supportedCommands.map(command => command.id);
    return commandList.filter(command => supportedCommandIds.includes(command.Id));
}
