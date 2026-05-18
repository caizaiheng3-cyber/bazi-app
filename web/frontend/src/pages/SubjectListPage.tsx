import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { subjectsApi, type Subject } from "../lib/api";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  "未生成": { label: "待生成", color: "var(--text-secondary)" },
  "生成中": { label: "生成中", color: "var(--warning)" },
  "已生成": { label: "已完成", color: "var(--success)" },
  "生成失败": { label: "失败", color: "var(--error)" },
};

export default function SubjectListPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subjectsApi.list().then(({ data }) => {
      setSubjects(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>命主列表</h1>
        <button
          onClick={() => navigate("/subjects/new")}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: "var(--accent)" }}
        >
          + 新增
        </button>
      </div>

      {loading ? (
        <p className="text-center py-12" style={{ color: "var(--text-secondary)" }}>加载中...</p>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg mb-2" style={{ color: "var(--text-secondary)" }}>还没有命主</p>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>点击上方 + 新增按钮开始</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((subject) => {
            const status = STATUS_MAP[subject.report_status] || STATUS_MAP["未生成"];
            return (
              <div
                key={subject.id}
                onClick={() => navigate(`/subjects/${subject.id}`)}
                className="p-4 rounded-lg border cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{subject.name}</span>
                    <span className="text-sm ml-2" style={{ color: "var(--text-secondary)" }}>
                      {subject.gender} · {subject.birth_date}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded" style={{ color: status.color }}>
                    {status.label}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {subject.birth_city} · {subject.calendar_type} {subject.birth_time}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
