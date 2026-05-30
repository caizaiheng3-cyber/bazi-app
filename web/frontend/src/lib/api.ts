import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export interface Subject {
  id: number;
  name: string;
  gender: string;
  birth_date: string;
  birth_time: string;
  calendar_type: string;
  birth_city: string;
  notes: string;
  report_status: string;
  created_at: string;
  updated_at: string;
  info_updated_after_report: boolean;
}

export interface Report {
  subject_id: number;
  status: string;
  master_report: string | null;
  consumer_report: string | null;
  wechat_report: string | null;
  html_report: string | null;
  generated_at: string | null;
  progress: string | null;
}

export interface ChatMessageItem {
  id: number;
  subject_id: number;
  role: string;
  content: string;
  created_at: string;
}

export const authApi = {
  login: (password: string) =>
    api.post<{ token: string }>("/auth/login", { password }),
  verify: () => api.get("/auth/verify"),
};

export const subjectsApi = {
  list: () => api.get<Subject[]>("/subjects"),
  get: (id: number) => api.get<Subject>(`/subjects/${id}`),
  create: (data: Omit<Subject, "id" | "report_status" | "created_at" | "updated_at" | "info_updated_after_report">) =>
    api.post<Subject>("/subjects", data),
  update: (id: number, data: Partial<Subject>) =>
    api.put<Subject>(`/subjects/${id}`, data),
};

export const reportsApi = {
  get: (subjectId: number) => api.get<Report>(`/reports/${subjectId}`, {
    params: { _t: Date.now() },
  }),
  generate: (subjectId: number) =>
    api.post("/reports/generate", { subject_id: subjectId }),
};

export const chatApi = {
  getMessages: (subjectId: number) =>
    api.get<{ messages: ChatMessageItem[] }>(`/chat/${subjectId}/messages`),
  send: (subjectId: number, question: string) =>
    api.post<ChatMessageItem>(`/chat/${subjectId}/send`, {
      subject_id: subjectId,
      question,
    }),
  deleteMessage: (subjectId: number, messageId: number) =>
    api.delete(`/chat/${subjectId}/messages/${messageId}`),
};

export default api;
