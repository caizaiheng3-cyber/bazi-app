import React from 'react';
import { Form, Input, DatePicker, TimePicker, Radio, Switch, Card, Collapse, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { FocusArea, Gender } from '../../types/bazi';
import { useBaziStore, type InputData } from '../../store/useBaziStore';

const FOCUS_AREAS: Array<{ key: FocusArea; icon: string }> = [
  { key: '事业', icon: '💼' },
  { key: '感情', icon: '❤️' },
  { key: '财运', icon: '🪙' },
  { key: '健康', icon: '💊' },
  { key: '学业', icon: '📚' },
  { key: '人际', icon: '👥' },
];
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

interface FormValues {
  name?: string;
  gender: Gender;
  birthDate: Dayjs;
  timeMode: 'precise' | 'shichen';
  birthTime?: Dayjs;
  shiChen?: string;
  birthPlace?: string;
  focusAreas: FocusArea[];
  useTrueSolarTime: boolean;
  ziShiSchool: 'early' | 'late';
}

interface Props {
  onSubmit: () => void;
}

export const InputForm: React.FC<Props> = ({ onSubmit }) => {
  const [form] = Form.useForm<FormValues>();
  const submit = useBaziStore((s) => s.submit);
  const existingInput = useBaziStore((s) => s.inputData);

  const handleFinish = async (values: FormValues) => {
    const birthTime =
      values.timeMode === 'precise' && values.birthTime
        ? values.birthTime.format('HH:mm')
        : values.shiChen || '12:00';

    const data: InputData = {
      name: values.name || '',
      gender: values.gender,
      birthDate: values.birthDate.format('YYYY-MM-DD'),
      birthTime,
      birthPlace: values.birthPlace || '',
      focusAreas: values.focusAreas,
      useTrueSolarTime: values.useTrueSolarTime,
      ziShiSchool: values.ziShiSchool,
    };
    await submit(data);
    onSubmit();
  };

  return (
    <Card
      styles={{ body: { padding: '36px 40px' } }}
      style={{
        background: 'rgba(255, 255, 255, 0.88)',
        border: '1px solid rgba(212, 200, 168, 0.6)',
        borderRadius: 16,
        maxWidth: 720,
        margin: '0 auto',
        backdropFilter: 'blur(10px)',
        boxShadow:
          '0 2px 8px rgba(58, 47, 36, 0.06), 0 8px 32px rgba(58, 47, 36, 0.08)',
      }}
    >
      <Form
        form={form}
        layout="vertical"
        size="large"
        initialValues={{
          gender: (existingInput?.gender ?? '男') as Gender,
          timeMode: 'precise' as const,
          birthDate: dayjs(existingInput?.birthDate ?? '1993-12-07'),
          birthTime: dayjs(existingInput?.birthTime ?? '06:00', 'HH:mm'),
          focusAreas: (existingInput?.focusAreas ?? ['事业']) as FocusArea[],
          useTrueSolarTime: existingInput?.useTrueSolarTime ?? false,
          ziShiSchool: (existingInput?.ziShiSchool ?? 'early') as 'early' | 'late',
          birthPlace: existingInput?.birthPlace ?? '',
          name: existingInput?.name ?? '蔡蔡',
        }}
        onFinish={handleFinish}
        requiredMark={false}
      >
        {/* 分区：基本信息 */}
        <div className="classic-section-title" style={{ fontSize: 18, marginBottom: 16 }}>
          基 本 信 息
        </div>

        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label="姓名（选填）" name="name">
            <Input placeholder="可不填" prefix={<span style={{ color: 'var(--color-ink-soft)' }}>👤</span>} />
          </Form.Item>
          <Form.Item label="性别" name="gender" rules={[{ required: true }]}>
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="男">♂ 男</Radio.Button>
              <Radio.Button value="女">♀ 女</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </div>

        {/* 分区：出生信息 */}
        <div className="classic-section-title" style={{ fontSize: 18, marginTop: 12, marginBottom: 16 }}>
          出 生 信 息
        </div>

        <Form.Item label="出生日期（公历）" name="birthDate" rules={[{ required: true, message: '请选择出生日期' }]}>
          <DatePicker
            style={{ width: '100%' }}
            placeholder="请选择公历日期"
            format="YYYY-MM-DD"
            disabledDate={(d) => d && (d.isBefore('1900-01-01') || d.isAfter('2100-12-31'))}
          />
        </Form.Item>

        <Form.Item label="出生时间" required>
          <Form.Item name="timeMode" noStyle>
            <Radio.Group buttonStyle="solid" style={{ marginBottom: 12 }}>
              <Radio.Button value="precise">精确时间</Radio.Button>
              <Radio.Button value="shichen">时辰下拉</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item shouldUpdate={(p, c) => p.timeMode !== c.timeMode} noStyle>
            {({ getFieldValue }) =>
              getFieldValue('timeMode') === 'precise' ? (
                <Form.Item name="birthTime" noStyle rules={[{ required: true, message: '请选择出生时间' }]}>
                  <TimePicker style={{ width: '100%' }} format="HH:mm" placeholder="时:分" minuteStep={1} />
                </Form.Item>
              ) : (
                <Form.Item name="shiChen" noStyle rules={[{ required: true, message: '请选择时辰' }]}>
                  <Select placeholder="请选择时辰" options={SHI_CHEN_OPTIONS} />
                </Form.Item>
              )
            }
          </Form.Item>
        </Form.Item>

        <Form.Item label="出生地（选填，用于真太阳时）" name="birthPlace">
          <Input placeholder="例如：浙江杭州" />
        </Form.Item>

        <Form.Item
          label="关心的领域（可多选）"
          name="focusAreas"
          rules={[{ required: true, message: '请至少选择一个领域' }]}
        >
          <FocusAreaGrid />
        </Form.Item>

        <Collapse
          ghost
          items={[
            {
              key: 'advanced',
              label: <span className="text-ink-light">⚙ 高级选项（流派设置）</span>,
              children: (
                <>
                  <Form.Item label="真太阳时修正" name="useTrueSolarTime" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item label="子时流派" name="ziShiSchool">
                    <Radio.Group>
                      <Radio value="early">早子时换日（默认）</Radio>
                      <Radio value="late">不换日（全归当日）</Radio>
                    </Radio.Group>
                  </Form.Item>
                </>
              ),
            },
          ]}
        />

        <Form.Item style={{ marginTop: 28, marginBottom: 0 }}>
          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              height: 56,
              background: 'linear-gradient(135deg, #b8372f 0%, #9a2a24 100%)',
              color: '#fff7e6',
              border: 'none',
              borderRadius: 10,
              fontSize: 20,
              fontFamily: '"Noto Serif SC", "Songti SC", serif',
              fontWeight: 600,
              letterSpacing: '0.3em',
              cursor: 'pointer',
              boxShadow:
                '0 2px 8px rgba(184, 55, 47, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            }}
          >
            <span style={{ fontSize: 22 }}>☯</span>
            <span>开启命盘推演</span>
          </button>
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: '#8a7a66',
              marginTop: 8,
              letterSpacing: '0.15em',
            }}
          >
            约需 3 秒 · 不保存个人信息
          </div>
        </Form.Item>
      </Form>
    </Card>
  );
};

