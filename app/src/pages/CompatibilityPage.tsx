import React, { useState, useMemo } from 'react';
import { Form, Input, DatePicker, Select, Radio, Button, Card } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Link } from 'react-router-dom';
import type { BaziChart, Gender, FocusArea } from '../types/bazi';
import { analyzeCompatibility } from '../engine/compatibilityAnalyzer';
import type { InputData } from '../store/useBaziStore';
import { useBaziStore } from '../store/useBaziStore';
import { fetchPaipan } from '../engine/apiClient';
import { adaptEngineResponse } from '../engine/apiAdapter';

const SHI_CHEN_OPTIONS = [
  { label: '子时（23:00-01:00）', value: '00:00' },
  { label: '丑时（01:00-03:00）', value: '02:00' },
  { label: '寅时（03:00-05:00）', value: '04:00' },
  { label: '卯时（05:00-07:00）', value: '06:00' },
  { label: '辰时（07:00-09:00）', value: '08:00' },
  { label: '巳时（09:00-11:00）', value: '10:00' },
  { label: '午时（11:00-13:00）', value: '12:00' },
  { label: '未时（13:00-15:00）', value: '14:00' },
  { label: '申时（15:00-17:00）', value: '16:00' },
  { label: '酉时（17:00-19:00）', value: '18:00' },
  { label: '戌时（19:00-21:00）', value: '20:00' },
  { label: '亥时（21:00-23:00）', value: '22:00' },
];

interface PartyForm {
  name: string;
  gender: Gender;
  birthDate: Dayjs;
  shiChen: string;
}

const formToInputData = (f: PartyForm): InputData => ({
  name: f.name || '匿名',
  gender: f.gender,
  birthDate: f.birthDate.format('YYYY-MM-DD'),
  birthTime: f.shiChen,
  birthPlace: '',
  focusAreas: ['感情'] as FocusArea[],
  useTrueSolarTime: false,
  ziShiSchool: 'early',
});

