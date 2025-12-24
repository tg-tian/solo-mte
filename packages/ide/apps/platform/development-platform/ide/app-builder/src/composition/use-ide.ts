import { UseIde } from "./types";
import { GSP } from "./gsp/gsp";

export function useIde(): UseIde {

    function setDesignerStatus(metadataId: string, isDirty: boolean) {
        //   this.emit('set-designer-status', {id: metadataId, isDirty});
    }

    window['gsp'] = window['gsp'] || new GSP();

    return {
        setDesignerStatus,
    };
}