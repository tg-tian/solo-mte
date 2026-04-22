import { defineComponent, ref, computed } from "vue";
import { navPanelProps } from "./nav-panel.props";
import robotAvatarUrl from "@/assets/icon/robot-avatar-mini.png?url";
import collapseIconUrl from "@/assets/icon/icon_nav_collapsed@2x.png?url";
import applyNavIconUrl from "@/assets/icon/apply.svg?url";
import workbenchNavIconUrl from "@/assets/icon/workbench.png?url";
export default defineComponent({
    name: "NavPanel",
    props: navPanelProps,
    emits: ["openAgentHub", "agentDblclick", "collapse", "expand", "search", "navigate", "closePersonalCenter"],
    setup(props, { emit }) {
        const selectedActionIndex = ref<number | string | null>(props.primaryActionId ?? null);
        // Use activeNavId prop if provided, otherwise use internal state
        const effectiveActiveId = computed(() => {
            // Force re-evaluation when navActions are updated
            void navActionsUpdateTrigger.value;
            // personal-center 的激活状态不影响 navActions 的选中高亮
            return props.activeNavId ?? selectedActionIndex.value;
        });
        const searchValue = ref("");
        const navActionsUpdateTrigger = ref(0);

        function handleActionClick(action: { id: number | string; fixed?: boolean; onClick?: () => void }) {
            // 先关闭浮层，确保点击事件不会被拦截
            selectedActionIndex.value = action.id;
            action.onClick?.();
        }



        function handleSearchInput(e: Event) {
            const value = (e.target as HTMLInputElement).value;
            searchValue.value = value;
            emit("search", value);
        }

        function renderNavHeader() {
            return (
                <div class="f-chat-nav-header">
                    <div class="f-chat-nav-header-left">
                        <div class="f-chat-nav-header-icon">
                            <img src="./assets/icon/robot-avatar-mini.png" alt="chat-nav-header-icon" />
                        </div>
                        <div class="f-chat-nav-header-title">{props.navTitle}</div>
                    </div>
                    {renderCollapseControl()}
                </div>
            );
        }

        function renderCollapseControl() {
            if (!props.showCollapse) return null;
            return (
                <div class="f-chat-nav-bottom-collapse">
                    <div
                        class="f-chat-nav-header-collapse"
                        onClick={() => emit(props.collapsed ? "expand" : "collapse")}
                        title={props.collapsed ? "展开" : "收起"}
                        aria-label={props.collapsed ? "展开" : "收起"}
                    >
                        <img src="./assets/icon/icon_nav_collapsed@2x.png" alt="" class={props.collapsed ? "is-collapsed" : ""} />
                    </div>
                </div>
            );
        }

        function renderSearchBox() {
            return (
                <div class="f-chat-nav-search">
                    <i class="f-icon f-icon-search"></i>
                    <input
                        type="text"
                        value={searchValue.value}
                        placeholder={props.searchPlaceholder}
                        onInput={handleSearchInput}
                    />
                </div>
            );
        }

        function renderNavActions() {
            return (
                <div class="f-chat-nav-actions">
                    {props.navActions.map((action) => {
                        const isPrimary = effectiveActiveId.value === action.id || action.fixed;
                        return (
                            <div
                                key={action.id}
                                class={[
                                    "f-chat-nav-action-item",
                                    { active: effectiveActiveId.value === action.id, primary: isPrimary },
                                ]}
                                onClick={() => handleActionClick(action)}
                            >
                                {action.id === 'dash-board' ? (
                                    <img class="f-chat-nav-action-custom-icon" src="./assets/icon/workbench.png" alt="" />
                                ) : action.id === 'function-board' ? (
                                    <img class="f-chat-nav-action-custom-icon" src="./assets/icon/apply.svg"alt="" />
                                ) : action.icon ? (
                                    <i class={action.icon}></i>
                                ) : null}
                                <span>{action.label}</span>
                            </div>
                        );
                    })}
                </div>
            );
        }

        return () => (
            <div class={["f-chat-nav", { collapsed: props.collapsed }]}>
                {renderNavHeader()}
                {renderSearchBox()}
                {renderNavActions()}
            </div>
        );
    },
});