export const CompatibilityPage: React.FC = () => {
  const [manForm] = Form.useForm<PartyForm>();
  const [womanForm] = Form.useForm<PartyForm>();
  const existingChart = useBaziStore((s) => s.baziChart);
  const existingInput = useBaziStore((s) => s.inputData);

  const [manChart, setManChart] = useState<BaziChart | null>(null);
  const [womanChart, setWomanChart] = useState<BaziChart | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 默认带入当前用户作为男方/女方（按性别）
  const defaultMan: Partial<PartyForm> | undefined = useMemo(() => {
    if (existingInput && existingInput.gender === '男') {
      return {
        name: existingInput.name,
        gender: '男',
        birthDate: dayjs(existingInput.birthDate),
        shiChen: existingInput.birthTime || '12:00',
      };
    }
    return { gender: '男', birthDate: dayjs('1990-01-01'), shiChen: '12:00' };
  }, [existingInput]);
  const defaultWoman: Partial<PartyForm> | undefined = useMemo(() => {
    if (existingInput && existingInput.gender === '女') {
      return {
        name: existingInput.name,
        gender: '女',
        birthDate: dayjs(existingInput.birthDate),
        shiChen: existingInput.birthTime || '12:00',
      };
    }
    return { gender: '女', birthDate: dayjs('1992-01-01'), shiChen: '12:00' };
  }, [existingInput]);

  const handleAnalyze = () => {
    setErrorMsg('');
    Promise.all([manForm.validateFields(), womanForm.validateFields()])
      .then(async ([m, w]) => {
        try {
          const manInput = formToInputData(m);
          const womanInput = formToInputData(w);
          const [manResponse, womanResponse] = await Promise.all([
            fetchPaipan({ name: manInput.name, gender: manInput.gender, birth_date: manInput.birthDate, birth_time: manInput.birthTime, birth_city: manInput.birthPlace }),
            fetchPaipan({ name: womanInput.name, gender: womanInput.gender, birth_date: womanInput.birthDate, birth_time: womanInput.birthTime, birth_city: womanInput.birthPlace }),
          ]);
          setManChart(adaptEngineResponse(manResponse, manInput));
          setWomanChart(adaptEngineResponse(womanResponse, womanInput));
        } catch (e) {
          setErrorMsg(`排盘服务调用失败：${(e as Error).message}。请确认后端已启动。`);
        }
      })
      .catch(() => setErrorMsg('请完善双方出生信息'));
  };

  const useExisting = (party: 'man' | 'woman') => {
    if (!existingChart || !existingInput) return;
    const f = {
      name: existingInput.name,
      gender: existingInput.gender,
      birthDate: dayjs(existingInput.birthDate),
      shiChen: existingInput.birthTime || '12:00',
    };
    if (party === 'man') manForm.setFieldsValue(f);
    else womanForm.setFieldsValue(f);
  };

  const compat = manChart && womanChart ? analyzeCompatibility(manChart, womanChart) : null;

  return (
    <div className="min-h-screen p-6" style={{ background: '#F5EFE0' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold" style={{ color: '#3D2E1A' }}>八字合婚 · 双方命盘对比</h1>
          <Link to="/dashboard" className="text-sm" style={{ color: '#8B6F0E' }}>← 返回主页</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Card title="男方信息" extra={existingChart && existingInput?.gender === '男' && <Button type="link" size="small" onClick={() => useExisting('man')}>使用我的命盘</Button>}>
            <Form form={manForm} layout="vertical" initialValues={defaultMan}>
              <Form.Item label="姓名（选填）" name="name"><Input placeholder="如：张三" /></Form.Item>
              <Form.Item label="性别" name="gender" rules={[{ required: true }]}>
                <Radio.Group><Radio.Button value="男">男</Radio.Button><Radio.Button value="女">女</Radio.Button></Radio.Group>
              </Form.Item>
              <Form.Item label="出生日期" name="birthDate" rules={[{ required: true, message: '请选择日期' }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
              <Form.Item label="出生时辰" name="shiChen" rules={[{ required: true }]}>
                <Select options={SHI_CHEN_OPTIONS} />
              </Form.Item>
            </Form>
          </Card>

          <Card title="女方信息" extra={existingChart && existingInput?.gender === '女' && <Button type="link" size="small" onClick={() => useExisting('woman')}>使用我的命盘</Button>}>
            <Form form={womanForm} layout="vertical" initialValues={defaultWoman}>
              <Form.Item label="姓名（选填）" name="name"><Input placeholder="如：李四" /></Form.Item>
              <Form.Item label="性别" name="gender" rules={[{ required: true }]}>
                <Radio.Group><Radio.Button value="男">男</Radio.Button><Radio.Button value="女">女</Radio.Button></Radio.Group>
              </Form.Item>
              <Form.Item label="出生日期" name="birthDate" rules={[{ required: true, message: '请选择日期' }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
              <Form.Item label="出生时辰" name="shiChen" rules={[{ required: true }]}>
                <Select options={SHI_CHEN_OPTIONS} />
              </Form.Item>
            </Form>
          </Card>
        </div>

        <div className="text-center mb-6">
          <Button type="primary" size="large" onClick={handleAnalyze} style={{ background: '#C5392F', borderColor: '#C5392F', minWidth: 200 }}>
            开始合婚分析
          </Button>
          {errorMsg && <div className="mt-3 text-sm" style={{ color: '#C5392F' }}>{errorMsg}</div>}
        </div>

        {compat && (
          <Card title={`合婚结果：${compat.overallLabel}（${compat.totalScore}分/100）`} className="mb-4">
            <div className="mb-4 text-center">
              <div className="text-4xl font-bold mb-2" style={{ color: compat.totalScore >= 75 ? '#6B8E23' : compat.totalScore >= 60 ? '#B8860B' : compat.totalScore >= 45 ? '#D97A1F' : '#C5392F' }}>
                {compat.totalScore}<span className="text-base ml-1" style={{ color: '#8B7355' }}>/ 100</span>
              </div>
              <div className="text-lg" style={{ color: '#3D2E1A' }}>{compat.overallLabel}</div>
              <div className="text-sm mt-1" style={{ color: '#8B6F0E' }}>缘分类型：{compat.affinityType}</div>
            </div>

            <div className="text-sm leading-relaxed p-3 rounded mb-4" style={{ background: 'rgba(184,134,11,0.06)', color: '#3D2E1A' }}>
              {compat.summary}
            </div>

            <div className="mb-4">
              <div className="text-sm font-semibold mb-3" style={{ color: '#5A5651' }}>· 五维度评分明细</div>
              <div className="space-y-2">
                {compat.scores.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm" style={{ color: '#3D2E1A' }}>{s.dimension}</span>
                      <span className="text-sm font-mono" style={{ color: s.score >= 7 ? '#6B8E23' : s.score >= 5 ? '#B8860B' : '#C5392F' }}>{s.score}/{s.maxScore}</span>
                    </div>
                    <div className="h-2 rounded" style={{ background: 'rgba(160,147,125,0.15)' }}>
                      <div className="h-full rounded" style={{ width: `${(s.score / s.maxScore) * 100}%`, background: s.score >= 7 ? '#6B8E23' : s.score >= 5 ? '#B8860B' : '#C5392F' }} />
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#8B7355' }}>{s.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-sm font-semibold mb-2" style={{ color: '#6B8E23' }}>优势</div>
                <ul className="text-sm space-y-1" style={{ color: '#3D2E1A' }}>
                  {compat.highlights.map((h, i) => <li key={i}>· {h}</li>)}
                </ul>
              </div>
              <div>
                <div className="text-sm font-semibold mb-2" style={{ color: '#C5392F' }}>关注</div>
                <ul className="text-sm space-y-1" style={{ color: '#3D2E1A' }}>
                  {compat.reminders.map((r, i) => <li key={i}>· {r}</li>)}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-3" style={{ borderTop: '1px solid rgba(160,147,125,0.2)', color: '#8B7355' }}>
              <div>男方：{compat.manSummary.ganZhi}（日主：{compat.manSummary.dayMaster}）</div>
              <div>女方：{compat.womanSummary.ganZhi}（日主：{compat.womanSummary.dayMaster}）</div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
