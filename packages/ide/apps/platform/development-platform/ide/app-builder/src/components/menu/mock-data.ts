import { MenuTask } from "./type";

export const mockMenuTask = [
    {
        name: '咖啡点单',
        menuCode: 'CoffeeOrder',
        pageFlow: 'coffeeOrderPageFlow',
        customJS: 'const menuItems=[\n  { name: "咖啡点单", link: "#CoffeeOrder" }\n]'
    }
] as MenuTask[];
