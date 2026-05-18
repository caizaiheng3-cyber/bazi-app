import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../lib/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await authApi.login(password);
      localStorage.setItem("token", data.token);
      navigate("/subjects");
    } catch {
      setError("密码错误，请重试");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-2" style={{ color: "var(--text-primary)" }}>
          我命由天挺好的
        </h1>
        <p className="text-sm text-center mb-8" style={{ color: "var(--text-secondary)" }}>
          AI 命理工作台
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="请输入访问密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition-colors focus:border-[var(--accent)]"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            autoFocus
          />
          {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {loading ? "验证中..." : "进入"}
          </button>
        </form>
      </div>
    </div>
  );
}
