import { UseIde, UseWorkspace } from "./types";
import { GSP } from "./gsp/gsp";

export function useIde(useWorkspaceComposition: UseWorkspace): UseIde {

    window['gsp'] = window['gsp'] || new GSP();
    window['gsp']['workspace'] = window['gsp']['workspace'] || useWorkspaceComposition;
    window['gspframeworkService'] = window['gspframeworkService'] || {};
    window['gspframeworkService']['rtf'] = window['gspframeworkService']['rtf'] || {};
    window['gspframeworkService']['rtf']['language'] = window['gspframeworkService']['rtf']['language'] || {
        getLanguageCode: () => 'zh-CHS'
    };
    window['gspframeworkService']['rtf']['func'] = window['gspframeworkService']['rtf']['func'] || {
        openMenu: (options: { funcId: string }) => {
            console.log('openMenu', options);
        }
    };
    window['gspframeworkService']['rtf']['toolbarEvent'] = window['gspframeworkService']['rtf']['toolbarEvent'] || {
        barMenuClickListenr: (callback: (event: MessageEvent) => void) => {
            console.log('barMenuClickListenr', callback);
        }
    };

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