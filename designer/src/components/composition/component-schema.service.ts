import { SchemaService } from '@farris/ui-vue/components/dynamic-resolver';

export function useComponentSchemaService(): SchemaService {

    const componentSchemaMap = new Map<string, Record<string, any>>();
    const componentParentMap = new Map<string, string>();

    function closest(componentId: string, componentType: string): Record<string, any> | null {
        const currentComponent = componentSchemaMap.get(componentId);
        if (currentComponent) {
            const parentId = componentParentMap.get(currentComponent.id) as string;
            const parentComponent = componentSchemaMap.get(parentId);
            if (parentComponent && parentComponent.type === componentType) {
                return parentComponent;
            }
            return closest(parentId, componentType);
        }
        return null;
    }

    function load(componentSchema: Record<string, any>) {
        if (componentSchema && componentSchema.id) {
            componentSchemaMap.set(componentSchema.id, componentSchema);
        }
        if (componentSchema && componentSchema.contents && componentSchema.contents.length) {
            (componentSchema.contents as Record<string, any>[]).forEach((childComponentSchema: Record<string, any>) => {
                load(childComponentSchema);
                componentParentMap.set(childComponentSchema.id, componentSchema.id);
            });
        }
    }

    function getSchemaById(string: any): Record<string, any> {
        return {};
    }

    function select(root: Record<string, any>, predicate: (child: Record<string, any>) => boolean): Record<string, any> {
        return {};
    }

    return { closest, getSchemaById, load, select };

}
