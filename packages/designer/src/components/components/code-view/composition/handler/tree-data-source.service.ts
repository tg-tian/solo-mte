import { IdService } from "../../../view-model-designer/method-manager/service/id.service";
import { MetadataDto } from "../../../../types";
import { NavTreeData, NavTreeNode } from "../type/tree";
import { MetadataType } from "../type/metadata";
import { NavDataUtilService } from "./nav-data-util.service";
import { getValidId } from "../utils/valid";
import { CommonFileNavTreeDataService } from "../type/nav/common-file";
import { DesignerMode } from "../../../../../components/types/designer-context";
import { MetadataService } from "../../../../../components/composition/metadata.service";

/**
 * 处理树绑定的数据
 */
export class TreeDataSource extends CommonFileNavTreeDataService {
    private navDataUtilService;
    private idService;
    constructor(private designerMode: DesignerMode, private formBasicInfo: MetadataDto) {
        super();
        this.navDataUtilService = new NavDataUtilService();
        this.idService = new IdService();
    }

    enableLayeredLoading(): boolean {
        return false;
    }

    /** 已用id集合，用于防止生成的id重复 */
    private idSet: Set<string> = new Set<string>();

    async getChildren(rootPath: string): Promise<NavTreeNode[]> {
        if (!rootPath) {
            return new Promise((resolve, reject) => {
                resolve([]);
            });
        }
        this.idSet = new Set<string>();
        const metadataService = new MetadataService();
        /** 当前工程路径 */
        const projectPath = this.navDataUtilService.getProjectPathFromFrmPath(rootPath);
        /** 当前工程下相关的元数据 */
        let metas;
        /** 表单元数据的编号 */
        let formCode;
        let rtcFormCode;
        const isRtcMode = this.designerMode === DesignerMode.PC_RTC;
        if (isRtcMode) {
            metas = await metadataService.queryRelatedComponentMetadata(this.formBasicInfo.rtcId);
            rtcFormCode = this.formBasicInfo.rtcCode;
            formCode = this.formBasicInfo.code;
        } else {
            metas = await this.navDataUtilService.getProjectMetas(projectPath);

            // 获取表单元数据描述
            const frmMeta = this.navDataUtilService.findMetaByFilename(rootPath, metas);
            formCode = frmMeta?.code || '';
        }

        // 根据表单编号过滤出当前表单下的所有命令构件元数据
        const webcmdMetaArr = this.navDataUtilService.filterMetadataByFrmCodeAndType(metas, formCode, MetadataType.WebCommand, !isRtcMode);
        const roots: NavTreeNode[] = [];
        for (const webcmdMeta of webcmdMetaArr) {
            roots.push(
                this.getWebcmdNode(webcmdMeta, projectPath)
            );
        }
        // 对于每一个命令构件节点，查看其是否含有关联的服务构件节点
        const linkedWebcmps: MetadataDto[] = [];
        for (const webcmdNode of roots) {
            const webcmp = this.findWebcmpByFilename(metas, webcmdNode.data.metadataDto.fileName);
            if (webcmp) {
                linkedWebcmps.push(webcmp);
                const webcmpNode = this.getWebcmpNode(webcmp, projectPath, webcmdNode.data.webCommandId);
                webcmdNode.children = [webcmpNode];
                webcmdNode.data.webComponentId = webcmpNode.data.webComponentId;
            }
        }
        // 可能存在属于表单，但是没有对应命令构件的服务构件
        const webcmpMetaArr = this.navDataUtilService.filterMetadataByFrmCodeAndType(metas, formCode, MetadataType.WebComponent, !isRtcMode);
        for (const webcmp of webcmpMetaArr) {
            if (!linkedWebcmps.find(cmp => cmp.id === webcmp.id)) {
                roots.push(this.getWebcmpNode(webcmp, projectPath));
            }
        }
        // 可能存在不属于表单的元数据，将它们单独列出来
        const nonFormCmds = this.filterNonFormCmp(metas, MetadataType.WebCommand);
        for (const nonFormCmd of nonFormCmds) {
            roots.push(this.getWebcmdNode(nonFormCmd, projectPath));
        }
        const nonFormCmps = this.filterNonFormCmp(metas, MetadataType.WebComponent);
        for (const nonFormCmp of nonFormCmps) {
            roots.push(this.getWebcmdNode(nonFormCmp, projectPath));
        }
        this.idSet = new Set<string>();
        return roots;
    }

    /** 获取命令构件节点 */
    private getWebcmdNode(webcmd: MetadataDto, projectPath: string): NavTreeNode {
        // 运行时定制环境下：只允许编辑当前扩展表单的构件，不允许编辑基础表单的构件以及上级公有表单的构件
        const isBelongedToCurrentForm = webcmd.fileName?.startsWith(`${this.formBasicInfo.rtcCode}_ext_frm_`) || false;
        const nodeData: NavTreeData = {
            id: this.generateUniqueId(webcmd),
            name: webcmd.fileName || '',
            path: this.navDataUtilService.getRelativePath(webcmd, projectPath, this.formBasicInfo.relativePath),
            metadataDto: webcmd,
            canOpen: true,
            metadataReadonly: this.designerMode === DesignerMode.PC_RTC && !isBelongedToCurrentForm,
            webCommandId: webcmd.id
        };
        const cmdNode: NavTreeNode = {
            id: nodeData.id || '',
            data: nodeData,
            children: [],
            expanded: true
        };
        return cmdNode;
    }

