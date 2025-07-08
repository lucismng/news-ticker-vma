import React from 'react';
import { useTicker } from './useTicker';
import { ManualNewsInputPanel, Clock, BreakingNewsTag, ScrollingNews, BottomBar } from './components';

const ApiKeyErrorScreen = () => (
  <div className="fixed inset-0 bg-gray-900 text-white flex items-center justify-center p-8">
    <div className="bg-gray-800 p-8 rounded-lg shadow-2xl max-w-2xl text-center border border-red-500">
      <h1 className="text-3xl font-bold text-red-500 mb-4">Lỗi Cấu Hình API Key</h1>
      <p className="text-lg mb-6">
        Ứng dụng không thể tìm thấy biến môi trường chứa API Key của Google Gemini.
      </p>
      <div className="text-left bg-gray-900 p-6 rounded-md">
        <p className="text-lg font-semibold mb-3">Vui lòng thực hiện các bước sau trên Vercel:</p>
        <ol className="list-decimal list-inside space-y-3">
          <li>Đi đến trang cài đặt (Settings) của dự án Vercel của bạn.</li>
          <li>Chọn mục <strong>Environment Variables</strong>.</li>
          <li>
            Tạo một biến mới với tên (key) là:
            <code className="bg-yellow-400 text-black font-mono font-bold px-2 py-1 rounded-md mx-2">VITE_API_KEYS</code>
          </li>
          <li>
            Trong phần giá trị (value), dán (các) API key của bạn vào. Nếu có nhiều key, hãy ngăn cách chúng bằng dấu phẩy.
            <br />
            <span className="text-gray-400 text-sm block mt-1">Ví dụ: <code className="bg-gray-700 px-1 py-0.5 rounded">key_thu_nhat,key_thu_hai</code></span>
          </li>
          <li>Lưu lại và triển khai lại (Redeploy) phiên bản mới nhất.</li>
        </ol>
      </div>
    </div>
  </div>
);


// --- Main App Component (Presentation Layer) ---
const App = () => {
  if (!import.meta.env.VITE_API_KEYS) {
    return <ApiKeyErrorScreen />;
  }

  const ticker = useTicker();

  if (ticker.isErrorState) {
     return <ApiKeyErrorScreen />;
  }

  return (
    <>
      <ManualNewsInputPanel
        isOpen={ticker.isManualInputPanelOpen}
        onClose={ticker.closeManualPanel}
        onSubmit={ticker.fetchManualBreakingNews}
        isLoading={ticker.isManualNewsLoading}
        error={ticker.manualNewsError}
      />
      <div className="fixed bottom-5 left-11 right-11 shadow-2xl rounded-lg" style={{ perspective: '800px' }}>
        <div className="flex h-10 items-stretch shadow-md rounded-t-lg overflow-hidden">
          <button
            onClick={ticker.toggleBreakingNewsMode}
            className={`flex-shrink-0 focus:outline-none transition-colors duration-300 ease-in-out ${ticker.isBreakingNewsMode ? 'bg-[#C00000]' : 'bg-gray-100'}`}
            aria-label={ticker.isBreakingNewsMode ? "Tắt chế độ Tin nóng" : "Bật chế độ Tin nóng"}
            disabled={ticker.animationState === 'flipping'}>
                <Clock isBreakingNewsMode={ticker.isBreakingNewsMode} />
          </button>
          <div className={`flex-1 flex items-stretch relative ${ticker.animationState === 'flipping' ? 'animate-flip' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
            <div className={`absolute inset-0 ${ticker.isBreakingNewsMode ? 'bg-[#C00000]' : 'bg-white'}`}></div>
            <div className="relative z-10 flex-1 flex items-stretch">
              {ticker.isBreakingNewsMode && <BreakingNewsTag title={ticker.customBreakingNewsTitle || "BREAKING NEWS"} />}
              <ScrollingNews text={ticker.newsString} isBreakingNewsMode={ticker.isBreakingNewsMode} />
            </div>
          </div>
        </div>
        <BottomBar
            isInitialLoad={ticker.isInitialLoad}
            isBreakingNewsMode={ticker.isBreakingNewsMode}
            currentInfoBar={ticker.currentInfoBar}
            bottomBarAnimationState={ticker.bottomBarAnimationState}
            onLabelClick={ticker.openManualPanel}
            currentCityWeather={ticker.currentCityWeather}
            stockView={ticker.stockView}
            vietnamStockData={ticker.vietnamStockData}
            worldStockData={ticker.worldStockData}
            forexData={ticker.forexData}
            goldView={ticker.goldView}
            goldData={ticker.goldData}
            fuelView={ticker.fuelView}
            fuelData={ticker.fuelData}
        />
      </div>
    </>
  );
};

export default App;
