/**
 * 货币汇率配置
 * 默认汇率: 1 USD = 7.24 CNY (更新日期: 2025-01-01)
 * 修改 USD_TO_CNY_RATE 即可更新汇率
 */

// 静态汇率：1 美元 = ? 人民币
export const USD_TO_CNY_RATE = 7.24;

/**
 * 将美元金额格式化为人民币显示
 * @param usd - 美元金额
 * @returns 格式化的人民币字符串，如 "¥5.20" 或 "<¥0.01"
 */
export function formatCost(usd: number): string {
  if (usd <= 0) return "¥0";
  const cny = usd * USD_TO_CNY_RATE;
  if (cny < 0.01) return "<¥0.01";
  if (cny >= 100) return `¥${cny.toFixed(0)}`;
  if (cny >= 10) return `¥${cny.toFixed(1)}`;
  return `¥${cny.toFixed(2)}`;
}
