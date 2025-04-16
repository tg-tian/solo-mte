import { defineComponent } from "vue";

export default defineComponent({
    name: 'FAWelcome',
    props: {},
    emits: [],
    setup() {

        return () => {
            return <div>
                <div class="fa-welcome-banner"></div>
                <div class="fa-recent-apps"></div>
                <div class="fa-news"></div>
            </div>;
        };
    }
});
