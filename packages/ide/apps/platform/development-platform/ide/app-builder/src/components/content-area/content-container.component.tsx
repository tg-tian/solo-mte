import { defineComponent } from "vue";
import { contentContainerProps, ContentContainerProps } from "./content-container.props";

export default defineComponent({
    name: 'FAContentContainer',
    props: contentContainerProps,
    emits: [],
    setup(props: ContentContainerProps) {

        return () => {
            return <iframe title={props.id} src={props.url}></iframe>;
        };
    }
});
