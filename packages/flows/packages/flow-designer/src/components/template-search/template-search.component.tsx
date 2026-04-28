import { defineComponent, inject, onUnmounted } from 'vue';
import { debounce } from 'lodash-es';
import { TPopup } from '@farris/flow-devkit';
import { useTemplateSearch } from '@flow-designer/hooks';
import type { TemplateItem } from '@flow-designer/api/template';

import css from './template-search.module.scss';

export default defineComponent({
    name: 'TemplateSearch',
    setup() {
        const {
            searchKeyword,
            templates,
            loading,
            showDropdown,
            searchTemplates,
            applyTemplate,
            clearSearch,
        } = useTemplateSearch();

        const messageBoxService = inject<any>('FMessageBoxService');

        const debouncedSearch = debounce((keyword: string) => {
            searchTemplates(keyword);
        }, 500);

        onUnmounted(() => {
            debouncedSearch.cancel();
        });

        function handleSearchInput(val: string) {
            searchKeyword.value = val;
            if (!val || !val.trim()) {
                debouncedSearch.cancel();
                clearSearch();
                return;
            }
            debouncedSearch(val.trim());
        }

        function handleKeydown(event: KeyboardEvent) {
            if (event.key === 'Enter') {
                debouncedSearch.cancel();
                searchTemplates(searchKeyword.value || '');
            }
        }

        function handleClear() {
            debouncedSearch.cancel();
            clearSearch();
        }

        function handleSelectTemplate(template: TemplateItem) {
            showDropdown.value = false;
            if (messageBoxService && messageBoxService.question) {
                messageBoxService.question(
                    '确认应用模板？',
                    `确定要应用模板"${template.name}"吗？`,
                    () => applyTemplate(template),
                    () => { }
                );
            }
        }

        function renderTemplateItem(template: TemplateItem) {
            return (
                <div
                    key={template.id}
                    class={css['item']}
                    onClick={() => handleSelectTemplate(template)}
                >
                    <div class={css['item-header']}>
                        <span class={css['item-name']}>{template.name}</span>
                        <span class={css['item-index']}>{template.template_index}</span>
                    </div>
                    <div class={css['item-desc']}>{template.template_description}</div>
                </div>
            );
        }

        function renderDropdownContent() {
            if (loading.value) {
                return (
                    <div class={css['dropdown-content']}>
                        <div class={css['loading']}>
                            <div class={["f-loading-round", css['loading-icon']]}></div>
                        </div>
                    </div>
                );
            }

            if (!templates.value.length) {
                return (
                    <div class={css['dropdown-content']}>
                        <div class={css['empty']}>未找到匹配的模板</div>
                    </div>
                );
            }

            return (
                <div class={css['dropdown-content']}>
                    {templates.value.map(renderTemplateItem)}
                </div>
            );
        }

        function handleVisibleChange(visible: boolean) {
            showDropdown.value = visible;
        }

        const searchIcon = '<span class="f-icon f-icon-search"></span>';

        function renderSearchInput() {
            return (
                <div class={css['input-wrapper']}>
                    <f-input-group
                        class={css['input']}
                        placeholder="搜索模板"
                        modelValue={searchKeyword.value}
                        groupText={searchIcon}
                        updateOn="change"
                        onUpdate:modelValue={handleSearchInput}
                        onKeydown={handleKeydown}
                        onClear={handleClear}
                    />
                </div>
            );
        }

        return () => (
            <TPopup
                class={css['template-search']}
                trigger="click"
                placement="bottom"
                visible={showDropdown.value}
                onVisibleChange={handleVisibleChange}
                overlayInnerClassName={css['dropdown']}
                default={renderSearchInput}
                content={renderDropdownContent}
            />
        );
    },
});