/** 3×2 兴趣标签卡片网格（对标设计稿的大方块选中态） */
const FocusAreaGrid: React.FC<{
  value?: FocusArea[];
  onChange?: (v: FocusArea[]) => void;
}> = ({ value = [], onChange }) => {
  const toggle = (key: FocusArea) => {
    const next = value.includes(key)
      ? value.filter((k) => k !== key)
      : [...value, key];
    onChange?.(next);
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
      }}
    >
      {FOCUS_AREAS.map((area) => {
        const selected = value.includes(area.key);
        return (
          <button
            key={area.key}
            type="button"
            onClick={() => toggle(area.key)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 52,
              borderRadius: 10,
              border: selected
                ? '2px solid #b8372f'
                : '1px solid rgba(212, 200, 168, 0.7)',
              background: selected
                ? 'rgba(184, 55, 47, 0.05)'
                : 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              fontSize: 16,
              fontFamily: '"Noto Serif SC", "Songti SC", serif',
              color: selected ? '#b8372f' : '#3a2f24',
              fontWeight: selected ? 600 : 400,
              letterSpacing: '0.1em',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: 18 }}>{area.icon}</span>
            <span>{area.key}</span>
            {/* 选中状态：右上角红色勾 */}
            {selected && (
              <span
                style={{
                  position: 'absolute',
                  top: -1,
                  right: -1,
                  width: 22,
                  height: 22,
                  background: '#b8372f',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0 8px 0 8px',
                }}
              >
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
