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
    template_id?: number;
    name: string;
    template_index?: string;
    template_description?: string;
    example_image_url?: string;
    code_url?: string;
    repository_url?: string;
    file_source?: string;
    submitter?: string;
    license?: string;
    tags?: Record<string, string[]> | string;
    created_at?: string;
    updated_at?: string;
}