import { type CSSProperties } from 'vue';
import { TreeIndentWidth } from './constants';

interface ColumnsStyle {
    name: CSSProperties;
    type: CSSProperties;
}

export function useColumnsStyle(level = 0, columnsRatio = '4:3'): ColumnsStyle {
    const [nameWidth, typeWidth] = columnsRatio.split(':').map(Number);

    return {
        name: {
            flex: `${nameWidth} ${nameWidth} 0px`,
        },
        type: {
            flex: `${typeWidth} ${typeWidth} ${(level * TreeIndentWidth * typeWidth) / nameWidth}px`,
            minWidth: '80px',
            maxWidth: '135px',
        },
    };
}
