import { defineComponent } from "vue";
import { FButton, FDynamicForm, FDynamicFormGroup, FSection } from "@farris/ui-vue/components";
import { ProfileProps, profileProps } from "./profile.props";

import './profile.scss';

export default defineComponent({
    name: 'FAppProfile',
    props: profileProps,
    emits: [],
    setup(props: ProfileProps, context) {
        const title = '泵房控制-应用信息详情';
        const profileEditorOptions = {
            type: 'textarea'
        };
        const appStatusEditorOptions = {
            type: 'combo-list',
            idField: 'value',
            data: [
                { name: '待发布', value: 'created' },
                { name: '发布中', value: 'publishing' },
                { name: '已发布', value: 'published' }
            ],
            textField: 'name',
            valueField: 'value',
        };

        function renderTitleArea() {
            return (
                <div class="f-title">
                    <div class="f-title-logo"></div>
                    <h4 class="f-title-text">{title}</h4>
                </div>
            );
        }

        function renderToolbar() {
            return (
                <div class="f-toolbar">
                    <FButton type="secondary">预览</FButton>
                    <FButton type="secondary">编辑代码</FButton>
                    <FButton>发布</FButton>
                </div>
            );
        }

        return () => {
            return (
                <div class="f-page f-page-card f-page-is-mainsubcard f-app-profile">
                    <div class="f-admin-main-header"></div>
                    <div class="f-admin-main-content">
                        <div class="f-page-header" >
                            <nav class="f-page-header-base">
                                {renderTitleArea()}
                                {renderToolbar()}
                            </nav>
                            <div class="f-page-header-background"></div>
                        </div>
                        <div class="f-page-main">
                            <FSection class="f-utils-fill-flex-column" mainTitle="应用信息">
                                <FDynamicForm class="f-form-layout farris-form farris-form-controls-inline f-app-profile-form">
                                    <FDynamicFormGroup id="app-name-input-group" class="col-12" label="应用名称" required={true}>
                                    </FDynamicFormGroup>
                                    <FDynamicFormGroup id="app-profile-combo-list" class="col-12" editor={profileEditorOptions} label="应用介绍">
                                    </FDynamicFormGroup>
                                    <FDynamicFormGroup id="app-deploy-path-input-group" class="col-12" label="应用路径" required={true}>
                                    </FDynamicFormGroup>
                                    <FDynamicFormGroup id="app-status-combo-list" class="col-12" editor={appStatusEditorOptions} label="发布情况" required={true}>
                                    </FDynamicFormGroup>
                                    <div class="col-12 f-profile-toolbar">
                                        <div>
                                            <FButton>保存</FButton>
                                            <FButton type="secondary">编辑</FButton>
                                            <FButton type="secondary">取消</FButton>
                                        </div>
                                    </div>
                                </FDynamicForm>
                            </FSection>
                        </div>
                    </div>
                </div>
            );
        };
    }
});
