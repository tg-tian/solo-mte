import { defineComponent, ref, computed, onMounted, onUnmounted, watch, Teleport, SetupContext } from 'vue';
import type { PropType } from 'vue';
import { WelcomePromptItem, welcomePromptsProps, WelcomePromptsProps } from './welcome-prompts.props';

export default defineComponent({
    name: 'WelcomePrompts',
    props: {
        ...welcomePromptsProps,
        /** 输入框元素ref */
        inputRef: { type: Object as PropType<HTMLElement | null>, default: null },
    },
    emits: ['select'],
    setup(props: WelcomePromptsProps & { inputRef?: HTMLElement | null }, context: SetupContext) {
        const prompts = ref<WelcomePromptItem[]>([]);
        const selectedCategory = ref<string>('全部');
        const listRef = ref<HTMLElement>();
        const panelRef = ref<HTMLElement | null>(null);
        // 提示集panel高度：提示集不超过4个时104px，超出4个时220px
        const panelHeight = ref<string>('220px');

        const GAP_ABOVE_INPUT_PX = 12;
        const panelPlacement = ref<{ left: string; width: string; top: string } | null>(null);

        const shouldShowPrompts = computed(() => props.visible && categories.value?.length > 0);

        // 初始化面板位置（用于首次渲染，面板渲染后会被 watch(panelRef) 校正）
        function initPanelPlacement() {
            const inputEl = props.inputRef;
            if (!inputEl) return;
            const r = inputEl.getBoundingClientRect();
            panelPlacement.value = {
                left: `${r.left}px`,
                width: `${r.width}px`,
                top: `${r.top - 220 - GAP_ABOVE_INPUT_PX}px`, // 预估高度 220，后续会校正
            };
        }

        // 获取所有分类
        const categories = computed(() => {
            const cats = new Set<string>();
            if (!prompts.value || prompts.value.length === 0) {
                return [];
            }
            prompts.value.forEach(p => cats.add(p.category));
            return ['全部', ...Array.from(cats)];
        });

        // 根据选中分类过滤数据
        const filteredPrompts = computed(() => {
            if (selectedCategory.value === '全部') {
                return prompts.value;
            }
            return prompts.value.filter(p => p.category === selectedCategory.value);
        });

        // 计算面板位置（使用实际 panelRef 高度）
        function syncPanelPlacement() {
            if (!shouldShowPrompts.value) return;
            const inputEl = props.inputRef;
            const panelEl = panelRef.value;
            if (!inputEl || !panelEl) return;
            const r = inputEl.getBoundingClientRect();
            const actualPanelHeight = panelEl.getBoundingClientRect().height;
            panelPlacement.value = {
                left: `${r.left}px`,
                width: `${r.width}px`,
                top: `${r.top - actualPanelHeight - GAP_ABOVE_INPUT_PX}px`,
            };
        }

        // 点击外部关闭
        function onDocMouseDown(ev: MouseEvent) {
            const panel = panelRef.value;
            if (!shouldShowPrompts.value) return;
            const t = ev.target as Node | null;
            if (!t) return;
            // 不关闭如果点击在输入框内
            if (props.inputRef?.contains(t)) return;
            if (panel && panel.contains(t)) return;
        }

        function bindGlobalListeners() {
            window.addEventListener("resize", syncPanelPlacement);
            window.addEventListener("scroll", syncPanelPlacement, true);
        }

        function unbindGlobalListeners() {
            window.removeEventListener("resize", syncPanelPlacement);
            window.removeEventListener("scroll", syncPanelPlacement, true);
        }

        // Watch panelRef，当面板渲染完成后再计算位置
        watch(panelRef, (el) => {
            if (el && shouldShowPrompts.value) {
                syncPanelPlacement();
                bindGlobalListeners();
            }
        });

        // Watch visible 变化
        watch(() => props.visible, (v) => {
            if (v) {
                // 先用预估高度初始化位置，让面板先渲染出来
                initPanelPlacement();
            } else {
                unbindGlobalListeners();
                panelPlacement.value = null;
            }
        });

        onUnmounted(() => {
            unbindGlobalListeners();
        });

        // 加载数据
        const loadPrompts = async () => {
            try {
                const res = await fetch('/data/demo-welcome-prompts.json');
                prompts.value = await res.json();
                if (prompts.value?.length < 5) {
                    panelHeight.value = '104px';
                }
            } catch (error) {
                console.error('Failed to load prompts:', error);
            }
        };

        // 点击标签
        const handleCategoryClick = (category: string) => {
            selectedCategory.value = category;
        };

        // 点击数据块
        const handleItemClick = (item: WelcomePromptItem) => {
            context.emit('select', item);
        };

        onMounted(() => {
            loadPrompts();
        });

        return () => {
            if (!shouldShowPrompts.value || !panelPlacement.value) return null;

            return (
                <Teleport to="body">
                    <div
                        ref={panelRef}
                        class="f-chat-welcome-prompts"
                        onMousedown={(e) => e.preventDefault()}
                        style={{
                            position: "fixed",
                            left: panelPlacement.value.left,
                            top: panelPlacement.value.top,
                            width: panelPlacement.value.width,
                            zIndex: 3000,
                        }}
                    >
                        <div class="f-chat-welcome-prompts-header">
                            {categories.value.map((category, idx) => (
                                <span key={idx}
                                    class={['f-chat-welcome-prompts-tab', { active: selectedCategory.value === category }]}
                                    onClick={() => handleCategoryClick(category)}
                                >
                                    {category}
                                </span>
                            ))}
                        </div>
                        <div
                            ref={listRef}
                            class="f-chat-welcome-prompts-list"
                            style={{ height: panelHeight.value }}
                        >
                            {filteredPrompts.value.map((item, index) => (
                                <div
                                    key={index}
                                    class="f-chat-welcome-prompts-item"
                                    onClick={() => handleItemClick(item)}
                                >
                                    <div class="f-chat-welcome-prompts-item-icon">
                                        <img src={item.icon} alt={item.title} />
                                    </div>
                                    <div class="f-chat-welcome-prompts-item-title">{item.title}</div>
                                    <div class="f-chat-welcome-prompts-item-subtitle">{item.subtitle}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Teleport>
            );
        };
    }
});
