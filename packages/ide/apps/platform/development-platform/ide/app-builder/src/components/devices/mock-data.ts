import { DevicesTask } from "./type";

export const mockDevicesTasks = [
  {
    id: 1,
    icon: "https://example.com/coffee-machine.png",
    name: "智能咖啡机A",
    type: "物理楼咖啡机",
    group: "物理楼咖啡机",
    status: "已启用",
  },
  {
    id: 2,
    icon: "https://example.com/air-conditioner.png",
    name: "智能空调B",
    type: "物理楼咖啡机",
    group: "物理楼咖啡机",
    status: "已启用",
  },
  {
    id: 3,
    icon: "https://example.com/smart-tv.png",
    name: "智能电视A",
    type: "物理楼咖啡机",
    group: "物理楼咖啡机",
    status: "未启用",
  }
] as any[];
