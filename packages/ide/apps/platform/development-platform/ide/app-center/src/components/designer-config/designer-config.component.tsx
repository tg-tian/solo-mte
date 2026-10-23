import { computed, defineComponent, inject, nextTick, onMounted, ref } from 'vue';
import { FButton, FDataGrid, FInputGroup, FTabs, FTabPage, F_NOTIFY_SERVICE_TOKEN } from '@farris/ui-vue';
import {
    COMPONENT_BASE_URL,
    DESIGNER_CONFIG_URL,
    RENDERER_DEPLOY_PATH,
    fetchDesignerConfig,
    fetchExistingThirdPartyComponents,
    resolveComponentUrl
} from '../../api/designer-config';
import { mergeThirdPartyComponents, saveDesignerConfig } from '../../services/designer-config-export.service';
import {
    STATIC_PROPERTY_META_URL,
    fetchStaticPropertyMeta
} from '../../services/designer-property-meta.service';
import {
    CustomComponentConfig,
    DesignerConfig,
    PropertyMetaControl,
    createEmptyConfig
} from '../../types/designer-config';
import './designer-config.css';

/** 新增/编辑自定义组件的表单模型 */
interface ComponentFormModel {
    name: string;
    type: string;
    module: string;
    fileName: string;
}

function createEmptyForm(): ComponentFormModel {
    return { name: '', type: '', module: '', fileName: '' };
}

/** 页签 id：属性可见性 / 自定义组件 */
const TAB_PROPERTY = 'property';
const TAB_COMPONENT = 'component';

