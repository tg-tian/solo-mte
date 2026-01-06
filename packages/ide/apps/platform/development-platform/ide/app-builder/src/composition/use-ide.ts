import { UseIde, UseWorkspace } from "./types";
import { GSP } from "./gsp/gsp";

export function useIde(useWorkspaceComposition: UseWorkspace): UseIde {

    window['gsp'] = window['gsp'] || new GSP();
    window['gsp']['workspace'] = window['gsp']['workspace'] || useWorkspaceComposition;

    function setDesignerStatus(metadataId: string, isDirty: boolean) {
        //   this.emit('set-designer-status', {id: metadataId, isDirty});
    }

    function getInitCommandData(frameId: string) {
        return window['gsp'].ide.getInitCommandData(frameId);
    }

    function setInitCommandData(frameId: string, data: any) {
        window['gsp'].ide.setInitCommandData(frameId, data);
    }

    return {
        setDesignerStatus,
        getInitCommandData,
        setInitCommandData,
    };
}