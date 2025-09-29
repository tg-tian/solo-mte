import { DesignerMode, UseDesignerContext } from "../../types/designer-context";
import { useLocation } from "../use-location";
import { useMobileDesignerContext } from "./use-mobile-designer-context";
import { usePCDesignerContext } from "./use-pc-designer-context";
import { usePCRtcDesignerContext } from "./use-pc-rtc-designer-context";

/**
 * 设计器上下文
 * @returns 
 */
export function useDesignerContext(): UseDesignerContext {
    /**
     * 判断的当前设计器运行环境
     */
    function getDesignerMode(): DesignerMode {
        const { getHrefParam, getUrlParam } = useLocation();
        const metadataPath = getUrlParam('id') || '';
        const designerEnvType = getHrefParam('envType');

        if (designerEnvType === 'runtimeCustom') {
            return DesignerMode.PC_RTC;
        }
        if (metadataPath && metadataPath.includes('.mfrm')) {
            return DesignerMode.Mobile;
        }

        return DesignerMode.PC;
    }

    const designerMode = getDesignerMode();

    switch (designerMode) {
        case DesignerMode.PC: case DesignerMode.Mobile: {
            return usePCDesignerContext();
        }
        //  {
        //     return useMobileDesignerContext();
        // }
        case DesignerMode.PC_RTC: {
            return usePCRtcDesignerContext();
        }
    }
}
