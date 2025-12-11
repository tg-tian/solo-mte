import { ref, provide, computed, inject, onMounted, onUnmounted, watch, type InjectionKey } from 'vue';
import type { NodePortType } from '@farris/flow-devkit/types';

/** 连接点信息 */
type PortInfo = {
    id: string;
    type: NodePortType;
    [key: string]: any;
};

/** 连接点注册器 */
type PortRegistry = {
    registerPort: (port: PortInfo) => void;
    unregisterPort: (id: string) => void;
    updatePortInfo: (oldId: string, newPortInfo: PortInfo) => void;
};

const PORT_REGISTRY_KEY: InjectionKey<PortRegistry> = Symbol('portRegistry');

export function usePortRegistry() {
    const ports = ref<PortInfo[]>([]);

    const registerPort = (port: PortInfo) => {
        if (!port || !port.id || !port.type) {
            return;
        }
        if (!ports.value.some(p => p.id === port.id)) {
            ports.value.push(port);
        }
    };

    const unregisterPort = (id: string) => {
        ports.value = ports.value.filter(p => p.id !== id);
    };

    const updatePortInfo = (oldId: string, newPortInfo: PortInfo) => {
        const index = ports.value.findIndex(p => p.id === oldId);
        if (index >= 0) {
            unregisterPort(oldId);
            registerPort(newPortInfo);
        }
    };

    provide(PORT_REGISTRY_KEY, { registerPort, unregisterPort, updatePortInfo });

    const inputPorts = computed(() => {
        return ports.value.filter(p => p.type === 'target').map(p => p.id);
    });
    const outputPorts = computed(() => {
        return ports.value.filter(p => p.type === 'source').map(p => p.id);
    });

    return {
        inputPorts,
        outputPorts,
        ports,
    };
}

export function usePort(port: PortInfo) {
    const registry = inject(PORT_REGISTRY_KEY);

    if (!registry) {
        throw new Error('Cannot find port registry');
    }

    onMounted(() => {
        const portInfo: PortInfo = {
            id: port.id,
            type: port.type,
        };
        registry.registerPort(portInfo);
    });

    onUnmounted(() => {
        registry.unregisterPort(port.id);
    });

    watch([
        () => port.id,
        () => port.type,
    ], (newValue, oldValue) => {
        const oldId = oldValue[0];
        const newPortInfo: PortInfo = {
            id: newValue[0],
            type: newValue[1],
        };
        registry.updatePortInfo(oldId, newPortInfo);
    });

    return registry;
}
