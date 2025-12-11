import { ref, computed } from "vue";
import type { JSX } from "vue/jsx-runtime";
import { useFloatPanelLayout, useFlowMetadata } from '@flow-designer/hooks';
import TrialRunPanel from '@flow-designer/components/toolbar/components/trial-run/trial-run.vue';

interface UseTrialRunPanel {
    openTrialRunPanel: () => void;
    renderTrialRunPanel: () => JSX.Element;
}

let trialRunPanelInstance: UseTrialRunPanel;

export function useTrialRunPanel(): UseTrialRunPanel {
    if (trialRunPanelInstance) {
        return trialRunPanelInstance;
    }

    const PANEL_ID = 'TrialRunPanel';
    const { currentRightFloatPanelId } = useFloatPanelLayout();
    function renderCurrentPanel() {
        currentRightFloatPanelId.value = PANEL_ID;
    }
    const shouldRenderOtherPanel = computed<boolean>(() => {
        return !!currentRightFloatPanelId.value && currentRightFloatPanelId.value !== PANEL_ID;
    });

    const showTrialRunPanel = ref(false);

    function openTrialRunPanel() {
        renderCurrentPanel();
        showTrialRunPanel.value = true;
    }

    function closeTrialRunPanel() {
        showTrialRunPanel.value = false;
    }

    const { flowType } = useFlowMetadata();

    function renderTrialRunPanel() {
        if (!showTrialRunPanel.value || shouldRenderOtherPanel.value) {
            return <></>;
        }
        return (
            <div class={'trial-run-panel'}>
                <TrialRunPanel
                    flowType={flowType.value}
                    onClose={closeTrialRunPanel}
                />
            </div>
        );
    }

    trialRunPanelInstance = {
        openTrialRunPanel,
        renderTrialRunPanel,
    };
    return trialRunPanelInstance;
}
