import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ResultPage } from './pages/ResultPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { JournalPage } from './pages/JournalPage';
import { AppRouter } from './components/common/AppRouter';

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#C5392F',
          colorLink: '#C5392F',
          colorTextBase: '#2C2A28',
          colorBgBase: '#F5EFE0',
          fontFamily: '"Noto Sans SC", "PingFang SC", system-ui, sans-serif',
          borderRadius: 4,
        },
        components: {
          Button: { fontWeight: 500 },
          Segmented: { itemSelectedBg: '#C5392F', itemSelectedColor: '#fff' },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* 路由中转：根据是否有命盘决定落地页 */}
          <Route path="/" element={<AppRouter />} />
          {/* 首次使用：输入表单 */}
          <Route path="/onboarding" element={<HomePage />} />
          {/* 每日命理主页（老用户默认落地页） */}
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* 聊天流式对话页 */}
          <Route path="/chat" element={<ChatPage />} />
          {/* 命理日记 */}
          <Route path="/journal" element={<JournalPage />} />
          {/* 整体报告（降为二级入口） */}
          <Route path="/chart" element={<ResultPage />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
