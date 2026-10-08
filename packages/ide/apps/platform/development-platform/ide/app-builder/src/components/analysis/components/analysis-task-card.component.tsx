import { defineComponent, ref, computed, onMounted } from "vue";
import { FButton } from "@farris/ui-vue";
import { analysisTaskCardProps, AnalysisTaskCardProps } from "./analysis-task-card.props";
import { createTask, AnalysisOptions, getQualityConfig, type QualityChecksConfig } from "../service";

export default defineComponent({
    name: 'FAppAnalysisTaskCard',
    props: analysisTaskCardProps,
    emits: ['change'],
    setup(props: AnalysisTaskCardProps, context) {
        const currentStep = ref<number>(1);
        const loading = ref<boolean>(false);
        const error = ref<string>('');

        // 表单数据 - 默认使用传入的任务名称
        const taskName = ref<string>(props.defaultTaskName || '');
        const javaVersion = ref<string>('17');
        const selectedFile = ref<File | null>(null);
        const filePath = ref<string>('');

        // 分析选项
        const baseFrameworkEnabled = ref<boolean>(true);
        const dependencyInjectionEnabled = ref<boolean>(true);
        const webEndpointsEnabled = ref<boolean>(true);
        const persistenceFrameworkEnabled = ref<boolean>(false);

        const defaultOptions = ref<QualityChecksConfig>({
            baseFramework: true,
            dependencyInjection: true,
            webEndpoints: true,
            persistenceFramework: false,
        });

        const isQualityModified = computed(() => {
            return (
                baseFrameworkEnabled.value !== defaultOptions.value.baseFramework ||
                dependencyInjectionEnabled.value !== defaultOptions.value.dependencyInjection ||
                webEndpointsEnabled.value !== defaultOptions.value.webEndpoints ||
                persistenceFrameworkEnabled.value !== defaultOptions.value.persistenceFramework
            );
        });

        function onRestoreDefaults() {
            baseFrameworkEnabled.value = defaultOptions.value.baseFramework;
            dependencyInjectionEnabled.value = defaultOptions.value.dependencyInjection;
            webEndpointsEnabled.value = defaultOptions.value.webEndpoints;
            persistenceFrameworkEnabled.value = defaultOptions.value.persistenceFramework;
        }

        onMounted(async () => {
            try {
                const res = await getQualityConfig();
                if (res?.config) {
                    defaultOptions.value = { ...res.config };
                    baseFrameworkEnabled.value = res.config.baseFramework;
                    dependencyInjectionEnabled.value = res.config.dependencyInjection;
                    webEndpointsEnabled.value = res.config.webEndpoints;
                    persistenceFrameworkEnabled.value = res.config.persistenceFramework;
                }
            } catch (e) {
                console.warn('加载质量检查默认值失败，使用代码默认值', e);
            }
        });

        // 步骤信息
        const steps = computed(() => [
            { id: '1', title: '配置选项', description: currentStep.value >= 1 ? '进行中' : '待完成' },
            { id: '2', title: '上传项目', description: currentStep.value >= 2 ? '进行中' : '待完成' },
        ]);

        // 验证步骤1
        const canProceedToStep2 = computed(() => {
            return taskName.value.trim() !== '';
        });

        // 验证步骤2
        const canSubmit = computed(() => {
            return selectedFile.value !== null || filePath.value.trim() !== '';
        });

        function onCancel() {
            context.emit('change', 'cancel');
        }

        function onNext() {
            if (currentStep.value === 1 && canProceedToStep2.value) {
                currentStep.value = 2;
            }
        }

        function onPrevious() {
            if (currentStep.value === 2) {
                currentStep.value = 1;
            }
        }

        async function onConfirm() {
            if (!canSubmit.value) {
                error.value = '请选择要分析的程序文件';
                return;
            }

            loading.value = true;
            error.value = '';

            // 构建分析选项
            const analysisOptions: AnalysisOptions = {
                java: {
                    version: javaVersion.value,
                },
                dependencyInjection: {
                    enabled: dependencyInjectionEnabled.value,
                },
                webEndpoints: {
                    enabled: webEndpointsEnabled.value,
                },
            };

            // 构建请求参数
            const taskParams: any = {
                taskName: taskName.value,
                analysisOptions,
            };

            if (selectedFile.value) {
                taskParams.programFile = selectedFile.value;
            } else if (filePath.value.trim()) {
                taskParams.programFilePath = filePath.value.trim();
            }

            try {
                const response = await createTask(taskParams);
                
                if (response.code === 0) {
                    alert(`任务创建成功！任务ID: ${response.data}`);
                    context.emit('change', 'confirm');
                } else {
                    error.value = response.message || '创建任务失败';
                }
            } catch (err) {
                error.value = '网络错误，请检查分析服务是否运行';
            } finally {
                loading.value = false;
            }
        }

        function onFileSelect(event: Event) {
            const input = event.target as HTMLInputElement;
            if (input.files && input.files.length > 0) {
                selectedFile.value = input.files[0];
                error.value = '';
            }
        }

        function onFileDrop(event: DragEvent) {
            event.preventDefault();
            if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
                selectedFile.value = event.dataTransfer.files[0];
                error.value = '';
            }
        }

        function onDragOver(event: DragEvent) {
            event.preventDefault();
        }

        return () => {
            return (
                <div class="f-app-analysis-task-card">
                    <div class="task-card-banner">
                        <div class="task-card-icon"></div>
                        <div class="task-card-title">新建分析任务</div>
                    </div>

                    {/* 步骤指示器 */}
                    <div class="task-card-progress">
                        <div class="step-indicator">
                            <div class={`step-item ${currentStep.value >= 1 ? 'active' : ''}`}>
                                <div class="step-number">1</div>
                                <div class="step-text">
                                    <span class="step-title">配置选项</span>
                                    <span class="step-desc">{currentStep.value >= 1 ? '进行中' : '待完成'}</span>
                                </div>
                            </div>
                            <div class="step-line"></div>
                            <div class={`step-item ${currentStep.value >= 2 ? 'active' : ''}`}>
                                <div class="step-number">2</div>
                                <div class="step-text">
                                    <span class="step-title">上传项目</span>
                                    <span class="step-desc">{currentStep.value >= 2 ? '进行中' : '待完成'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="task-card-options">
                        {/* 步骤1: 配置选项 */}
                        {currentStep.value === 1 && (
                            <div class="step-content">
                                <div class="form-group">
                                    <label class="form-label required">任务名称</label>
                                    <input 
                                        type="text" 
                                        class="form-control"
                                        placeholder="请输入任务名称"
                                        value={taskName.value}
                                        onInput={(e) => taskName.value = (e.target as HTMLInputElement).value}
                                    />
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Java版本</label>
                                    <select 
                                        class="form-control"
                                        value={javaVersion.value}
                                        onChange={(e) => javaVersion.value = (e.target as HTMLSelectElement).value}
                                    >
                                        <option value="8">Java 8</option>
                                        <option value="11">Java 11</option>
                                        <option value="17">Java 17</option>
                                        <option value="21">Java 21</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">
                                        分析选项
                                        {isQualityModified.value && (
                                            <button class="restore-defaults-btn" type="button" onClick={onRestoreDefaults}>
                                                恢复默认
                                            </button>
                                        )}
                                    </label>
                                    <div class="checkbox-group">
                                        <label class="checkbox-item">
                                            <input 
                                                type="checkbox" 
                                                checked={baseFrameworkEnabled.value}
                                                onChange={(e) => baseFrameworkEnabled.value = (e.target as HTMLInputElement).checked}
                                            />
                                            <span>基础框架特性分析</span>
                                        </label>
                                        <label class="checkbox-item">
                                            <input 
                                                type="checkbox" 
                                                checked={dependencyInjectionEnabled.value}
                                                onChange={(e) => dependencyInjectionEnabled.value = (e.target as HTMLInputElement).checked}
                                            />
                                            <span>依赖注入分析</span>
                                        </label>
                                        <label class="checkbox-item">
                                            <input 
                                                type="checkbox" 
                                                checked={webEndpointsEnabled.value}
                                                onChange={(e) => webEndpointsEnabled.value = (e.target as HTMLInputElement).checked}
                                            />
                                            <span>Web端点配置分析</span>
                                        </label>
                                        <label class="checkbox-item">
                                            <input 
                                                type="checkbox" 
                                                checked={persistenceFrameworkEnabled.value}
                                                onChange={(e) => persistenceFrameworkEnabled.value = (e.target as HTMLInputElement).checked}
                                            />
                                            <span>持久化框架特性分析</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 步骤2: 上传项目 */}
                        {currentStep.value === 2 && (
                            <div class="step-content">
                                <div class="form-group">
                                    <label class="form-label">程序文件</label>
                                    <div 
                                        class="file-upload-area"
                                        onDrop={onFileDrop}
                                        onDragOver={onDragOver}
                                    >
                                        {selectedFile.value ? (
                                            <div class="file-selected">
                                                <span class="f-icon f-icon-document"></span>
                                                <span class="file-name">{selectedFile.value.name}</span>
                                                <span class="file-size">({(selectedFile.value.size / 1024).toFixed(2)} KB)</span>
                                                <button 
                                                    class="btn-remove"
                                                    onClick={() => selectedFile.value = null}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ) : (
                                            <div class="file-placeholder">
                                                <span class="f-icon f-icon-upload"></span>
                                                <p>拖拽文件到此处，或</p>
                                                <label class="btn-upload">
                                                    选择文件
                                                    <input 
                                                        type="file" 
                                                        accept=".zip,.jar,.java" 
                                                        onChange={onFileSelect}
                                                        style="display: none;"
                                                    />
                                                </label>
                                                <p class="file-hint">支持 .zip、.jar 格式的 Java 程序</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">或输入文件路径</label>
                                    <input 
                                        type="text" 
                                        class="form-control"
                                        placeholder="输入已挂载的文件路径，如: uploaded-files/test-program-zip/ddw.zip"
                                        value={filePath.value}
                                        onInput={(e) => filePath.value = (e.target as HTMLInputElement).value}
                                    />
                                    <p class="form-hint">如果文件已挂载到 Docker 容器中，可直接输入文件路径</p>
                                </div>

                                <div class="task-summary">
                                    <h4>任务摘要</h4>
                                    <div class="summary-item">
                                        <span class="summary-label">任务名称：</span>
                                        <span class="summary-value">{taskName.value || '-'}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="summary-label">Java版本：</span>
                                        <span class="summary-value">Java {javaVersion.value}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="summary-label">分析选项：</span>
                                        <span class="summary-value">
                                            {[baseFrameworkEnabled.value && '基础框架', dependencyInjectionEnabled.value && '依赖注入', webEndpointsEnabled.value && 'Web端点', persistenceFrameworkEnabled.value && '持久化'].filter(Boolean).join('、') || '无'}
                                        </span>
                                    </div>
                                </div>

                                {error.value && (
                                    <div class="error-message">
                                        <span class="f-icon f-icon-warning-circle"></span>
                                        <span>{error.value}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div class="task-card-toolbar">
                        <div class="toolbar-buttons">
                            <FButton size="large" type="secondary" onClick={onCancel} disabled={loading.value}>
                                取消
                            </FButton>
                            {currentStep.value > 1 && (
                                <FButton size="large" type="secondary" onClick={onPrevious} disabled={loading.value}>
                                    上一步
                                </FButton>
                            )}
                            {currentStep.value === 1 && (
                                <FButton 
                                    size="large" 
                                    onClick={onNext} 
                                    disabled={!canProceedToStep2.value}
                                >
                                    下一步
                                </FButton>
                            )}
                            {currentStep.value === 2 && (
                                <FButton 
                                    size="large" 
                                    type="primary" 
                                    onClick={onConfirm} 
                                    disabled={!canSubmit.value || loading.value}
                                >
                                    {loading.value ? '创建中...' : '创建任务'}
                                </FButton>
                            )}
                        </div>
                    </div>
                </div>
            );
        };
    }
});
