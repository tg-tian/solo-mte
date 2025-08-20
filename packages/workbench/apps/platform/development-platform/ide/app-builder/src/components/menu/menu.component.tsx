import { defineComponent } from "vue";
import { menuProps, MenuProps } from "./menu.props";

export default defineComponent({
    name: 'FAppMenu',
    props: menuProps,
    emits: [],
    setup(props: MenuProps, context) {

        return () => {
            return (
                <div class="f-page f-page-card f-page-is-mainsubcard">
                    <div class="f-admin-main-header"></div>
                    <div class="f-admin-main-content">
                       <h1>App Menu</h1>
                    </div>
                </div>
            );
        };
    }
});
