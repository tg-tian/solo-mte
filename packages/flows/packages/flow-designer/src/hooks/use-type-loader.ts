import { useTypeDetails } from '@farris/flow-devkit';
import type { FlowMetadata, TypeRefer } from '@farris/flow-devkit';

export function useTypeLoader() {

    const {
        isTypeRefer,
        loadType,
    } = useTypeDetails();

    function collectAllTypeRefers(data: Record<string, any>, collection: TypeRefer[]): void {
        const processed = new Set<object>();
        function recurse(value: any) {
            if (value === null || typeof value !== 'object') {
                return;
            }
            if (processed.has(value)) {
                return;
            }
            processed.add(value);
            if (Array.isArray(value)) {
                value.forEach(recurse);
                return;
            }
            if (isTypeRefer(value)) {
                collection.push(value);
            } else {
                Object.values(value).forEach(recurse);
            }
        }
        recurse(data);
    }

    async function loadAllTypes(metadata: FlowMetadata): Promise<void> {
        const nodes = metadata.nodes || [];
        const typeRefers: TypeRefer[] = [];
        nodes.forEach((node) => {
            collectAllTypeRefers(node, typeRefers);
        });
        await loadType(typeRefers);
    }

    return { loadAllTypes };
}
