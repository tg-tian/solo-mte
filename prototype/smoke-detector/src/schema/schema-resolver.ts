import { DynamicResolver } from "../../../dynamic-resolver";

export function schemaResolver(resolver: DynamicResolver, schema: Record<string, any>, context: Record<string, any>): Record<string, any> {
    return schema;
}
