import { ExtractPropTypes } from "vue";
import { Command } from "../../entity/command";

export const methodListProps = {
    commandsData: { type: Array<Command> },
    activeViewModel: { type: Object }
} as Record<string, any>;

export type MethodListProps = ExtractPropTypes<typeof methodListProps>;
