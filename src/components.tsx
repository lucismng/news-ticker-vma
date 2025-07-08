
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { WeatherData, StockData, ForexData, GoldData, WorldGoldData, GoldPrices, FuelData, FuelPrices } from './types';

// --- Icon Components ---
const CloudIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 inline-block mr-1"><path d="M19.95 10.76A8.5 8.5 0 0012 4a8.5 8.5 0 00-8.45 7.44C1.55 12.23 0 14.43 0 17a7 7 0 007 7h10a7 7 0 007-7c0-2.5-1.5-4.66-3.05-6.24z" /></svg> );
const ArrowUpIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 inline-block"><path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.03 9.77a.75.75 0 01-1.06-1.06l5.25-5.25a.75.75 0 011.06 0l5.25 5.25a.75.75 0 11-1.06 1.06L10.75 5.612V16.25A.75.75 0 0110 17z" clipRule="evenodd" /></svg> );
const ArrowDownIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 inline-block"><path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l4.22-4.158a.75.75 0 111.06 1.06l-5.25 5.25a.75.75 0 01-1.06 0l-5.25-5.25a.75.75 0 111.06-1.06L9.25 14.388V3.75A.75.75 0 0110 3z" clipRule="evenodd" /></svg> );

// --- UI Components ---
export const BreakingNewsTag = ({ title }: { title: string }) => ( <div className="flex-shrink-0 bg-white text-[#C00000] font-black text-xl px-3 h-full flex items-center justify-center uppercase animate-pulse">{title}</div> );

export const Clock = ({ isBreakingNewsMode }: { isBreakingNewsMode: boolean }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);
  const formatTime = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const clockColor = isBreakingNewsMode ? 'text-white' : 'text-[#007BFF]';
  return ( <div className={`flex-shrink-0 flex items-center justify-center ${clockColor} font-black text-2xl px-3 h-full transition-colors duration-300`}>{formatTime(time)}</div> );
};

export const ScrollingNews = ({ text, isBreakingNewsMode }: { text: string; isBreakingNewsMode: boolean }) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [animationDuration, setAnimationDuration] = useState(60);
  const SCROLL_SPEED_PPS = 105;

  useLayoutEffect(() => {
    if (scrollerRef.current && text) {
      const singleTextBlockWidth = scrollerRef.current.scrollWidth / 2;
      setAnimationDuration(singleTextBlockWidth / SCROLL_SPEED_PPS || 60);
    }
  }, [text]);

  const textColor = isBreakingNewsMode ? 'text-white' : 'text-[#0056b3]';
  const placeholderColor = isBreakingNewsMode ? 'text-white/70' : 'text-[#0056b3]/70';

  if (!text) return ( <div className="flex-1 overflow-hidden whitespace-nowrap"><div className="h-full flex items-center px-6"><p className={placeholderColor}>Đang cập nhật...</p></div></div> );

  return ( <div className="flex-1 overflow-hidden whitespace-nowrap"><div ref={scrollerRef} className="animate-scroll-left flex items-center h-full w-max" style={{ animationDuration: `${animationDuration}s` }}><p className={`${textColor} font-black px-6 text-2xl transition-colors duration-300`}>{text}</p><p className={`${textColor} font-black px-6 text-2xl transition-colors duration-300`} aria-hidden="true">{text}</p></div></div> );
};

const BottomBarWrapper = ({ children, isBreakingNewsMode, label, onLabelClick }: { children: React.ReactNode, isBreakingNewsMode: boolean, label: string, onLabelClick: () => void }) => {
    const backgroundStyle = isBreakingNewsMode ? { background: 'linear-gradient(to bottom, #A00000, #700000)' } : { background: 'linear-gradient(to bottom, #007BFF, #0056b3)' };
    return (
        <div className="flex h-11 items-center px-5 space-x-5 text-base tracking-wide text-white rounded-b-lg transition-all duration-300 ease-in-out" style={backgroundStyle}>
            <button onClick={onLabelClick} className="flex-shrink-0 uppercase font-extrabold w-44 text-center focus:outline-none hover:opacity-80 transition-opacity duration-200 text-sm"> {label} </button>
            <div className="flex items-center space-x-6 flex-grow">{children}</div>
        </div>
    );
};

