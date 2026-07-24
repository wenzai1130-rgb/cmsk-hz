// 深圳公司住宅项目分析 - 数据来源：《招商蛇口-深圳-项目信息-20260522.xlsx》"项目清单" sheet
// 字段口径：
//   valuationSalesRatio = cmbValuationPrice / salesFloorPrice (前端重新计算)
//   sellThroughCompetitiveness = snakeSellThroughRate / marketSellThroughRate (前端重新计算)
//   remainingValue / totalValue 单位：亿元（Excel 原始单位为元，已转换）

export interface ShenzhenProjectRaw {
  projectId: string;
  projectName: string;
  district: string;
  street: string;
  businessType: string;
  roomCount: number;
  onSaleRoomCount: number;
  snakeSellThroughRate: number; // 0-1
  salesFloorPrice: number; // 元/㎡
  cmbValuationPrice: number; // 元/㎡
  marketAvgDealPrice: number; // 元/㎡
  marketSellThroughRate: number; // 0-1
  remainingValue: number; // 剩余货值，单位：亿元
  totalValue: number; // 总货值，单位：亿元（暂同 remainingValue）
}

export const shenzhenProjectAnalysisData: ShenzhenProjectRaw[] = [
  { projectId: "SZ001", projectName: "深圳观潮府【A0020108】", district: "宝安区", street: "新安街道", businessType: "住宅", roomCount: 222, onSaleRoomCount: 16, snakeSellThroughRate: 0.93, salesFloorPrice: 139637.87, cmbValuationPrice: 140000, marketAvgDealPrice: 75259.1724042275, marketSellThroughRate: 0.60, remainingValue: 7.16, totalValue: 7.16 },
  { projectId: "SZ002", projectName: "深圳海晏府【桂湾T2010232】", district: "南山区", street: "南山街道", businessType: "住宅", roomCount: 151, onSaleRoomCount: 35, snakeSellThroughRate: 0.77, salesFloorPrice: 137316.93, cmbValuationPrice: 140000, marketAvgDealPrice: 99659.75038121, marketSellThroughRate: 0.78, remainingValue: 9.26, totalValue: 9.26 },
  { projectId: "SZ003", projectName: "深圳后海玺家园【海湾村】", district: "南山区", street: "招商街道", businessType: "住宅", roomCount: 40, onSaleRoomCount: 4, snakeSellThroughRate: 0.90, salesFloorPrice: 129000.75, cmbValuationPrice: 130000, marketAvgDealPrice: 106809.85477611, marketSellThroughRate: 0.83, remainingValue: 1.17, totalValue: 1.17 },
  { projectId: "SZ004", projectName: "深圳会展湾雍境名邸【A3010602】", district: "宝安区", street: "沙井街道", businessType: "住宅", roomCount: 863, onSaleRoomCount: 486, snakeSellThroughRate: 0.44, salesFloorPrice: 45417.02, cmbValuationPrice: 31000, marketAvgDealPrice: 44229.2407819723, marketSellThroughRate: 0.73, remainingValue: 20.05, totalValue: 20.05 },
  { projectId: "SZ005", projectName: "深圳深圳三联【布吉三联村】", district: "龙岗区", street: "吉华街道", businessType: "住宅", roomCount: 1040, onSaleRoomCount: 10, snakeSellThroughRate: 0.99, salesFloorPrice: 32773.70, cmbValuationPrice: 32000, marketAvgDealPrice: 51244.0281680044, marketSellThroughRate: 0.52, remainingValue: 0.25, totalValue: 0.25 },
  { projectId: "SZ006", projectName: "深圳四海名邸【招商街道】", district: "南山区", street: "招商街道", businessType: "住宅", roomCount: 208, onSaleRoomCount: 2, snakeSellThroughRate: 0.99, salesFloorPrice: 73609.62, cmbValuationPrice: 92700, marketAvgDealPrice: 106809.85477611, marketSellThroughRate: 0.83, remainingValue: 0.16, totalValue: 0.16 },
  { projectId: "SZ007", projectName: "深圳玺悦台【盘松路】", district: "坪山区", street: "龙田街道", businessType: "住宅", roomCount: 1201, onSaleRoomCount: 1, snakeSellThroughRate: 1.00, salesFloorPrice: 47058.82, cmbValuationPrice: 19700, marketAvgDealPrice: 35718.6827827119, marketSellThroughRate: 0.19, remainingValue: 0.95, totalValue: 0.95 },
  { projectId: "SZ009", projectName: "深圳雍云府【九龙山】", district: "龙华区", street: "福城街道", businessType: "住宅", roomCount: 927, onSaleRoomCount: 13, snakeSellThroughRate: 0.99, salesFloorPrice: 35033.62, cmbValuationPrice: 32000, marketAvgDealPrice: 36395.9090133333, marketSellThroughRate: 0.23, remainingValue: 0.35, totalValue: 0.35 },
  // 关注区示例：去化竞争力偏弱、售估比接近基准 → ops_improvement (concern)
  { projectId: "SZ010", projectName: "深圳龙岗云庭【坂田新雪岗】", district: "龙岗区", street: "坂田街道", businessType: "住宅", roomCount: 680, onSaleRoomCount: 320, snakeSellThroughRate: 0.30, salesFloorPrice: 62000, cmbValuationPrice: 62000, marketAvgDealPrice: 58000, marketSellThroughRate: 0.80, remainingValue: 12.40, totalValue: 12.40 },
  // 异常示例：中介估值缺失（cmbValuationPrice = 0）
  { projectId: "SZ011", projectName: "深圳鸿运华府【光明凤凰城】", district: "光明区", street: "凤凰街道", businessType: "住宅", roomCount: 540, onSaleRoomCount: 260, snakeSellThroughRate: 0.55, salesFloorPrice: 58000, cmbValuationPrice: 0, marketAvgDealPrice: 52000, marketSellThroughRate: 0.62, remainingValue: 8.30, totalValue: 8.30 },
  // 异常示例：市场去化率缺失（marketSellThroughRate = 0）
  { projectId: "SZ012", projectName: "深圳前海壹方【前海桂湾】", district: "南山区", street: "前海街道", businessType: "住宅", roomCount: 420, onSaleRoomCount: 180, snakeSellThroughRate: 0.72, salesFloorPrice: 128000, cmbValuationPrice: 130000, marketAvgDealPrice: 0, marketSellThroughRate: 0, remainingValue: 15.60, totalValue: 15.60 },
];
