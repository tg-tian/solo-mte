import { ExtractPropTypes } from "vue";

export const createNewModelProps = {
    modelType: { type: String, required: true },
} as const

export type CreateNewModelProps = ExtractPropTypes<typeof createNewModelProps>
