import { reactive } from 'vue'
import { Domain, Scene, Device, DeviceType, Template } from '@/types/models'

// Mock domain data
export const mockDomains = reactive<Domain[]>([
    {
        id: 1,
        domainName: '智能制造领域',
        description: '面向工业4.0的智能制造解决方案',
        createTime: '2023-10-15',
        updateTime: '2023-11-20',
        sceneCount: 5,
        status: '1'
    },
    {
        id: 2,
        domainName: '智慧城市领域',
        description: '城市数字孪生与智能监控管理平台',
        createTime: '2023-09-22',
        updateTime: '2023-12-05',
        sceneCount: 8,
        status: '1'
    },
    {
        id: 3,
        domainName: '医疗健康领域',
        description: '医疗服务与健康管理数字化平台',
        createTime: '2023-07-30',
        updateTime: '2023-10-12',
        sceneCount: 3,
        status: '1'
    },
    {
        id: 4,
        domainName: '教育科研领域',
        description: '教育资源管理与科研协作平台',
        createTime: '2023-11-05',
        updateTime: '2023-12-18',
        sceneCount: 2,
        status: '0'
    }
])

// Mock scenes data
export const mockScenes = reactive<Scene[]>([
    {
        id: 1,
        domainId: 1,
        name: '车间生产线监控',
        description: '实时监控生产线设备运行状态与产能',
        createTime: '2023-10-20',
        updateTime: '2023-12-01',
        deviceCount: 12,
        status: '1',
        url: '',
        location: {
            lng: 121.4737, // Shanghai coordinates
            lat: 31.2304
        }
    },
    {
        id: 2,
        domainId: 1,
        name: '质量检测分析',
        description: '产品质量自动检测与数据分析',
        createTime: '2023-10-25',
        updateTime: '2023-11-30',
        deviceCount: 8,
        status: '1',
        url: '',
        location: {
            lng: 121.5012,
            lat: 31.2352
        }
    },
    {
        id: 3,
        domainId: 2,
        name: '交通流量监控',
        description: '城市主要道路交通流量实时监控',
        createTime: '2023-09-25',
        updateTime: '2023-12-10',
        deviceCount: 24,
        status: '1',
        url: '',
        location: {
            lng: 116.4074, // Beijing coordinates
            lat: 39.9042
        }
    }
])

// Mock devices data
export const mockDevices = reactive<Device[]>([
    {
        id: 1,
        sceneId: 1,
        deviceCode: 'TemperatureA1',
        deviceName: '温度传感器-A1',
        deviceTypeId: 1,
        status: 1,
        lastOnlineTime: '2023-12-20 14:30:45',
        createTime: '',
        updateTime: '',
        protocolType: 'MQTT',
        protocolConfig: {
            type: "aliyun",
            configs: {}
        },
        deviceLocation: ""
    },
    {
        id: 2,
        sceneId: 1,
        deviceCode: 'PressureP1',
        deviceName: '压力监测器-P2',
        deviceTypeId: 1,
        status: 1,
        lastOnlineTime: '2023-12-20 14:35:22',
        createTime: '',
        updateTime: '',
        protocolType: 'MQTT',
        protocolConfig: {
            type: "none",
            configs: {}
        },
        deviceLocation: ""
    }
])

// Mock deviceTypeData
export const mockDeviceTypes = reactive<DeviceType[]>([
    {
        id: 1,
        code: "CoffeeMaker",
        name: "智能咖啡机",
        description: "智能咖啡机能够自动制作多种咖啡",
        createTime: "2023-12-20 14:30:45",
        updateTime: '',
        domainIds: [1],
        model: {
            properties: [
                {
                    identify: "water",
                    name: "水量",
                    accessMode: "rw",
                    dataType: {
                        type: "float",
                        specs: {
                            "min": 0,
                            "max": 100
                        }
                    }
                }
            ],
            services: [
                {
                    identify: "makeCoffee",
                    name: "制作咖啡",
                    inputData: [
                        {
                            identify: "coffeeType",
                            name: "咖啡类型",
                            dataType: {
                                type: "string",
                                specs: {
                                    "length": 200
                                }
                            }
                        }
                    ],
                    outputData: []
                }
            ],
            events: [
                {
                    identify: "makeCoffeeReply",
                    name: "咖啡制作完成",
                    type: "info",
                    outputData: [
                        {
                            identify: "message",
                            name: "消息",
                            dataType: {
                                type: "string",
                                specs: {
                                    "length": 200
                                }
                            }
                        }
                    ]
                }
            ]
        }
    },
    {
        id: 2,
        code: "SmokeDetector",
        name: "烟感器",
        description: "能够检测烟雾浓度",
        createTime: "2024-12-20 14:30:45",
        updateTime: '',
        model: {
            properties: [
                {
                    identify: "deviceStatus",
                    name: "状态",
                    accessMode: "rw",
                    dataType: {
                        type: "string",
                        specs: {
                            "length": 200
                        }
                    }
                }
            ],
            services: [],
            events: []
        }
    }
])

// Mock users data
export const mockUsers = reactive([
    {
        id: 1,
        username: 'admin',
        password: '123456', // Note: In real app, passwords should never be stored in plaintext
        displayName: '管理员',
        role: 'admin',
        avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'
    },
    {
        id: 2,
        username: 'user',
        password: '123456',
        displayName: '普通用户',
        role: 'user',
        avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'
    }
])

// Mock templates
export const mockTemplates = reactive<Template[]>([
    {
        id: 1746,
        template_id: 1746,
        name: "b-grid-equal-width-multiple-lines",
        category: "组件模板",
        description: "此Vue组件使用了BootstrapVue库中的b-container和b-row元素来创建一个具有响应式布局的页面容器。它通过嵌套的b-col元素实现了多行等宽列布局，每一行内的所有列宽度相等。\n该模板适用于需要实现网页内容合理分栏展示、特别是当屏幕尺寸变化时能够自动调整布局的应用场景中。例如，在开发新闻网站、博客平台或是任何其他类型的需要动态适应不同设备显示效果的Web应用时都非常有用。\n",
        tags: "BootstrapVue,响应式布局,栅格系统",
        domain: "Web开发,前端UI设计,项目布局规划",
        describing_the_model: "Vue",
        image_url: "https://ddst.sjtu.edu.cn/lctemplate/vue/screenshots/bgridequalwidthmultiplelinesvue.png",
        url: "http://lctemplates.gitlink.org.cn/templates/1746.json",
    },
    {
        id: 1627,
        template_id: 1627,
        name: "b-grid-align-self",
        category: "组件模板",
        description: "- 使用Bootstrap的响应式网格系统来布局页面元素。\n- 包含多行多列的布局，展示不同对齐属性（start, center, end, baseline, stretch）的效果。\n- 适用于需要灵活调整内容对齐方式和布局需求的应用场景。\n",
        tags: "Vue组件,响应式布局,网格系统,对齐方式",
        domain: "网页设计, 用户界面开发, 前端开发",
        describing_the_model: "Vue",
        image_url: "https://ddst.sjtu.edu.cn/lctemplate/vue/screenshots/bgridalignselfvue.png",
        url: "http://lctemplates.gitlink.org.cn/templates/1627.json",
    },
])