const WeatherBar = ({ data, isBreakingNewsMode }: { data: WeatherData | null, isBreakingNewsMode: boolean }) => {
    const [displayData, setDisplayData] = useState(data);
    const [isFlipping, setIsFlipping] = useState(false);
    const secondaryTextColor = isBreakingNewsMode ? 'text-white/80' : 'text-[#B8D9FF]';

    useEffect(() => {
        if (isFlipping) return;
        if (data && (!displayData || data.city !== displayData.city)) {
            setIsFlipping(true);
            const dataTimer = setTimeout(() => setDisplayData(data), 300);
            const flipTimer = setTimeout(() => setIsFlipping(false), 600);
            return () => { clearTimeout(dataTimer); clearTimeout(flipTimer); };
        } else if (data !== displayData) {
            setDisplayData(data);
        }
    }, [data, displayData, isFlipping]);

    return (
        <div className={`flex items-center space-x-6 flex-grow w-full ${isFlipping ? 'animate-flip' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
            {displayData ? (
                <>
                    <span className="text-white font-bold uppercase w-40 text-center text-lg">{displayData.city}</span>
                    <span className={`${secondaryTextColor} transition-colors duration-300`}>HÔM NAY</span>
                    <div className="flex items-center"> <CloudIcon /> <span className="text-3xl leading-none mr-1" style={{ transform: 'translateY(-1px)' }}>▲</span> <span className="font-mono font-extrabold text-lg mr-2 text-yellow-300">{displayData.tempMin} - {displayData.tempMax}°C</span> </div>
                    <span className={`${secondaryTextColor} transition-colors duration-300`}>ĐỘ ẨM <span className="text-yellow-300 font-mono font-extrabold text-lg">{displayData.humidity}%</span></span>
                    <span className={`${secondaryTextColor} transition-colors duration-300`}>KHẢ NĂNG MƯA <span className="text-yellow-300 font-mono font-extrabold text-lg">{displayData.rainChance}%</span></span>
                </>
            ) : <div className="w-full text-center text-white/80">Đang cập nhật...</div>}
        </div>
    );
};

const StockMarketBar = ({ data, isBreakingNewsMode }: { data: StockData[] | null, isBreakingNewsMode: boolean }) => {
    const renderChange = (stock: StockData) => {
        const isPositive = stock.change >= 0;
        let colorClass = isBreakingNewsMode ? (isPositive ? 'text-white' : 'text-yellow-300') : (isPositive ? 'text-green-300' : 'text-red-300');
        return ( <span className={`font-bold text-sm w-28 text-right transition-colors duration-300 ${colorClass}`}> {isPositive ? <ArrowUpIcon /> : <ArrowDownIcon />} {Math.abs(stock.change).toFixed(2)} ({isPositive ? '+' : ''}{stock.percentChange.toFixed(2)}%) </span> );
    };
    return (<>{data ? data.map(stock => (<div key={stock.index} className="flex items-baseline space-x-2"><span className="font-bold text-lg w-32">{stock.index}</span><span className="text-yellow-300 font-mono font-extrabold text-lg">{stock.value.toFixed(2)}</span>{renderChange(stock)}</div>)) : <div className="w-full text-center text-white/80">Đang cập nhật...</div>}</>);
};

const ForexBar = ({ data, isBreakingNewsMode }: { data: ForexData[] | null, isBreakingNewsMode: boolean }) => {
    const secondaryTextColor = isBreakingNewsMode ? 'text-white/80' : 'text-[#B8D9FF]';
    return (<>{data ? data.map(forex => (<div key={forex.code} className="flex items-baseline space-x-3"><span className="font-bold text-lg w-14">{forex.code}</span><span className={`${secondaryTextColor} transition-colors duration-300`}>MUA: <span className="text-yellow-300 font-mono font-extrabold text-lg">{forex.buy.toLocaleString('vi-VN')}</span></span><span className={`${secondaryTextColor} transition-colors duration-300`}>BÁN: <span className="text-yellow-300 font-mono font-extrabold text-lg">{forex.sell.toLocaleString('vi-VN')}</span></span></div>)) : <div className="w-full text-center text-white/80">Đang cập nhật...</div>}</>);
};

const GoldBar = ({ domesticData, worldData, view, isBreakingNewsMode }: { domesticData: GoldData[] | null; worldData: WorldGoldData[] | null; view: 'domestic' | 'world'; isBreakingNewsMode: boolean; }) => {
    const secondaryTextColor = isBreakingNewsMode ? 'text-white/80' : 'text-[#B8D9FF]';
    if (view === 'domestic') {
        return (<>{domesticData ? domesticData.map(gold => (<div key={gold.name} className="flex items-baseline space-x-3"><span className="font-bold text-lg w-28 uppercase">{gold.name}</span><span className={`${secondaryTextColor} transition-colors duration-300`}>MUA: <span className="text-yellow-300 font-mono font-extrabold text-lg">{(gold.buy / 1000000).toFixed(2)}</span></span><span className={`${secondaryTextColor} transition-colors duration-300`}>BÁN: <span className="text-yellow-300 font-mono font-extrabold text-lg">{(gold.sell / 1000000).toFixed(2)}</span></span></div>)) : <div className="w-full text-center text-white/80">Đang cập nhật...</div>}<span className="text-white/60 text-xs self-end pb-0.5 ml-auto">ĐVT: triệu đồng/lượng</span></>);
    }
    return (<>{worldData ? worldData.map(gold => (<div key={gold.name} className="flex items-baseline space-x-3"><span className="font-bold text-lg w-40 uppercase">{gold.name}</span><span className={`${secondaryTextColor} transition-colors duration-300`}>GIÁ: <span className="text-yellow-300 font-mono font-extrabold text-lg">{gold.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span></div>)) : <div className="w-full text-center text-white/80">Đang cập nhật...</div>}<span className="text-white/60 text-xs self-end pb-0.5 ml-auto">ĐVT: USD/ounce</span></>);
};

const FuelBar = ({ domesticData, worldData, view, isBreakingNewsMode }: { domesticData: FuelData[] | null; worldData: FuelData[] | null; view: 'domestic' | 'world'; isBreakingNewsMode: boolean; }) => {
    if (view === 'domestic') {
        return (<>{domesticData ? domesticData.map(fuel => (<div key={fuel.name} className="flex items-baseline space-x-3"><span className="font-bold text-lg w-24 uppercase">{fuel.name}</span><span className="text-yellow-300 font-mono font-extrabold text-lg">{fuel.price.toLocaleString('vi-VN')}</span></div>)) : <div className="w-full text-center text-white/80">Đang cập nhật...</div>}<span className="text-white/60 text-xs self-end pb-0.5 ml-auto">ĐVT: đồng/lít</span></>);
    }
    return (<>{worldData ? worldData.map(fuel => (<div key={fuel.name} className="flex items-baseline space-x-3"><span className="font-bold text-lg w-24 uppercase">{fuel.name}</span><span className="text-yellow-300 font-mono font-extrabold text-lg">{fuel.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>)) : <div className="w-full text-center text-white/80">Đang cập nhật...</div>}<span className="text-white/60 text-xs self-end pb-0.5 ml-auto">ĐVT: USD/thùng</span></>);
};

export const ManualNewsInputPanel = ({ isOpen, onClose, onSubmit, isLoading }: { isOpen: boolean, onClose: () => void, onSubmit: (topic: string, count: number) => void, isLoading: boolean }) => {
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(5);
    const inputRef = useRef<HTMLInputElement>(null);
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (topic.trim() && !isLoading) onSubmit(topic.trim(), count); };
    useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen]);
    if (!isOpen) return null;
    return (
        <div className="fixed top-5 right-5 bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm text-gray-800 z-50 animate-fade-in-down" role="dialog" aria-modal="true" aria-labelledby="manual-news-title">
             <div className="flex justify-between items-center mb-4"><h2 id="manual-news-title" className="text-xl font-bold text-gray-800">Chế độ Tin Nóng Manual</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Đóng"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <p className="mb-4 text-sm text-gray-600">Nhập chủ đề để AI tổng hợp Breaking News.</p>
            <form onSubmit={handleSubmit}>
                <div><label htmlFor="news-topic" className="sr-only">Chủ đề tin tức</label><input id="news-topic" ref={inputRef} type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ví dụ: Bão số 5 tiến vào Biển Đông" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition" aria-label="Chủ đề tin tức" required /></div>
                <div className="mt-4"><label htmlFor="news-count" className="block text-sm font-medium text-gray-700 mb-1">Số lượng tin (1-50)</label><input id="news-count" type="number" value={count} onChange={(e) => setCount(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))} min="1" max="50" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition" aria-label="Số lượng tin tức" required /></div>
                <div className="flex justify-end space-x-3 mt-5">
                    <button type="button" onClick={onClose} className="px-5 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">Hủy</button>
                    <button type="submit" disabled={isLoading || !topic.trim()} className="px-6 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center w-40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{isLoading ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Đang xử lý...</span></>) : 'Tổng hợp ngay'}</button>
                </div>
            </form>
        </div>
    );
};

export const BottomBar = (props: {
    isBreakingNewsMode: boolean,
    currentInfoBar: 'weather' | 'stocks' | 'forex' | 'gold' | 'fuel',
    bottomBarAnimationState: 'idle' | 'flipping',
    onLabelClick: () => void,
    weatherData: WeatherData[] | null,
    currentCityIndex: number,
    stockView: 'vietnam' | 'world',
    vietnamStockData: StockData[] | null,
    worldStockData: StockData[] | null,
    forexData: ForexData[] | null,
    goldView: 'domestic' | 'world',
    goldData: GoldPrices | null,
    fuelView: 'domestic' | 'world',
    fuelData: FuelPrices | null
}) => {
    let content, label;
    switch (props.currentInfoBar) {
        case 'stocks':
            content = <StockMarketBar data={props.stockView === 'vietnam' ? props.vietnamStockData : props.worldStockData} isBreakingNewsMode={props.isBreakingNewsMode} />;
            label = props.stockView === 'vietnam' ? "CHỨNG KHOÁN VN" : "CHỨNG KHOÁN TG";
            break;
        case 'forex':
            content = <ForexBar data={props.forexData} isBreakingNewsMode={props.isBreakingNewsMode} />;
            label = "TỶ GIÁ NGOẠI TỆ";
            break;
        case 'gold':
            content = <GoldBar domesticData={props.goldData?.domestic} worldData={props.goldData?.world} view={props.goldView} isBreakingNewsMode={props.isBreakingNewsMode} />;
            label = props.goldView === 'domestic' ? "GIÁ VÀNG TRONG NƯỚC" : "GIÁ VÀNG THẾ GIỚI";
            break;
        case 'fuel':
            content = <FuelBar domesticData={props.fuelData?.domestic} worldData={props.fuelData?.world} view={props.fuelView} isBreakingNewsMode={props.isBreakingNewsMode} />;
            label = props.fuelView === 'domestic' ? "GIÁ XĂNG DẦU" : "DẦU THÔ THẾ GIỚI";
            break;
        default: // 'weather'
            const currentCityWeather = props.weatherData && props.weatherData.length > props.currentCityIndex ? props.weatherData[props.currentCityIndex] : null;
            content = <WeatherBar data={currentCityWeather} isBreakingNewsMode={props.isBreakingNewsMode} />;
            label = "THỜI TIẾT";
            break;
    }

    return (
      <div className={`relative ${props.bottomBarAnimationState === 'flipping' ? 'animate-flip' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
        <BottomBarWrapper isBreakingNewsMode={props.isBreakingNewsMode} label={label} onLabelClick={props.onLabelClick}>
            {content}
        </BottomBarWrapper>
      </div>
    );
};
