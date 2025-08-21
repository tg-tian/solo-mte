import { defineComponent } from "vue";
import { VariablesProps, variablesProps } from "./variables.props";

export default defineComponent({
    name: 'FAppVaribles',
    props: variablesProps,
    emits: [],
    setup(props: VariablesProps, context) {

        return () => {
            return (
                <div class="f-page f-page-card f-page-is-mainsubcard">
                    <div class="f-admin-main-header"></div>
                    <div class="f-admin-main-content">
                       <h1>App Variables</h1>
                    </div>
                </div>
            );
        };
    }
});
