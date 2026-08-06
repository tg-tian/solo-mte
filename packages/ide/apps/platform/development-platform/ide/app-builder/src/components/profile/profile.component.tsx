import { defineComponent, inject, ref, watch } from "vue";
import {
	FButton,
	FDynamicForm,
	FDynamicFormGroup,
	FSection,
	F_NOTIFY_SERVICE_TOKEN,
	FNotifyService,
} from "@farris/ui-vue";
import { ProfileProps, profileProps } from "./profile.props";
import { UsePreview } from "./compositon/use-preview";
import { UseWorkspace } from "../../composition/types";
import { useProfile } from "./compositon/use-profile";
import { useStandardPublish } from "../../../../publish/use-standard-publish.composition";
import PublishPanel from "../../../../publish/publish-panel.component";
import app from "apps/platform/development-platform/ide/app-center/src/app";
import axios from "axios";

export default defineComponent({
	name: "FAppProfile",
	props: profileProps,
	emits: [],
	setup(props: ProfileProps, context) {
		const title = "泵房控制-应用信息详情";
		const appName = ref("");
		const appPath = ref("");
		const appStatus = ref("");
		const appDeployPath = ref("");
		const appDescription = ref("");
		const isEditing = ref(false);
		const isSaving = ref(false);
		const editName = ref("");
		const editDescription = ref("");
		const profileEditorOptions = {
			type: "textarea",
		};
		const appStatusEditorOptions = {
			type: "combo-list",
			idField: "value",
			data: [
				{ name: "待发布", value: "created" },
				{ name: "发布中", value: "publishing" },
				{ name: "已发布", value: "published" },
			],
			textField: "name",
			valueField: "value",
		};
		const useWorkspaceComposition = inject("f-admin-workspace") as UseWorkspace;
		const notifyService = inject(F_NOTIFY_SERVICE_TOKEN) as FNotifyService;
		const { options } = useWorkspaceComposition;
		const showPublishStatus = ref(false);
		appPath.value = options.path;
		const useProfileComposition = useProfile();
		useProfileComposition.getProfile().then((profile) => {
			appName.value = profile.name;
			appDescription.value = profile.description || "";
		});
		const publishComposition = useStandardPublish();
		const usePreviewComposition = UsePreview(publishComposition);

		function renderTitleArea() {
			return (
				<div class="f-title">
					<div class="f-title-logo"></div>
					<h4 class="f-title-text">{appName.value}</h4>
				</div>
			);
		}

		function preview() {
			usePreviewComposition.preview(useWorkspaceComposition.options);
		}

		function startEdit() {
			editName.value = appName.value;
			editDescription.value = appDescription.value;
			isEditing.value = true;
		}

		function cancelEdit() {
			editName.value = "";
			editDescription.value = "";
			isEditing.value = false;
		}

		async function save() {
			const trimmedName = editName.value.trim();
			if (!trimmedName) {
				notifyService.warning({ message: "应用名称不能为空" });
				return;
			}

			isSaving.value = true;
			const boId = options.boId;

			try {
				// 1. 获取完整业务对象数据
				const getUrl = `/api/dev/main/v1.0/business-objects/${boId}`;
				const getResponse = await axios.get(getUrl);
				const boData = getResponse.data as Record<string, any>;

				// 2. 替换名称和描述
				boData.name = trimmedName;
				if (boData.languageName && typeof boData.languageName === "object") {
					boData.languageName["zh-CHS"] = trimmedName;
				}
				boData.description = editDescription.value;

				// 3. 保存
				const putUrl = "/api/runtime/sys/v1.0/business-objects/";
				await axios.put(putUrl, boData);

				// 4. 重新获取最新数据
				const freshResponse = await axios.get(getUrl);
				const freshData = freshResponse.data as Record<string, any>;

				// 5. 更新页面数据
				const newName = freshData.name || trimmedName;
				const newDescription = freshData.description || "";
				appName.value = newName;
				appDescription.value = newDescription;
				editName.value = "";
				editDescription.value = "";

				// 6. 同步顶部标题
				useWorkspaceComposition.updateAppName(newName);

				isEditing.value = false;
				notifyService.success({ message: "保存成功" });
			} catch (error: any) {
				const message = error?.response?.data?.Message
					|| error?.response?.data?.message
					|| error?.message
					|| "保存失败";
				notifyService.error({ message });
			} finally {
				isSaving.value = false;
			}
		}

		function renderToolbar() {
			return (
				<div class="f-toolbar">
					<FButton onClick={preview}>
						预览
					</FButton>
					{false && <FButton type="secondary">编辑代码</FButton>}
					{false && <FButton>发布</FButton>}
				</div>
			);
		}

		function renderViewMode() {
			return (
				<div class="f-form-layout farris-form farris-form-controls-inline f-app-profile-form">
					<div class="col-12 f-profile-info-item">
						<label class="f-profile-info-label">应用名称</label>
						<span class="f-profile-info-value">{appName.value}</span>
					</div>
					<div class="col-12 f-profile-info-item">
						<label class="f-profile-info-label">应用介绍</label>
						<span class="f-profile-info-value">{appDescription.value || "-"}</span>
					</div>
					<div class="col-12 f-profile-info-item">
						<label class="f-profile-info-label">应用路径</label>
						<span class="f-profile-info-value">{appPath.value}</span>
					</div>
					{showPublishStatus.value && <div class="col-12 f-profile-info-item">
						<label class="f-profile-info-label">发布情况</label>
						<span class="f-profile-info-value">{appStatus.value || "-"}</span>
					</div>}
					<div class="col-12 f-profile-toolbar">
						<div>
							<FButton disabled={true}>保存</FButton>
							<FButton type="secondary" onClick={startEdit}>编辑</FButton>
							<FButton type="secondary" disabled={true}>取消</FButton>
						</div>
					</div>
				</div>
			);
		}

		function renderEditMode() {
			return (
				<FDynamicForm class="f-form-layout farris-form farris-form-controls-inline f-app-profile-form">
					<FDynamicFormGroup
						id="app-name-input-group"
						class="col-12"
						label="应用名称"
						required={true}
						v-model={editName.value}
					></FDynamicFormGroup>
					<FDynamicFormGroup
						id="app-profile-combo-list"
						class="col-12"
						editor={profileEditorOptions}
						label="应用介绍"
						v-model={editDescription.value}
					></FDynamicFormGroup>
					<FDynamicFormGroup
						id="app-deploy-path-input-group"
						class="col-12"
						label="应用路径"
						editor={{ readonly: true }}
						v-model={appPath.value}
					></FDynamicFormGroup>
					{showPublishStatus.value && <FDynamicFormGroup
						id="app-status-combo-list"
						class="col-12"
						editor={appStatusEditorOptions}
						label="发布情况"
						required={true}
					></FDynamicFormGroup>}
					<div class="col-12 f-profile-toolbar">
						<div>
							<FButton onClick={save} disabled={isSaving.value}>保存</FButton>
							<FButton type="secondary" disabled={true}>编辑</FButton>
							<FButton type="secondary" onClick={cancelEdit} disabled={isSaving.value}>取消</FButton>
						</div>
					</div>
				</FDynamicForm>
			);
		}

		return () => {
			return (
				<div class="f-page f-page-card f-page-is-mainsubcard f-app-profile">
					<div class="f-app-builder-main-header">
						<div class="f-app-builder-main-tabs">
							<div class="f-app-builder-main-tabs-title">应用信息</div>
							<div class="f-app-builder-main-tabs-content"></div>
							<div class="f-app-builder-main-tabs-toolbar">
								<FButton onClick={preview}>预览</FButton>
								{false && <FButton type="secondary">编辑代码</FButton>}
								{false && <FButton>发布</FButton>}

							</div>
							<div class="f-app-builder-main-tabs-background"></div>
						</div>
					</div>
					<div class="f-app-builder-main-content">
						<div class="f-page-main">
							<FSection class="f-utils-fill-flex-column" mainTitle="基本信息">
								{isEditing.value ? renderEditMode() : renderViewMode()}
							</FSection>
						</div>
					</div>
					<PublishPanel
						visible={publishComposition.panelVisible.value}
						progress={publishComposition.progressInfo.value}
						onClose={publishComposition.closePanel}
					></PublishPanel>
				</div>
			);
		};
	},
});
