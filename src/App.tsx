import React from 'react';
import { useTicker } from './useTicker';
import { ManualNewsInputPanel, Clock, BreakingNewsTag, ScrollingNews, BottomBar } from './components';

// --- Main App Component (Presentation Layer) ---
const App = () => {
  const ticker = useTicker();

  return (
    <>
      <ManualNewsInputPanel
        isOpen={ticker.isManualInputPanelOpen}
        onClose={() => ticker.setIsManualInputPanelOpen(false)}
        onSubmit={ticker.fetchManualBreakingNews}
        isLoading={ticker.isManualNewsLoading}
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
            isBreakingNewsMode={ticker.isBreakingNewsMode}
            currentInfoBar={ticker.currentInfoBar}
            bottomBarAnimationState={ticker.bottomBarAnimationState}
            onLabelClick={() => ticker.setIsManualInputPanelOpen(true)}
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
