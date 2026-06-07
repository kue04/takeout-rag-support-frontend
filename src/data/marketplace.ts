export type DishCategory = "招牌" | "主食" | "小吃" | "饮品";

export type Dish = {
  id: string;
  storeId: string;
  name: string;
  category: DishCategory;
  description: string;
  price: number;
  monthlySales: number;
  image: string;
};

export type Store = {
  id: string;
  name: string;
  cover: string;
  rating: number;
  deliveryMinutes: number;
  deliveryFee: number;
  minOrder: number;
  tags: string[];
  notice: string;
};

export type OrderStatus = "paid" | "preparing" | "delivering" | "delivered";

export type OrderItem = {
  dishId: string;
  name: string;
  quantity: number;
  price: number;
};

export type TakeoutOrder = {
  id: string;
  storeId: string;
  storeName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  deliveryStatus: string;
  address: string;
  createdAt: string;
};

export const stores: Store[] = [
  {
    id: "green-bowl",
    name: "青禾轻食便当",
    cover: "https://picsum.photos/seed/healthy-bento/1200/800",
    rating: 4.8,
    deliveryMinutes: 28,
    deliveryFee: 3,
    minOrder: 18,
    tags: ["轻食", "准时宝", "高复购"],
    notice: "高峰期骑手接单可能延迟，支持订单页联系客服查询进度。",
  },
  {
    id: "noodle-lab",
    name: "面档研究所",
    cover: "https://picsum.photos/seed/noodle-shop/1200/800",
    rating: 4.7,
    deliveryMinutes: 34,
    deliveryFee: 4,
    minOrder: 20,
    tags: ["热汤面", "满减", "夜宵"],
    notice: "汤面默认分装，收到后请尽快食用。",
  },
  {
    id: "rice-station",
    name: "稻香现炒饭站",
    cover: "https://picsum.photos/seed/rice-station/1200/800",
    rating: 4.6,
    deliveryMinutes: 31,
    deliveryFee: 2.5,
    minOrder: 16,
    tags: ["现炒", "工作餐", "优惠券"],
    notice: "如遇漏送或错送，请在订单详情联系平台客服。",
  },
];

export const dishes: Dish[] = [
  {
    id: "bowl-chicken",
    storeId: "green-bowl",
    name: "香煎鸡胸能量碗",
    category: "招牌",
    description: "鸡胸、藜麦、玉米、温泉蛋和低脂酱汁。",
    price: 32,
    monthlySales: 1240,
    image: "https://picsum.photos/seed/chicken-bowl/800/800",
  },
  {
    id: "bowl-beef",
    storeId: "green-bowl",
    name: "黑椒牛肉糙米饭",
    category: "主食",
    description: "糙米饭搭配黑椒牛肉和时蔬，饱腹不腻。",
    price: 36,
    monthlySales: 986,
    image: "https://picsum.photos/seed/beef-rice/800/800",
  },
  {
    id: "snack-potato",
    storeId: "green-bowl",
    name: "海盐烤土豆",
    category: "小吃",
    description: "小份热食，适合加购。",
    price: 9,
    monthlySales: 612,
    image: "https://picsum.photos/seed/roasted-potato/800/800",
  },
  {
    id: "drink-tea",
    storeId: "green-bowl",
    name: "无糖乌龙茶",
    category: "饮品",
    description: "去油解腻，冷藏出杯。",
    price: 7,
    monthlySales: 1308,
    image: "https://picsum.photos/seed/oolong-tea/800/800",
  },
  {
    id: "noodle-beef",
    storeId: "noodle-lab",
    name: "红烧牛肉面",
    category: "招牌",
    description: "牛腱肉、浓汤和手工宽面。",
    price: 29,
    monthlySales: 1540,
    image: "https://picsum.photos/seed/beef-noodle/800/800",
  },
  {
    id: "noodle-dry",
    storeId: "noodle-lab",
    name: "葱油拌面",
    category: "主食",
    description: "葱香酱汁，面条劲道，配送更稳定。",
    price: 18,
    monthlySales: 890,
    image: "https://picsum.photos/seed/scallion-noodle/800/800",
  },
  {
    id: "rice-pork",
    storeId: "rice-station",
    name: "鱼香肉丝盖饭",
    category: "招牌",
    description: "现炒肉丝配米饭，酸甜微辣。",
    price: 24,
    monthlySales: 1122,
    image: "https://picsum.photos/seed/pork-rice/800/800",
  },
  {
    id: "rice-egg",
    storeId: "rice-station",
    name: "番茄炒蛋饭",
    category: "主食",
    description: "经典家常口味，适合工作餐。",
    price: 19,
    monthlySales: 1405,
    image: "https://picsum.photos/seed/tomato-egg-rice/800/800",
  },
];

export const supportQuestions = [
  "会员退款多久到账",
  "配送超时怎么处理",
  "骑手联系不上怎么办",
  "商品少送了怎么办",
  "优惠券不能用怎么办",
];

export const orderSteps: Array<{ key: OrderStatus; label: string }> = [
  { key: "paid", label: "已支付" },
  { key: "preparing", label: "商家备餐" },
  { key: "delivering", label: "骑手配送" },
  { key: "delivered", label: "已送达" },
];