    /**
     * 寻找和webcmd同名的webdmp元数据文件
     * @param metas 元数据集合
     * @param filename webcmd的文件名
     * @returns webcmp元数据
     */
    private findWebcmpByFilename(metas: MetadataDto[], filename: string): MetadataDto | null {
        const name = this.getFilenameWithoutSuffix(filename);
        if (name) {
            for (const meta of metas) {
                if (meta.type !== MetadataType.WebComponent) {
                    continue;
                }
                const metaName = this.getFilenameWithoutSuffix(meta.fileName);
                if (metaName === name) {
                    return meta;
                }
            }
        }
        return null;
    }

    /** 通过元数据生成唯一标识 */
    private generateUniqueId(meta: MetadataDto): string {
        const newId = getValidId(this.generateId(meta));
        let uniqueId = newId;
        let suffix = 1;
        while (this.idSet.has(uniqueId)) {
            ++suffix;
            uniqueId = `${newId}_${suffix}`;
        }
        this.idSet.add(uniqueId);
        return uniqueId;
    }
    private generateId(meta: MetadataDto): string {
        if (meta) {
            return meta.relativePath + "/" + meta.fileName;
        } else {
            return this.idService.generate();
        }
    }

    private getWebcmpNode(webcmp: MetadataDto, projectPath: string, webCommandId = ''): NavTreeNode {
        // 运行时定制环境下：只允许编辑当前扩展表单的构件，不允许编辑基础表单的构件以及上级公有表单的构件
        const isBelongedToCurrentForm = webcmp.fileName?.startsWith(`${this.formBasicInfo.rtcCode}_ext_frm_`) || false;
        const nodeData: NavTreeData = {
            id: this.generateUniqueId(webcmp),
            name: webcmp.fileName || '',
            path: this.navDataUtilService.getRelativePath(webcmp, projectPath, this.formBasicInfo.relativePath),
            metadataDto: webcmp,
            canOpen: true,
            metadataReadonly: this.designerMode === DesignerMode.PC_RTC && !isBelongedToCurrentForm,
            webComponentId: webcmp.id,
            webCommandId
        };
        const cmpNode: NavTreeNode = {
            id: nodeData.id || '',
            data: nodeData,
            children: [],
            expanded: true
        };
        // 如果该webcmp节点的extendProperty的IsCommon为false，则追加ts代码文件节点
        const extendProperty = webcmp.extendProperty && JSON.parse(webcmp.extendProperty);
        if (!!extendProperty && !extendProperty['IsCommon']) {
            cmpNode.children = [this.getTsNode(cmpNode, webcmp.id, webCommandId)];
        }
        return cmpNode;
    }

    private getTsNode(webcmpNode: NavTreeNode, webComponentId: string, webCommandId: string): NavTreeNode {
        // 运行时定制环境下：只允许编辑当前扩展表单的构件，不允许编辑基础表单的构件以及上级公有表单的构件
        const isBelongedToCurrentForm = webcmpNode.data.name?.startsWith(`${this.formBasicInfo.rtcCode}_ext_frm_`) || false;
        const nodeData: NavTreeData = {
            id: this.generateUniqueId(webcmpNode.data.metadataDto) + ".ts",
            name: this.changeFilenameSuffix(webcmpNode.data.name, '.ts'),
            path: this.changeFilenameSuffix(webcmpNode.data.path, '.ts'),
            canOpen: true,
            metadataReadonly: this.designerMode === DesignerMode.PC_RTC && !isBelongedToCurrentForm,
            webComponentId,
            webCommandId
        };
        const tsNode: NavTreeNode = {
            id: nodeData.id || '',
            data: nodeData,
            children: [],
            leaf: true
        };
        return tsNode;
    }

    /** 修改文件的后缀名，返回新的文件名字符串 */
    private changeFilenameSuffix(name: string, newSuffix: string): string {
        const idx = name.lastIndexOf('.');
        if (idx < 0) {
            return '';
        }
        const prefix = name.substring(0, idx);
        return prefix + newSuffix;
    }

    /** 去除文件的后缀名，返回文件的名称前缀 */
    private getFilenameWithoutSuffix(filename?: string): string {
        if (!filename) {
            return '';
        }
        const idx = filename.lastIndexOf('.');
        if (idx >= 0) {
            return filename.substring(0, idx);
        }
        return '';
    }

    private filterNonFormCmp(metas: MetadataDto[], type: MetadataType): MetadataDto[] {
        // extendProperty为空，则不属于表单元数据
        const cmps = [] as any;
        for (const meta of metas) {
            if (meta.type === type) {
                if (!meta.extendProperty) {
                    cmps.push(meta);
                }
            }
        }
        return cmps;
    }

}
