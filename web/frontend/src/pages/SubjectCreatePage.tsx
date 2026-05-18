import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { subjectsApi } from "../lib/api";

export default function SubjectCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    gender: "男",
    birth_date: "",
    birth_time: "12:00",
    calendar_type: "公历",
    birth_city: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.birth_date || !form.birth_city) {
      setError("请填写姓名、出生日期和出生城市");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await subjectsApi.create(form);
      navigate("/subjects/" + data.id);
    } catch (err: any) {
      setError(err.response?.data?.detail || "创建失败");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = "w-full px-4 py-3 rounded-lg border text-sm outline-none transition-colors focus:border-[var(--accent)]";

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate("/subjects")} className="mr-3 text-lg" style={{ color: "var(--text-secondary)" }}>
          ←
        </button>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>新增命主</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>姓名</label>
          <input className={inputStyle} style={{ borderColor: "var(--border)" }} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="请输入姓名" />
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>性别</label>
          <div className="flex gap-3">
            {["男", "女"].map((g) => (
              <button key={g} type="button" onClick={() => update("gender", g)}
                className={"flex-1 py-3 rounded-lg border text-sm transition-colors " + (form.gender === g ? "text-white" : "")}
                style={{ borderColor: form.gender === g ? "var(--accent)" : "var(--border)", backgroundColor: form.gender === g ? "var(--accent)" : "transparent" }}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>历法</label>
          <div className="flex gap-3">
            {["公历", "农历"].map((c) => (
              <button key={c} type="button" onClick={() => update("calendar_type", c)}
                className={"flex-1 py-3 rounded-lg border text-sm transition-colors " + (form.calendar_type === c ? "text-white" : "")}
                style={{ borderColor: form.calendar_type === c ? "var(--accent)" : "var(--border)", backgroundColor: form.calendar_type === c ? "var(--accent)" : "transparent" }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>出生日期</label>
          <input type="date" className={inputStyle} style={{ borderColor: "var(--border)" }} value={form.birth_date} onChange={(e) => update("birth_date", e.target.value)} />
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>出生时间</label>
          <input type="time" className={inputStyle} style={{ borderColor: "var(--border)" }} value={form.birth_time} onChange={(e) => update("birth_time", e.target.value)} />
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>出生城市</label>
          <input className={inputStyle} style={{ borderColor: "var(--border)" }} value={form.birth_city} onChange={(e) => update("birth_city", e.target.value)} placeholder="如：杭州" />
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>备注（可选）</label>
          <textarea className={inputStyle + " resize-none"} style={{ borderColor: "var(--border)" }} rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="职业、关注方向等" />
        </div>

        {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}>
          {loading ? "创建中..." : "创建命主"}
        </button>
      </form>
    </div>
  );
}
