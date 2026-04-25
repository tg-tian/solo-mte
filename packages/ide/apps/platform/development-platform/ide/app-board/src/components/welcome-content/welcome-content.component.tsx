import { defineComponent, ref, computed, watch } from "vue";
import { welcomeContentProps } from "./welcome-content.props";

export default defineComponent({
    name: "WelcomeContent",
    props: welcomeContentProps,
    emits: ["sendMessage", "openConversation"],
    setup(props, { emit, expose, slots }) {

        return () => (
            <div class="f-chat-content empty">
                <div class="f-chat-content-empty">
                    <div class="f-chat-content-empty-center">
                        <div class="f-chat-content-header">
                            <div class="f-chat-content-header-title">
                                <span class="f-chat-content-header-title-text">{props.chatTitle}</span>
                            </div>
                            {props.chatSubtitle && (
                                <div class="f-chat-content-header-subtitle">
                                    <span class="f-chat-content-header-subtitle-text">{props.chatSubtitle}</span>
                                </div>
                            )}
                        </div>
                        <div class="f-chat-content-empty-footer">
                            {slots.aboveInput?.()}
                        </div>
                    </div>
                </div>
            </div>
        );
    },
});
