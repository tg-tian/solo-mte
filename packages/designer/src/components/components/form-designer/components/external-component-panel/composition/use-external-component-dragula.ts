import dragula from '@farris/designer-dragula';
import { dragResolveService } from './drag-resolve';
import { UseExternalComponent } from './types';
import { DesignerHTMLElement } from "@farris/ui-vue";

export function useExternalComponentDragula(externalComponentComposition: UseExternalComponent) {

    let dragulaInstance: any;

    /** 拖拽所需的服务 */
    const dragResolveUtil = dragResolveService(externalComponentComposition);

    const COMPONENT_CONTAINER_CLASS = "f-external-component-container";
    const TEMPLATE_BOX_CLASS = "f-external-component-template-box-container";

    /**
     * 初始化拖拽
     */
    function initDragula(containerElement: DesignerHTMLElement) {
        if (dragulaInstance) {
            dragulaInstance.destroy();
        }
        if (!dragula || !containerElement) {
            return;
        }

        dragulaInstance = dragula([containerElement], {
            direction: 'horizontal',
            revertOnSpill: true,
            moves(element: DesignerHTMLElement): boolean {
                return !element.classList.contains('no-drag');
            },
            getMirrorText(element: DesignerHTMLElement): string {
                return element.innerText;
            },
            accepts(element: HTMLElement, target: DesignerHTMLElement, source: HTMLElement, sibling: DesignerHTMLElement): boolean {
                const canAccept = target.className.includes(COMPONENT_CONTAINER_CLASS);
                return canAccept;
            }
        }).on('over', (element: DesignerHTMLElement, container: DesignerHTMLElement) => {
            if (container.className.includes(COMPONENT_CONTAINER_CLASS)) {
                container.className += ' f-external-component-drag-over';
            }
        }).on('out', (el: DesignerHTMLElement, container: DesignerHTMLElement) => {
            container.className = container.className.replace('f-external-component-drag-over', '').replace('  ', '');
        }).on('drop', (element: DesignerHTMLElement, target: DesignerHTMLElement, source: DesignerHTMLElement, sibling: DesignerHTMLElement
        ) => dragResolveUtil.onDrop(element, target, source, sibling));

    }

    /**
     * 把右侧模板添加到可拖拽容器中
     * @returns 
     */
    function attachToDragulaContainer() {
        if (!dragulaInstance) {
            return;
        }
        const templateBoxs = document.getElementsByClassName(TEMPLATE_BOX_CLASS);
        const formContainer = document.getElementsByClassName(COMPONENT_CONTAINER_CLASS);
        dragulaInstance.containers = [...templateBoxs, ...formContainer];
    }

    return {
        initDragula,
        attachToDragulaContainer
    };
}
