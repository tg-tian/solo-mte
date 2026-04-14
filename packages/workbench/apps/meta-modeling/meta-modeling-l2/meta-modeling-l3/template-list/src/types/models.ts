export interface PropertyDefinition {
    type: "string" | "number" | "boolean" | "enum" | "object" | "array";
    unit?: string;
    readOnly?: boolean;
    min?: number;
    max?: number;
    enumValues?: string[];
    description?: string;
}

export interface Template {
    id?: number;
    template_id?: number;
    name: string;
    description: string;
    category: string;
    tags: string;
    domain: string;
    image_url: string;
    describing_the_model: string;
    url: string;
}
