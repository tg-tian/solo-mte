import { Ref, ref } from "vue";
import { UseDomain } from "./types";
import axios from "axios";

export function useDomain(): UseDomain {
    const domainSourceUri = './assets/domains.json';
    const domains: Ref<Record<string, any>[]> = ref([]);

    // const domains = ref([
    //     { id: '1', title: '智慧矿山', color: '', icon: 'f-icon f-icon-engineering', path: '/domain/smart-mine', creater: 'user01', status: 'testing', description: '智慧矿山是以矿山数字化、信息化为前提和基础，对矿山生产、职业健康与安全、技术支持与后勤保障等进行主动感知、自动分析、快速处理，建设形成的安全、无人、高效、清洁的矿山。' },
    //     { id: '2', title: '智慧楼宇', color: '#4D98FF', icon: 'f-icon f-icon-engineering', path: '/domain/smart-buildings', creater: 'user01', status: 'testing', description: '智慧楼宇是将建筑、通信、计算机和控制等各方面的先进科技相互融合，能够适应信息化社会发展需求的现代化新型建筑。' },
    //     { id: '3', title: '智能制造', color: '#FF7B51', icon: 'f-icon f-icon-engineering', path: '/domain/smart-manufacturing', creater: 'user01', status: 'published', description: '智能制造一种由智能机器和人类专家共同组成的人机一体化智能系统，它在制造过程中能进行智能活动，诸如分析、推理、判断、构思和决策等。' },
    //     { id: '4', title: '智慧物流', color: '#B59EFF', icon: 'f-icon f-icon-engineering', path: '/domain/smart-logistics', creater: 'user01', status: 'editing', description: '智慧物流是通过智能软硬件、物联网、大数据等智慧化技术手段，实现物流各环节精细化、动态化、可视化管理，提高物流系统智能化分析决策和自动化操作执行能力，提升物流运作效率的现代化物流模式。' },
    //     { id: '5', title: '城市应急', color: '#FF7B51', icon: 'f-icon f-icon-engineering', path: '/domain/urban-emergency', creater: 'user01', status: 'testing', description: '城市应急机制是指在应对突发事件中，对政府行政权力进行应急配置而形成的权力运行机制。' },
    //     { id: '6', title: '智慧园区', color: '#B59EFF', icon: 'f-icon f-icon-engineering', path: '/domain/smart-parks', creater: 'user01', status: 'testing', description: '智慧园区平台主要包含三大模块：智能化应用系统、绿色节能管理和政务办公服务平台。' },
    //     { id: '7', title: '智慧水务', color: '#30c87b', icon: 'f-icon f-icon-engineering', path: '/domain/smart-water-plant', creater: 'user01', status: 'published', description: '智慧水务是通过新一代信息技术与水务技术的深度融合，充分发掘数据价值和逻辑关系，实现水务业务系统的控制智能化、数据资源化、管理精确化、决策智慧化' },
    //     { id: '8', title: '智能粮库', color: '#4D98FF', icon: 'f-icon f-icon-engineering', path: '/domain/smart-grain-depot', creater: 'user01', status: 'editing', description: '智能粮库' },
    //     { id: '9', title: '智慧车间', color: '#4D98FF', icon: 'f-icon f-icon-engineering', path: '/domain/smart-workshop', creater: 'user01', status: 'testing', description: '智慧车间' },
    //     { id: '10', title: '鱼菜共生', color: '#30c87b', icon: 'f-icon f-icon-engineering', path: '/domain/aquaponics', creater: 'user01', status: 'testing', description: '鱼菜共生' },
    //     { id: '11', title: '钻井平台', color: '#4D98FF', icon: 'f-icon f-icon-engineering', path: '/domain/drilling-rigs', creater: 'user01', status: 'published', description: '钻井平台' },
    // ]);

    function createDomain() { }

    function getDomains() {
        return new Promise<any[]>((resolve, reject) => {
            axios.get(domainSourceUri).then((response) => {
                const domainData = response.data;
                domains.value = domainData;
                resolve(domainData);
            }, (error) => {
                resolve([]);
            });
        });
    }

    return { createDomain, domains, getDomains };
}