export default defineComponent({
    name: 'FADesignerConfig',
    props: {},
    emits: [],
    setup() {
        const notifyService = inject(F_NOTIFY_SERVICE_TOKEN) as any;

        /** 当前配置 */
        const config = ref<DesignerConfig>(createEmptyConfig());
        /** 属性清单（由设计器运行时导出） */
        const propertyMeta = ref<PropertyMetaControl[]>([]);
        /** 当前正在编辑属性可见性的控件类型 */
        const activeType = ref('');
        /** 当前页签（对齐页签顺序：默认停在第一个「自定义组件」） */
        const activeTab = ref(TAB_COMPONENT);
        /** 配置文件是否缺失（首次使用） */
        const configMissing = ref(false);
        /** 加载中 */
        const loading = ref(false);
        /** 新增自定义组件的表单 */
        const form = ref<ComponentFormModel>(createEmptyForm());
        /** 登记表单是否展开 */
        const formVisible = ref(false);
        /** 系统盘上现有的第三方组件清单（用于保留既有条目） */
        const existingThirdParty = ref<any[]>([]);
        /** 是否成功读取到现有清单 */
        const existingThirdPartyLoaded = ref(false);
        /** 自定义组件表格实例：FDataGrid 不监听 data 变化，增删改后必须重推数据源 */
        const gridRef = ref<any>();
        /**
         * 表格数据（只读派生，仅作 FDataGrid 的初始值）。
         * 变更一律走 gridRef.updateDataSource()；并且传克隆行——
         * 网格会往行对象里写 __fv_* 内部字段，直接传 config 里的对象会把这些字段带进保存结果。
         */
        const componentRows = computed(() => config.value.customComponents.map((item) => ({ ...item })));

        const controlMap = computed(() => {
            const map = new Map<string, PropertyMetaControl>();
            propertyMeta.value.forEach((control) => map.set(control.type, control));
            return map;
        });

        /**
         * 属性可见性可配置的控件 = 属性清单里的内置控件。
         *
         * 自定义组件本期**不支持**配置属性可见性：它的属性配置由组件包在运行时向设计器注册
         * （`propertyConfigSchemaMapForDesigner`），而属性清单是静态扫描 `@farris/ui-vue` 源码
         * 产出的、只覆盖内置控件，管理页拿不到自定义组件的属性，故不再列出。
         */
        const builtInControls = computed(() => propertyMeta.value);

        const activeControl = computed(() => controlMap.value.get(activeType.value));

        const activeHiddenPaths = computed(() => config.value.hiddenProperties[activeType.value] || []);

        /**
         * 读取现有配置作为初值
         */
        async function loadConfig() {
            loading.value = true;
            try {
                const result = await fetchDesignerConfig();
                if (result) {
                    config.value = {
                        hiddenProperties: result.hiddenProperties || {},
                        customComponents: result.customComponents || []
                    };
                    configMissing.value = false;
                } else {
                    config.value = createEmptyConfig();
                }
            } catch (error: any) {
                // 配置不存在（首次使用）时以空配置初始化
                configMissing.value = true;
                config.value = createEmptyConfig();
            } finally {
                loading.value = false;
            }

            // 配置是异步读到的：FDataGrid 不跟随 data 变化刷新，必须重推一次数据源
            syncComponentGrid();

            // 读取现有的第三方组件清单，保存时据此保留既有条目（如富文本编辑器）
            try {
                existingThirdParty.value = await fetchExistingThirdPartyComponents();
                existingThirdPartyLoaded.value = true;
            } catch (error) {
                existingThirdParty.value = [];
                existingThirdPartyLoaded.value = false;
            }
        }

        /**
         * 读取随应用部署的静态属性清单（control-property-meta.json）。
         * 读不到时清空清单并提示路径，由使用者确认投放后刷新页面重试。
         */
        async function loadStaticPropertyMeta() {
            try {
                const controls = await fetchStaticPropertyMeta();
                propertyMeta.value = controls;
                if (!controlMap.value.get(activeType.value)) {
                    activeType.value = controls[0]?.type || '';
                }
            } catch (error: any) {
                propertyMeta.value = [];
                activeType.value = '';
                notifyService.error({
                    message: `${error?.message || '属性清单读取失败'}，请确认清单已部署到 ${STATIC_PROPERTY_META_URL} 后刷新页面`
                });
            }
        }

        /**
         * 切换某个属性的显示状态
         */
        function onToggleProperty(path: string, visible: boolean) {
            const type = activeType.value;
            if (!type) {
                return;
            }
            const hiddenList = (config.value.hiddenProperties[type] || []).slice();
            const index = hiddenList.indexOf(path);
            if (visible && index >= 0) {
                hiddenList.splice(index, 1);
            } else if (!visible && index < 0) {
                hiddenList.push(path);
            }
            config.value.hiddenProperties = {
                ...config.value.hiddenProperties,
                [type]: hiddenList
            };
        }

        /**
         * 选择要配置属性可见性的控件
         */
        function onSelectControl(type: string) {
            activeType.value = type;
        }

        /**
         * 新增自定义组件
         */
        function onAddComponent() {
            const model = form.value;
            if (!model.name.trim() || !model.type.trim() || !model.module.trim()) {
                notifyService.error({ message: '名称、类型、模块名为必填项' });
                return;
            }
            if (config.value.customComponents.some((item) => item.type === model.type.trim())) {
                notifyService.error({ message: '该控件类型已存在，请更换类型' });
                return;
            }
            const url = resolveComponentUrl(model.fileName || `${model.type.trim()}.system.js`);
            const newItem: CustomComponentConfig = {
                id: model.type.trim(),
                name: model.name.trim(),
                type: model.type.trim(),
                module: model.module.trim(),
                url,
                enabled: true
            };
            config.value.customComponents = [...config.value.customComponents, newItem];
            syncComponentGrid();
            form.value = createEmptyForm();
            formVisible.value = false;
            notifyService.success({ message: '已登记自定义组件，保存后生效' });
        }

        /**
         * 切换自定义组件启用状态
         */
        function onToggleComponent(item: CustomComponentConfig, enabled: boolean) {
            item.enabled = enabled;
            config.value.customComponents = [...config.value.customComponents];
            syncComponentGrid();
        }

        /**
         * 删除自定义组件登记
         */
        function onRemoveComponent(item: CustomComponentConfig) {
            config.value.customComponents = config.value.customComponents.filter((current) => current.type !== item.type);
            if (activeType.value === item.type) {
                activeType.value = '';
            }
            syncComponentGrid();
        }

        /**
         * 切换页签。
         * 「自定义组件」页签里的表格是切到该页签才渲染的（隐藏状态下渲染会按 0 宽度算列宽），
         * 因此切过来时重推一次数据源，保证页签隐藏期间的变更（如异步读到配置、登记项增删）也能同步。
         */
        function onSwitchTab(value: string) {
            activeTab.value = value;
            if (value === TAB_COMPONENT) {
                syncComponentGrid();
            }
        }

        /**
         * 重推表格数据源。
         * FDataGrid 内部维护独立的数据视图，增删改后必须整体重推，不能只改 data 绑定的数组；
         * 放在 nextTick 里确保网格已完成本轮渲染（首次是异步取到配置，直接推容易推早）。
         */
        function syncComponentGrid() {
            const rows = componentRows.value;
            nextTick(() => {
                gridRef.value?.updateDataSource?.(rows);
            });
        }

        /** 自定义组件列表的列定义 */
        const componentColumns = [
            { field: 'name', title: '名称', dataType: 'string', width: 100 },
            { field: 'type', title: '类型', dataType: 'string', width: 100 },
            { field: 'module', title: '模块名', dataType: 'string', width: 100 },
            { field: 'url', title: '组件包', dataType: 'string', width: 150 },
            {
                field: 'enabled',
                title: '启用',
                dataType: 'boolean',
                width: 80,
                align: 'center' as const,
                halign: 'center' as const,
                // 勾选框要能交互，只能自绘单元格（formatter 只出文本）
                columnTemplate: (cell: any, visualDataRow: any) => {
                    const row = visualDataRow?.raw as CustomComponentConfig;
                    return (
                        <input
                            type="checkbox"
                            checked={!!row?.enabled}
                            onChange={(event: Event) =>
                                onToggleEnabled(row?.type, (event.target as HTMLInputElement).checked)
                            }
                        />
                    );
                }
            },
            {
                // 操作列自己声明：表头自定（默认操作列表头走 i18n，本工程未加载语言资源会显示成 Operation），
                // 单元格用 columnTemplate 自绘链接；登记项不支持就地修改，所以只留「删除」。
                field: '__command__',
                title: '操作',
                dataType: 'string',
                width: 80,
                align: 'center' as const,
                halign: 'center' as const,
                columnTemplate: (cell: any, visualDataRow: any) => {
                    const row = visualDataRow?.raw as CustomComponentConfig;
                    return (
                        <span class="btn btn-link" onClick={() => onRemoveByType(row?.type)}>
                            删除
                        </span>
                    );
                }
            }
        ];

        /** 切换某一行是否启用：表格行是克隆对象，按类型回到配置里改 */
        function onToggleEnabled(type: string, enabled: boolean) {
            const item = config.value.customComponents.find((current) => current.type === type);
            if (item) {
                onToggleComponent(item, enabled);
            }
        }

        /** 删除某一行：同样按类型回到配置里找（表格行是克隆对象） */
        function onRemoveByType(type: string) {
            const item = config.value.customComponents.find((current) => current.type === type);
            if (item) {
                onRemoveComponent(item);
            }
        }

        /**
         * 保存：产出配置压缩包（保存动作的单一出口）
         */
        function onSave() {
            saveDesignerConfig(config.value, existingThirdParty.value, existingThirdPartyLoaded.value);

            if (!existingThirdPartyLoaded.value) {
                notifyService.warning({
                    message: `已生成 designer-config.zip，但未能读取现有 third-party-components.json，覆盖前请与系统盘现有文件核对合并；目标目录 ${RENDERER_DEPLOY_PATH}`
                });
                return;
            }

            const mergedCount = mergeThirdPartyComponents(existingThirdParty.value, config.value).length;
            notifyService.success({
                message: `已生成 designer-config.zip（读取到现有清单 ${existingThirdParty.value.length} 条，合并后 ${mergedCount} 条），请解压后覆盖到 ${RENDERER_DEPLOY_PATH}，并刷新设计器页面`
            });
        }

        onMounted(() => {
            // 属性清单直接读随应用部署的静态文件
            loadStaticPropertyMeta();
            loadConfig();
        });

        function renderPropertyChecklist(control: PropertyMetaControl) {
            return (
                <div class="fadc-property-list">
                    {control.categories.map((category) => (
                        <div class="fadc-property-group" key={`${control.type}-${category.id}`}>
                            <div class="fadc-property-group-title">
                                <span>{category.name}</span>
                                <span class="fadc-control-type">{category.properties.length} 项</span>
                            </div>
                            {category.properties.map((property) => {
                                const visible = !activeHiddenPaths.value.includes(property.path);
                                return (
                                    <label
                                        class="fadc-property-item"
                                        key={`${control.type}-${category.id}-${property.path}`}
                                        title={property.path}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={visible}
                                            onChange={(event: Event) => onToggleProperty(property.path, (event.target as HTMLInputElement).checked)}
                                        />
                                        {/* 静态清单里个别属性没有标题（源码未写），退回用属性 id 展示 */}
                                        <span>{property.title || property.id}</span>
                                        <span class="fadc-property-path">{property.path}</span>
                                    </label>
                                );
                            })}
                        </div>
                    ))}
                </div>
            );
        }

        function renderPropertyMetaArea() {
            if (!propertyMeta.value.length) {
                return (
                    <div class="fadc-empty">
                        <div>尚未获取控件属性清单</div>
                        <div class="fadc-empty-tip">
                            请确认 <code>{STATIC_PROPERTY_META_URL}</code> 已随应用部署，然后刷新页面重试
                        </div>
                    </div>
                );
            }

            const active = activeControl.value;

            return (
                <div class="fadc-meta-layout">
                    <div class="fadc-control-list">
                        <div class="fadc-list-title">内置组件（{builtInControls.value.length}）</div>
                        {builtInControls.value.map((control) => (
                            <div
                                class={`fadc-control-item ${activeType.value === control.type ? 'is-active' : ''}`}
                                key={control.type}
                                onClick={() => onSelectControl(control.type)}
                            >
                                <span>{control.name}</span>
                                <span class="fadc-control-type">{control.type}</span>
                            </div>
                        ))}
                    </div>
                    <div class="fadc-property-area">
                        {active ? (
                            <div>
                                <div class="fadc-property-area-title">
                                    <span>
                                        {active.name} <span class="fadc-control-type">{active.type}</span>
                                    </span>
                                </div>
                                {renderPropertyChecklist(active)}
                            </div>
                        ) : (
                            <div class="fadc-empty">
                                <div>该控件不在属性清单中，无法配置属性可见性。</div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        function renderComponentForm() {
            if (!formVisible.value) {
                return null;
            }
            return (
                <div class="fadc-form">
                    <div class="fadc-form-item">
                        <label>名称</label>
                        <div class="fadc-form-field">
                            <FInputGroup
                                modelValue={form.value.name}
                                placeholder="工具箱中显示的名称，如 二维码"
                                onUpdate:modelValue={(value: string) => (form.value.name = value)}
                            ></FInputGroup>
                        </div>
                    </div>
                    <div class="fadc-form-item">
                        <label>类型</label>
                        <div class="fadc-form-field">
                            <FInputGroup
                                modelValue={form.value.type}
                                placeholder="控件类型，属性配置以此为准，如 qr-scanner "
                                onUpdate:modelValue={(value: string) => (form.value.type = value)}
                            ></FInputGroup>
                        </div>
                    </div>
                    <div class="fadc-form-item">
                        <label>模块名</label>
                        <div class="fadc-form-field">
                            <FInputGroup
                                modelValue={form.value.module}
                                placeholder="组件包导出的模块名，如 QrScannerComponent"
                                onUpdate:modelValue={(value: string) => (form.value.module = value)}
                            ></FInputGroup>
                        </div>
                    </div>
                    <div class="fadc-form-item">
                        <label>组件包文件</label>
                        <div class="fadc-form-field">
                            <FInputGroup
                                modelValue={form.value.fileName}
                                placeholder="如 custom-ocr.system.js，留空则按「类型.system.js」生成"
                                onUpdate:modelValue={(value: string) => (form.value.fileName = value)}
                            ></FInputGroup>
                        </div>
                    </div>
                    <div class="fadc-form-actions">
                        {/* FButton 的文案走默认插槽，text 属性不会渲染出来 */}
                        <FButton type="primary" onClick={onAddComponent}>确定</FButton>
                        <FButton
                            type="secondary"
                            onClick={() => {
                                form.value = createEmptyForm();
                                formVisible.value = false;
                            }}
                        >取消</FButton>
                    </div>
                </div>
            );
        }

        /**
         * 已登记的自定义组件列表（Farris 数据表格）。
         * 登记项不支持就地修改，操作列只保留「删除」，换类型请删除后重新登记。
         */
        function renderComponentGrid() {
            return (
                <FDataGrid
                    ref={gridRef}
                    id="fadc-component-grid"
                    data={componentRows.value}
                    columns={componentColumns}
                    columnOption={{ fitColumns: true, fitMode: 'expand' }}
                    rowNumber={{ enable: true, heading: '行号', width: 40 }}
                    height={300}
                ></FDataGrid>
            );
        }

        return () => {
            return (
                <div class="fadc-page">
                    <div class="fadc-header">
                        <div class="fadc-header-main">
                            <div class="fadc-header-title">组件配置</div>
                            <div class="fadc-header-subtitle">
                                配置组件属性在设计器属性面板中的可见性，以及自定义组件的登记与启用；保存后生成配置包投放生效
                            </div>
                        </div>
                        <div class="fadc-header-actions">
                            <button class="btn btn-primary" onClick={onSave}>保存</button>
                        </div>
                    </div>

                    {configMissing.value && (
                        <div class="fadc-alert">
                            未读取到 <code>{DESIGNER_CONFIG_URL}</code>（首次使用时正常），保存后生成
                        </div>
                    )}

                    {!existingThirdPartyLoaded.value && !loading.value && (
                        <div class="fadc-alert">
                            未读取到现有 third-party-components.json，保存结果可能缺少既有条目，覆盖前请人工核对
                        </div>
                    )}

                    {/* 两个区块内容都比较高，拆成页签，避免上面一块把下面顶到屏幕外 */}
                    <div class="fadc-tabs flex-fill">
                        <FTabs
                            activeId={activeTab.value}
                            onUpdate:activeId={(value: string) => onSwitchTab(value)}
                            searchBoxVisible={false}
                            fill={true}
                        >
                            <FTabPage id={TAB_COMPONENT} title="自定义组件" show={true}>
                                <div style="overflow:auto">
                                    <div class="fadc-tab-toolbar">
                                        <span class="fadc-tab-toolbar-tip">
                                            登记项不支持就地修改，改类型请删除后重新登记
                                        </span>
                                        <button
                                            class="btn btn-secondary"
                                            onClick={() => {
                                                form.value = createEmptyForm();
                                                formVisible.value = true;
                                            }}
                                        >
                                            新增自定义组件
                                        </button>
                                    </div>
                                    <div class="fadc-block-desc">
                                        <div>
                                            勾选「启用」后，该组件才会被设计器加载；未启用的只是登记在案，设计器不会加载。
                                        </div>
                                        <div>
                                            组件包需手工拷贝到 <code>{COMPONENT_BASE_URL}</code> 目录下，并打包为 SystemJS
                                            格式（rollup 的 <code>format: 'system'</code>），同时把 <code>vue</code>、
                                            <code>@farris/ui-vue</code> 作为外部依赖（external），否则设计器加载不到，
                                            或出现两份 Vue 实例导致注册表错乱。
                                        </div>
                                    </div>
                                    {renderComponentForm()}
                                    {activeTab.value === TAB_COMPONENT && renderComponentGrid()}
                                </div>

                            </FTabPage>
                            <FTabPage id={TAB_PROPERTY} title="组件属性可见性" show={true}>
                                <div class="fadc-block-desc">
                                    <div>
                                        取消勾选 = 在设计器属性面板中隐藏该属性；改动需点右上角「保存」生成配置包后投放生效。
                                    </div>
                                    <div>自定义组件的属性可见性暂不支持配置。</div>
                                </div>
                                {renderPropertyMetaArea()}
                            </FTabPage>
                        </FTabs>
                    </div>

                    {loading.value && <div class="fadc-loading">加载配置中…</div>}
                </div>
            );
        };
    }
});
