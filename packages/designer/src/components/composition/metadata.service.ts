import axios from 'axios';
import { DesignerMode } from '../types/designer-context';
import { useDesignerContext } from './designer-context/use-designer-context';
import { useLocation } from './use-location';

export class MetadataService {
    private designerMode = useDesignerContext().designerMode;

    /** 低代码获取元数据url */
    private metadataBasePath = '/api/dev/main/v1.0/metadatas';

    /**
     * /api/dev/main/v1.0/mdservice
     */
    private metadataServicePath = '/api/dev/main/v1.0/mdservice';

    /** 运行时定制获取元数据url */
    private rtcMetadataBasePath = '/api/runtime/lcm/v1.0/rt-metadatas';
    private rtcMetadataPath = '/api/runtime/bcc/v1.0/template';


    public getMetadataPath() {
        const { getUrlParam } = useLocation();
        let metadataPath = getUrlParam('id') || '';
        // 增加此处会影响构件的Path属性
        if (metadataPath && metadataPath.startsWith('/')) {
            metadataPath = metadataPath.slice(1, metadataPath.length);
        }
        if (metadataPath && metadataPath.endsWith('/')) {
            metadataPath = metadataPath.slice(0, metadataPath.length - 1);
        }
        return metadataPath;
    }

    /**
     * 根据元数据类型查询元数据
     * @param relativePath
     * @param metadataType
     * @returns
     */
    public getMetadataListByType(relativePath: string, metadataType: string): Promise<any> {
        let url;
        if (this.designerMode === DesignerMode.PC_RTC) {
            url = `${this.rtcMetadataBasePath}?metadataTypes=${metadataType}`;
        } else {
            url = `${this.metadataBasePath}?path=${relativePath}&metadataTypeList=${metadataType}`;
        }
        // const url = this.metadataBasePath + '?path=' + relativePath + '&metadataTypeList=' + metadataType;
        return axios.get(url);
    }

    /**
     * 获取当前工程下或者其他元数据包中依赖的元数据
     * @param {?} path
     * @param {?} metadataId
     * @param {?} sessionId
     * @return {?}
     */
    public getRefMetadata(relativePath: string, metadataId: string): Promise<any> {
        let url;
        if (this.designerMode === DesignerMode.PC_RTC) {
            url = `${this.rtcMetadataBasePath}/${metadataId}`;
        } else {
            url = `${this.metadataBasePath}/relied?metadataPath=${relativePath}&metadataID=${metadataId}`;
        }
        return axios.get(url);
    }

    /**
     * 获取当前工程下所有的元数据包
     * @param {?} spacePath
     * @param {?} typeName
     * @return {?}
     */
    public getMetadataList(spacePath, typeName) {
        const url = this.metadataServicePath + '?path=' + spacePath + '&metadataTypeList=' + typeName;
        return axios.get(url);
    };

    public getMetadataListInSu(relativePath: string, metaddataType: string) {
        const url = this.metadataServicePath + '/metadataListInSu?path=' + relativePath + '&metadataTypeList=' + metaddataType;
        return axios.get(url);
    }

    /**
     * 获取最近使用的元数据
     * @param relativePath
     * @param metaddataType
     * @returns
     */
    public getRecentMetadata(relativePath: string, metaddataType: string) {
        const url = this.metadataServicePath + '/getmdrecentuse?path=' + relativePath + '&metadataTypeList=' + metaddataType;
        return axios.get(url);
    }

    /**
     * 获取所有元数据
     * @param relativePath
     * @param metaddataType
     * @param pageSize
     * @returns
     */
    public getAllMetadataList(relativePath: string, metadataType: string, pageSize = 1000) {
        let url = `${this.metadataServicePath}/unionmdlist?path=${relativePath}&`;

        if (this.designerMode === DesignerMode.PC_RTC) {
            url = `${this.rtcMetadataBasePath}/rtmetadatalist?`;
        }
        return axios.get(`${url}pageIndex=1&pageSize=${pageSize}&metadataTypeList=${metadataType}`).then((res: any) => {
            const totalNum = res.data['page']['total'] || 0;
            if (pageSize !== totalNum && totalNum > 1000) {
                return this.getAllMetadataList(relativePath, metadataType, totalNum);
            }
            return res;
        });
    }

    public getPickMetadata(relativePath: string, data: any) {
        if (this.designerMode === DesignerMode.PC_RTC) {
            const url = `${this.rtcMetadataBasePath}/${data?.id}`;
            return axios.get(url, data).then((res: any) => {
                return { metadata: res.data };
            });
        } else {
            const url = this.metadataServicePath + '/pickMetadata?currentPath=' + relativePath;
            return axios.post(url, data).then((res: any) => {
                return res.data;
            });
        }
    }

