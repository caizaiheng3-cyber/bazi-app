// 规则加载器：使用 Vite 静态 JSON import（浏览器兼容）
import wangShuaiRulesData from './rules/wangShuaiRules.json';
import yongShenRulesData from './rules/yongShenRules.json';
import geJuRulesData from './rules/geJuRules.json';
import shenShaRulesData from './rules/shenShaRules.json';
import shifuReplyTemplatesData from './rules/shifuReplyTemplates.json';
import consumerReportRulesData from './rules/consumerReportRules.json';

/**
 * 规则加载器：通过静态 import 加载 JSON 规则文件（兼容浏览器环境）
 */
export class RulesLoader {
  getWangShuaiRules(): any {
    return wangShuaiRulesData;
  }

  getYongShenRules(): any {
    return yongShenRulesData;
  }

  getGeJuRules(): any {
    return geJuRulesData;
  }

  getShenShaRules(): any {
    return shenShaRulesData;
  }

  getShifuReplyTemplates(): any {
    return shifuReplyTemplatesData;
  }

  getConsumerReportRules(): any {
    return consumerReportRulesData;
  }
}

// 单例实例
export const rulesLoader = new RulesLoader();
