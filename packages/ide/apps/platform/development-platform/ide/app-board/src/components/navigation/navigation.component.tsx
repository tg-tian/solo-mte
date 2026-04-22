import { computed, defineComponent, nextTick, onMounted, ref, watch } from 'vue';
import { FListView } from '@farris/ui-vue';
import { navigationProps, type NavigationProps, type MenuGroup } from './navigation.props';

export default defineComponent({
  name: 'WorkbenchNavigation',
  props: navigationProps,
  emits: ['activeWorkArea'],
  setup(props: NavigationProps, context) {
    const navigationPanelRef = ref<HTMLElement | null>(null);
    const navigationPanelContainerRef = ref<HTMLElement | null>(null);
    const navigationPanelInstanceRef = ref<InstanceType<typeof FListView> | null>(null);
    const topOfPostion = 0;
    const offsetY = ref(0);

    function onClickMenuGroup(_payload: MouseEvent, item: MenuGroup) {
      navigationPanelInstanceRef.value?.activeRowById(item.id);
      context.emit('activeWorkArea', item.id);
    }

    const navigationMenuStyle = computed(() => ({
      'z-index': '0',
      transition: 'width.3s',
      'box-shadow': 'none',
      transform: `translateY(${offsetY.value}px)`,
    }));

    function onWheel(payload: WheelEvent) {
      payload.preventDefault();
      payload.stopPropagation();

      const deltaY = ((payload as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY || payload.deltaY) / 10;
      let offsetYValue = offsetY.value + deltaY;
      const container = navigationPanelContainerRef.value;
      const panel = navigationPanelRef.value;
      if (!container || !panel) return;
      const containerHeight = container.getBoundingClientRect().height;
      const navigationPanelHeight = panel.getBoundingClientRect().height;
      if (offsetYValue < containerHeight - navigationPanelHeight) {
        offsetYValue = containerHeight - navigationPanelHeight;
      }
      if (offsetYValue > topOfPostion) {
        offsetYValue = topOfPostion;
      }
      offsetY.value = offsetYValue;
    }

    onMounted(() => {
      if (navigationPanelRef.value) {
        navigationPanelContainerRef.value = navigationPanelRef.value.closest('.f-app-builder-navigation');
      }
    });

    watch(
      () => props.menuData,
      (data) => {
        nextTick(() => {
          navigationPanelInstanceRef.value?.updateDataSource(data ?? []);
          const first = data?.[0];
          if (first) {
            navigationPanelInstanceRef.value?.activeRowById(first.id);
            context.emit('activeWorkArea', first.id);
          }
        });
      },
      { deep: true, immediate: true }
    );

    function renderMenuGroup({ item }: { item: MenuGroup; index: number }) {
      return (
        <div onClick={(payload: MouseEvent) => onClickMenuGroup(payload, item)}>
          <svg class="top-right-corner" width="10" height="10" xmlns="http://www.w3.org/2000/svg">
            <path d="M 0,10 A 10,10 0 0 0 10,0 L 10,10 L 0,10 Z" fill="white" />
          </svg>
          <span class="f-app-builder-menu-group-icon" title={item.name}>
            <img title={item.name} src={item.icon} alt="" />
          </span>
          <svg class="bottom-right-corner" width="10" height="10" xmlns="http://www.w3.org/2000/svg">
            <path d="M 0,0 A 10,10 0 0 1 10,10 L 10,0 L 0,0 Z" fill="white" />
          </svg>
        </div>
      );
    }

    return () => (
      <div class="f-app-builder-navigation-content">
        <div class="f-app-builder-navigation-logo">
          <span class="f-app-builder-navigation-title" title={props.title}>
            {props.title}
          </span>
        </div>
        <div
          ref={navigationPanelRef}
          class="f-page-content-nav f-app-builder-menu-groups"
          style={navigationMenuStyle.value}
          onWheel={onWheel}
        >
          <FListView
            ref={navigationPanelInstanceRef}
            data={props.menuData}
            customClass="f-app-builder-menu"
            itemClass="f-app-builder-menu-item"
          >
            {{ content: renderMenuGroup }}
          </FListView>
        </div>
      </div>
    );
  },
});