    public saveMetadata(metadataDto: any, formBasicInfo?: any) {
        if (this.designerMode === DesignerMode.PC_RTC) {
            const { dimension1, dimension2 } = formBasicInfo;
            return axios.post(this.rtcMetadataBasePath, {
                metadataDto,
                firstDimension: dimension1,
                secondDimension: dimension2
            });
        } else {
            return axios.put(this.metadataBasePath, metadataDto);
        }

    }

    public validateRepeatName(path: string, fileName: string) {
        const url = this.metadataBasePath + '/validation?path=' + path + '&fileName=' + fileName;
        return axios.get(url).then((res: any) => {
            return res.data;
        });
    }
    // Load元数据（外部调用）
    public loadMetadata(fullName: string, path: string) {
        const metadataFullPath = path.replace(/\\/g, '/') + '/' + fullName;
        const encMetadataFullPath = encodeURIComponent(metadataFullPath);
        const url = this.metadataBasePath + '/load?metadataFullPath=' + encMetadataFullPath;
        return axios.get(url).then((res: any) => {
            return res.data;
        });
    }
    // 初始化元数据实体
    public initializeMetadataEntity(metadataDto: any) {
        let name_chs = metadataDto.name;
        let name_en = "";
        let name_cht = "";
        if (metadataDto.nameLanguage) {
            // 默认处理
            name_chs = metadataDto.nameLanguage['zh-CHS'] ? metadataDto.nameLanguage['zh-CHS'] : name_chs;
            name_en = metadataDto.nameLanguage['en'] ? metadataDto.nameLanguage['en'] : "";
            name_cht = metadataDto.nameLanguage['zh-CHT'] ? metadataDto.nameLanguage['zh-CHT'] : "";
        }
        // tslint:disable-next-line:max-line-length
        const url = this.metadataBasePath + '/initialized?nameSpace=' + metadataDto.nameSpace + '&code=' + metadataDto.code + '&name=' + name_chs + '&name_cht=' + name_cht + '&name_en=' + name_en + '&type=' + metadataDto.type + '&bizObjectID=' + metadataDto.bizobjectID + '&metadataPath=' + metadataDto.relativePath + '&extendProperty=' + metadataDto.extendProperty;

        return axios.get(url).then((res: any) => {
            return res.data;
        });
    }
    // 新建元数据
    public createMetadata(metadataDto: any) {
        const content = {
            'ID': metadataDto.id,
            'NameSpace': metadataDto.nameSpace,
            'Code': metadataDto.code,
            'Name': metadataDto.name,
            'FileName': metadataDto.fileName,
            'RelativePath': metadataDto.relativePath,
            'Content': metadataDto.content,
            'Type': metadataDto.type,
            'BizobjectID': metadataDto.bizobjectID,
            'ExtendProperty': metadataDto.extendProperty,
            'NameLanguage': !metadataDto.nameLanguage ? null : metadataDto.nameLanguage,
            Properties: { Framework: 'Vue' }
        };
        const url = this.metadataBasePath;

        return axios.post(url, content, {
            params: {}, // 可以指定请求的URL参数
            responseType: 'stream'
        }
        ).then((res: any) => {
            return { ok: res.status === 204 };
        });
    }

    /**
     * 运行时定制：查询与当前元数据相关的命令构件和web构件
     */
    public queryRelatedComponentMetadata(formMetadataId?: string) {
        if (!formMetadataId) {
            return Promise.resolve([]);
        }
        return axios.get(`${this.rtcMetadataPath}/queryformcmdrefs/${formMetadataId}`).then((res: any) => {
            return res.data;
        });;
    }

    // 初始化元数据实体(运行时定制)
    public initializeRtcMetadataEntity(metadataDto: any, formMetadataId: string) {
        return axios.post(`${this.rtcMetadataPath}/Vue/${formMetadataId}/initMetadata`, metadataDto).then((res: any) => {
            return res.data;
        });
    }
    // 新建元数据(运行时定制)
    public createRtcMetadata(metadataDto: any) {
        const content = {
            'ID': metadataDto.id,
            'NameSpace': metadataDto.nameSpace,
            'Code': metadataDto.code,
            'Name': metadataDto.name,
            'FileName': metadataDto.fileName,
            'RelativePath': metadataDto.relativePath,
            'Content': metadataDto.content,
            'Type': metadataDto.type,
            'BizobjectID': metadataDto.bizobjectID,
            'ExtendProperty': metadataDto.extendProperty,
            'NameLanguage': !metadataDto.nameLanguage ? null : metadataDto.nameLanguage,
            Properties: { Framework: 'Vue' }
        };

        return axios.put(`${this.rtcMetadataPath}/savecomponentmetadata`, content).then((res: any) => {
            return { ok: res.status === 204 };
        });
    }
}
