import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { subjectsApi, reportsApi, chatApi, type Subject, type Report, type ChatMessageItem } from "../lib/api";

type Tab = "info" | "report" | "chat";

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const subjectId = Number(id);
  const [tab, setTab] = useState<Tab>("info");
  const [subject, setSubject] = useState<Subject | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const refreshSubject = () => subjectsApi.get(subjectId).then(({ data }) => setSubject(data));
  const refreshReport = () => reportsApi.get(subjectId).then(({ data }) => setReport(data)).catch(() => {});

  useEffect(() => { refreshSubject(); refreshReport(); }, [subjectId]);

  useEffect(() => {
    if (tab === "chat") chatApi.getMessages(subjectId).then(({ data }) => setMessages(data.messages));
  }, [tab, subjectId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (report?.status !== "生成中") return;
    const timer = setInterval(() => {
      reportsApi.get(subjectId).then(({ data }) => {
        setReport(data);
        if (data.status !== "生成中") { clearInterval(timer); refreshSubject(); }
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [report?.status, subjectId]);

  const handleGenerate = async () => {
    setReportLoading(true);
    try {
      await reportsApi.generate(subjectId);
      setReport((prev) => prev ? { ...prev, status: "生成中", progress: "排队中" } : prev);
      if (subject) setSubject({ ...subject, report_status: "生成中" });
    } catch (err: any) {
      alert(err.response?.data?.detail || "生成失败");
    } finally { setReportLoading(false); }
  };

  const handleRegenerate = async () => {
    if (!confirm("重新生成将覆盖当前报告，确定？")) return;
    await handleGenerate();
  };

  const handleSend = async () => {
    if (!question.trim() || chatLoading) return;
    const userQuestion = question;
    setQuestion("");
    setChatLoading(true);
    try {
      const { data } = await chatApi.send(subjectId, userQuestion);
      setMessages((prev) => [...prev, { id: Date.now(), subject_id: subjectId, role: "user", content: userQuestion, created_at: "" }, data]);
    } catch (err: any) {
      alert(err.response?.data?.detail || "发送失败");
    } finally { setChatLoading(false); }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm("确定删除这条记录？")) return;
    try {
      await chatApi.deleteMessage(subjectId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch { alert("删除失败"); }
  };

  const handleSaveSubject = async (data: Partial<Subject>) => {
    try {
      const { data: updated } = await subjectsApi.update(subjectId, data);
      setSubject(updated);
      return true;
    } catch (err: any) {
      alert(err.response?.data?.detail || "保存失败，请重试");
      return false;
    }
  };

  if (!subject) return <div className="min-h-screen flex items-center justify-center" style={{ color: "var(--text-secondary)" }}>加载中...</div>;

  const tabClass = (t: Tab) =>
    "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors cursor-pointer " +
    (tab === t ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent");

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col max-w-lg mx-auto">
      <div className="flex items-center px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <button onClick={() => navigate("/subjects")} className="mr-3 text-lg" style={{ color: "var(--text-secondary)" }}>←</button>
        <h1 className="text-lg font-semibold flex-1">{subject.name}</h1>
        <span className="text-xs px-2 py-1 rounded" style={{ color: "var(--text-secondary)" }}>{subject.gender} · {subject.birth_date}</span>
      </div>
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        <div className={tabClass("info")} onClick={() => setTab("info")} style={{ color: tab === "info" ? "var(--accent)" : "var(--text-secondary)" }}>基本信息</div>
        <div className={tabClass("report")} onClick={() => setTab("report")} style={{ color: tab === "report" ? "var(--accent)" : "var(--text-secondary)" }}>命理报告</div>
        <div className={tabClass("chat")} onClick={() => setTab("chat")} style={{ color: tab === "chat" ? "var(--accent)" : "var(--text-secondary)" }}>AI 问答</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "info" && <InfoTab subject={subject} onSave={handleSaveSubject} />}
        {tab === "report" && <ReportTab report={report} loading={reportLoading} onGenerate={handleGenerate} onRegenerate={handleRegenerate} infoUpdated={subject.info_updated_after_report} />}
        {tab === "chat" && <ChatTab messages={messages} question={question} loading={chatLoading} onQuestionChange={setQuestion} onSend={handleSend} chatEndRef={chatEndRef} reportReady={report?.status === "已生成"} onDeleteMessage={handleDeleteMessage} />}
      </div>
    </div>
  );
}


function InfoTab({ subject, onSave }: { subject: Subject; onSave: (data: Partial<Subject>) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: subject.name, gender: subject.gender, birth_date: subject.birth_date,
    birth_time: subject.birth_time, calendar_type: subject.calendar_type,
    birth_city: subject.birth_city, notes: subject.notes,
  });
  const [saving, setSaving] = useState(false);

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name || !form.birth_date) { alert("请填写姓名和出生日期"); return; }
    setSaving(true);
    const success = await onSave(form);
    setSaving(false);
    if (success) setEditing(false);
  };

  const handleCancel = () => {
    setForm({
      name: subject.name, gender: subject.gender, birth_date: subject.birth_date,
      birth_time: subject.birth_time, calendar_type: subject.calendar_type,
      birth_city: subject.birth_city, notes: subject.notes,
    });
    setEditing(false);
  };

  if (!editing) {
    const infoItems = [
      ["姓名", subject.name], ["性别", subject.gender],
      ["历法", subject.calendar_type], ["出生日期", subject.birth_date],
      ["出生时间", subject.birth_time], ["出生城市", subject.birth_city],
      ["备注", subject.notes || "无"],
      ["报告状态", subject.report_status], ["创建时间", subject.created_at],
    ];
    return (
      <div className="p-4">
        {subject.info_updated_after_report && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: "#fef3cd", color: "#856404" }}>
            ⚠️ 信息已更新，建议重新生成报告
          </div>
        )}
        <div className="space-y-3">
          {infoItems.map(([label, value]) => (
            <div key={label} className="flex justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setEditing(true)}
          className="w-full mt-6 py-3 rounded-lg border text-sm font-medium transition-colors"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
          编辑信息
        </button>
      </div>
    );
  }

  const inputStyle = "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[var(--accent)]";
  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>姓名</label>
        <input className={inputStyle} style={{ borderColor: "var(--border)" }} value={form.name} onChange={(e) => update("name", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>性别</label>
        <div className="flex gap-3">
          {["男", "女"].map((g) => (
            <button key={g} type="button" onClick={() => update("gender", g)}
              className={"flex-1 py-2 rounded-lg border text-sm " + (form.gender === g ? "text-white" : "")}
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
              className={"flex-1 py-2 rounded-lg border text-sm " + (form.calendar_type === c ? "text-white" : "")}
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
        <input className={inputStyle} style={{ borderColor: "var(--border)" }} value={form.birth_city} onChange={(e) => update("birth_city", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>备注</label>
        <textarea className={inputStyle + " resize-none"} style={{ borderColor: "var(--border)" }} rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={handleCancel} className="flex-1 py-3 rounded-lg border text-sm" style={{ borderColor: "var(--border)" }}>取消</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-lg text-white text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}>
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}


function ReportTab({ report, loading, onGenerate, onRegenerate, infoUpdated }: {
  report: Report | null; loading: boolean; onGenerate: () => void; onRegenerate: () => void; infoUpdated: boolean;
}) {
  const status = report?.status || "未生成";
  const [reportType, setReportType] = useState<"master" | "consumer" | "wechat" | "html">("html");
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    if (reportType === "html") {
      const htmlContent = report?.html_report;
      if (!htmlContent) return;
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "精读版报告.html";
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    const reportContent = reportType === "master" ? report?.master_report
      : reportType === "consumer" ? report?.consumer_report
      : report?.wechat_report;
    if (!reportContent) return;
    const typeName = reportType === "master" ? "命理师版" : reportType === "consumer" ? "精读决策版" : "微信版";
    const blob = new Blob([reportContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = typeName + "报告.md";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const wechatContent = report?.wechat_report;
    if (!wechatContent) return;
    await navigator.clipboard.writeText(wechatContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === "未生成" || status === "生成失败") {
    return (
      <div className="p-4 text-center py-16">
        {status === "生成失败" && (
          <p className="text-sm mb-4" style={{ color: "var(--error)" }}>上次生成失败：{report?.progress}</p>
        )}
        <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
          {status === "未生成" ? "尚未生成命理报告" : "可以重新生成"}
        </p>
        <button onClick={onGenerate} disabled={loading}
          className="px-6 py-3 rounded-lg text-white text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}>
          {loading ? "请求中..." : "一键生成报告"}
        </button>
      </div>
    );
  }

  if (status === "生成中") {
    return (
      <div className="p-4 text-center py-16">
        <div className="animate-pulse mb-4">
          <div className="w-12 h-12 rounded-full mx-auto mb-4" style={{ backgroundColor: "var(--accent)", opacity: 0.3 }} />
        </div>
        <p className="font-medium mb-2">报告生成中</p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{report?.progress || "处理中..."}</p>
      </div>
    );
  }

  const reportContent = reportType === "master" ? report?.master_report
    : reportType === "consumer" ? report?.consumer_report
    : reportType === "wechat" ? report?.wechat_report : null;

  const tabLabels: Record<string, string> = {
    html: "精读版", consumer: "精读决策版", master: "命理师版", wechat: "微信版",
  };

  return (
    <div className="p-4">
      {infoUpdated && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: "#fef3cd", color: "#856404" }}>
          ⚠️ 信息已更新，建议重新生成报告
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["html", "consumer", "master", "wechat"] as const).map((t) => (
          <button key={t} onClick={() => setReportType(t)}
            className={"px-3 py-1.5 rounded text-xs font-medium transition-colors " + (reportType === t ? "text-white" : "")}
            style={{ backgroundColor: reportType === t ? "var(--accent)" : "var(--bg-secondary)", color: reportType === t ? "white" : "var(--text-secondary)" }}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>生成时间：{report?.generated_at}</p>
        <div className="flex gap-2">
          {reportType === "wechat" && (
            <button onClick={handleCopy} className="px-3 py-1 rounded text-xs border"
              style={{ borderColor: "var(--border)", color: copied ? "var(--success)" : "var(--text-secondary)" }}>
              {copied ? "✓ 已复制" : "复制"}
            </button>
          )}
          <button onClick={handleDownload} className="px-3 py-1 rounded text-xs border"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
            {reportType === "html" ? "下载 .html" : "下载 .md"}
          </button>
          <button onClick={onRegenerate} disabled={loading} className="px-3 py-1 rounded text-xs border"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
            {loading ? "..." : "🔄 重新生成"}
          </button>
        </div>
      </div>

      {reportType === "html" ? (
        report?.html_report ? (
          <iframe
            srcDoc={report.html_report}
            className="w-full rounded-lg border"
            style={{ borderColor: "var(--border)", height: "calc(100vh - 280px)", minHeight: "500px" }}
            sandbox="allow-same-origin"
            title="精读版报告预览"
          />
        ) : (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-secondary)" }}>暂无精读版内容</p>
        )
      ) : (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
          {reportContent || "暂无内容"}
        </div>
      )}
    </div>
  );
}


function ChatTab({ messages, question, loading, onQuestionChange, onSend, chatEndRef, reportReady, onDeleteMessage }: {
  messages: ChatMessageItem[];
  question: string;
  loading: boolean;
  onQuestionChange: (v: string) => void;
  onSend: () => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  reportReady: boolean;
  onDeleteMessage: (id: number) => void;
}) {
  if (!reportReady) {
    return (
      <div className="p-4 text-center py-16">
        <p style={{ color: "var(--text-secondary)" }}>请先生成报告后再使用问答功能</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-sm py-8" style={{ color: "var(--text-secondary)" }}>
            基于命理报告的 AI 问答，试试问："我今年适合跳槽吗？"
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={"group flex " + (msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className="relative">
              <div className={"max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed " +
                (msg.role === "user" ? "rounded-br-md" : "rounded-bl-md")}
                style={{
                  backgroundColor: msg.role === "user" ? "var(--accent)" : "var(--bg-secondary)",
                  color: msg.role === "user" ? "white" : "var(--text-primary)",
                }}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.id > 0 && (
                <button onClick={() => onDeleteMessage(msg.id)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  style={{ backgroundColor: "var(--error)", color: "white" }}
                  title="删除">
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-md text-sm" style={{ backgroundColor: "var(--bg-secondary)" }}>
              <span className="animate-pulse">思考中...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="border-t p-4" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
            placeholder="输入命理问题..."
            className="flex-1 px-4 py-3 rounded-lg border text-sm outline-none focus:border-[var(--accent)]"
            style={{ borderColor: "var(--border)" }}
            disabled={loading}
          />
          <button onClick={onSend} disabled={loading || !question.trim()}
            className="px-4 py-3 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)" }}>
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
