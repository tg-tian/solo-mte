import { computed, defineComponent, ref, CSSProperties } from 'vue';
import { ExternalComponentPanelProps, externalComponentPanelProps } from './external-component-panel.props';
import getExternalComponentTemplateRender from './components/external-component-template/external-component-template.component';
import getExternalComponentContainerRender from './components/external-component/external-component-container.component';
import './external-component-panel.scss';
import useExternalComponent from './composition/use-external-component';

export default defineComponent({
    name: 'FExternalComponentPanel',
    props: externalComponentPanelProps,
    emits: ['selectionChange'] as (string[] & ThisType<void>) | undefined,
    setup(props: ExternalComponentPanelProps, context) {
        const showExternalComponent = ref(false);

        const MIN_WIDTH = 200;
        const BUTTON_HEIGHT = 30;

        const externalComponentComposition = useExternalComponent(context);
        const externalComponents = externalComponentComposition.getComponents();

        /** 渲染外部组件的容器 */
        const renderExternalComponentContainer = getExternalComponentContainerRender(externalComponentComposition);
        /** 渲染外部组件的模板 */
        const renderExternalComponentTemplate = getExternalComponentTemplateRender();

        /**
         * 点击顶部按钮
         */
        function onClickTopBar() {
            showExternalComponent.value = !showExternalComponent.value;
        }

        /**
         * 隐藏外部组件面板
         */
        function onHideExternalComponent() {
            showExternalComponent.value = false;
        }

        const panelStyle = computed<CSSProperties>(() => ({
            width: `${Math.max(MIN_WIDTH, props.width)}px`,
        }));
        const panelTrackStyle = computed<CSSProperties>(() => ({
            maxHeight: `${Math.max(0, props.maxHeight - BUTTON_HEIGHT)}px`,
        }));

        function clearSelection(): void {
            externalComponentComposition.clearExternalComponentSelection();
        }

        context.expose({ clearSelection });

        /**
         * 渲染收起面板按钮
         */
        function renderShowedTopBar() {
            return (
                <div onClick={onHideExternalComponent} class="f-external-component-panel-top-bar-container">
                    <span onClick={onClickTopBar} class="f-icon mr-2 f-legend-show"></span>
                    <svg onClick={onClickTopBar} width="110" height="30" viewBox="0 0 110 30">
                        <path pointer-events="visibleFill"
                            d="M10,5 Q5,5 5,10 L0,30 L110,30 L105,10 Q105,5 100,5 Z"
                            fill="rgb(248, 250, 252)" />
                        <text x="60" y="20" dominant-baseline="middle" text-anchor="middle" fill="#3F4559" font-size="13">
                            收起面板
                        </text>
                    </svg>
                </div>
            );
        }

        /**
         * 渲染隐藏区域按钮
         */
        function renderCollapsedTopBar() {
            return (
                <div class="f-external-component-panel-top-bar-container">
                    <span onClick={onClickTopBar} class="f-icon mr-2 f-legend-collapse">
                    </span>
                    <svg onClick={onClickTopBar} width="110" height="30" viewBox="0 0 110 30">
                        <path pointer-events="visibleFill"
                            d="M10,5 Q5,5 5,10 L0,30 L110,30 L105,10 Q105,5 100,5 Z"
                            fill="#F0F2F8" stroke="#ffffff" stroke-width="2" />
                        <text x="51" y="20" dominant-baseline="middle" text-anchor="middle" fill="#3F4559" font-size="13">
                            隐藏区域
                        </text>
                        <circle cx="92" cy="18" r={8} fill="#A5ADC7" />
                        <text x="92" y="19" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-size="13">
                            {externalComponents.value.length}
                        </text>
                    </svg>
                </div>
            );
        }

        return () => {
            return (
                <>
                    <div hidden={!showExternalComponent.value} class="f-external-component-panel-mask" onClick={onHideExternalComponent}></div>
                    <div style={panelStyle.value} class="f-external-component-panel-container">
                        {showExternalComponent.value ? renderShowedTopBar() : renderCollapsedTopBar()}
                        <div class="f-external-component-panel-track" style={panelTrackStyle.value}>
                            <div class="f-external-component-panel-main-content" hidden={!showExternalComponent.value}>
                                {renderExternalComponentContainer()}
                                {renderExternalComponentTemplate()}
                            </div>
                        </div>
                    </div>
                </>
            );
        };
    }

});
