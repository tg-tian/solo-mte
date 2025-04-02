import axios from 'axios';
import { omit } from 'lodash-es';
import { DesignerProps } from '../designer.props';
import { FormMetadataConverter } from './form-metadata-converter';
import { FormMetadaDataDom, MetadataDto, UseFormSchema } from '../types';

export function useFormMetadata(props: DesignerProps, useFormSchemaComposition: UseFormSchema) {

    function fetchLocalSchema(): Promise<any> {
        return new Promise((resolve, reject) => {
            const currentPath = window.location.hash;
            if (currentPath) {
                const loacalSchemaUrl = `/${currentPath.slice(1)}.json`;
                axios.get(loacalSchemaUrl).then((response) => {
                    const formSchema = response.data;
                    useFormSchemaComposition.setFormSchema(formSchema);
                    resolve(formSchema);
                });
            } else {
                resolve(props.schema);
            }
        });
    }

    /** 获取表单元数据 */
    function queryMetadata(): Promise<FormMetadaDataDom> {

        const params = new URLSearchParams(window.location.search);
        let metadataPath = params && params.get('id') ? unescape(params.get('id') as string) : '';
        if (!metadataPath) {
            return fetchLocalSchema();
            // useFormSchemaComposition.setFormSchema(props.schema);
            // resolve(props.schema);
            // return;
        }

        // 获取url中的元数据路径，查询元数据。若url中没有路径，则采用外部传入的mock数据
        return new Promise((resolve, reject) => {
            // const params = new URLSearchParams(window.location.search);
            // let metadataPath = params && params.get('id') ? unescape(params.get('id') as string) : '';
            // if (!metadataPath) {
            //     useFormSchemaComposition.setFormSchema(props.schema);
            //     resolve(props.schema);
            //     return;
            // }
            metadataPath = metadataPath.slice(1, metadataPath.length - 1);
            metadataPath = encodeURIComponent(metadataPath);
            // document.cookie = `caf_web_session=MzhhMjExODktZjA4MS00NTYxLTlkNTEtNjZiODdiNzcwYTA4` // 模拟5200的cookie

            const url = '/api/dev/main/v1.0/metadatas/load?metadataFullPath=' + metadataPath;

            axios.get(url).then((response) => {

                const formSchema = JSON.parse(response.data.content).Contents;

                new FormMetadataConverter().convertDesignerMetadata(formSchema);
                console.log(formSchema);
                const formMetadataBasicInfo = omit(response.data, 'content') as MetadataDto;

                useFormSchemaComposition.setFormMetadataBasicInfo(formMetadataBasicInfo);
                useFormSchemaComposition.setFormSchema(formSchema);

                resolve(formSchema);
            });
        });

    }

    return { queryMetadata };
}
