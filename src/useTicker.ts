import { useState, useEffect, useMemo, useCallback } from 'react';
import { WeatherData, StockData, ForexData, GoldPrices, FuelPrices } from './types';
import { GoogleGenAI } from '@google/genai';

// --- Gemini AI Setup ---
const API_KEYS = (import.meta.env.VITE_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);
let currentApiKeyIndex = 0;

const getAiInstance = () => {
    if (API_KEYS.length === 0) return null;
    const apiKey = API_KEYS[currentApiKeyIndex];
    currentApiKeyIndex = (currentApiKeyIndex + 1) % API_KEYS.length;
    return new GoogleGenAI({ apiKey });
};

const geminiModel = 'gemini-2.5-flash-preview-04-17';

// --- DATA & COORDINATES ---
const CITIES_FOR_WEATHER = [
    "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Thanh Hóa", "Vinh", "Nha Trang", "Quy Nhơn", "Huế", "Đà Lạt", "Buôn Ma Thuột", "Pleiku", "Biên Hòa", "Thủ Dầu Một", "Vũng Tàu", "Mỹ Tho", "Long Xuyên", "Rạch Giá", "Cà Mau", "Hạ Long", "Thái Nguyên", "Nam Định", "Việt Trì", "Phú Quốc"
];

// --- Fallback Data Constants ---
const FALLBACK_VIETNAM_STOCKS: StockData[] = [
  { index: 'VN-INDEX', value: 1280.00, change: -2.50, percentChange: -0.20 },
  { index: 'HNX-INDEX', value: 245.00, change: 0.75, percentChange: 0.31 },
  { index: 'UPCOM', value: 98.50, change: 0.25, percentChange: 0.25 },
];
const FALLBACK_WORLD_STOCKS: StockData[] = [
  { index: 'DOW JONES', value: 39000.00, change: -150.00, percentChange: -0.38 },
  { index: 'S&P 500', value: 5400.00, change: -10.00, percentChange: -0.18 },
  { index: 'NIKKEI 225', value: 38500.00, change: 250.00, percentChange: 0.65 },
];
const FALLBACK_FOREX_DATA: ForexData[] = [
    { code: 'USD', buy: 25300, sell: 25470 },
    { code: 'EUR', buy: 26800, sell: 27100 },
    { code: 'JPY', buy: 158.00, sell: 161.00 },
];
const FALLBACK_GOLD_PRICES: GoldPrices = {
    domestic: [
        { name: 'VÀNG SJC', buy: 90500000, sell: 92500000 },
        { name: 'VÀNG 9999', buy: 75000000, sell: 76500000 },
    ],
    world: [ { name: 'GOLD', price: 2350.55 } ],
};
const FALLBACK_FUEL_PRICES: FuelPrices = {
    domestic: [
        { name: 'RON95-V', price: 23540 },
        { name: 'E5 RON92', price: 22750 },
        { name: 'DẦU DO', price: 20990 },
    ],
    world: [
        { name: 'BRENT', price: 82.75 },
        { name: 'WTI', price: 78.50 },
    ],
};

const NON_WEATHER_BAR_DURATION = 10000;
const WEATHER_CITY_DURATION = 3000;

// --- Utility Functions ---
const parseGeminiJson = <T,>(text: string): T | null => {
  try {
    let cleanText = text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanText.match(fenceRegex);
    if (match && match[2]) {
      cleanText = match[2].trim();
    }
    return JSON.parse(cleanText) as T;
  } catch (e) {
    console.error("Lỗi phân tích JSON từ Gemini:", e);
    console.error("Dữ liệu gốc:", text);
    return null;
  }
};

interface CombinedData {
    weatherData?: WeatherData[];
    vietnamStocks?: StockData[];
    worldStocks?: StockData[];
    forex?: ForexData[];
    goldPrices?: GoldPrices;
    fuelPrices?: FuelPrices;
}

// --- Main Logic Hook ---
export const useTicker = () => {
    // Data State
    const [newsItems, setNewsItems] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [weatherData, setWeatherData] = useState<Map<string, WeatherData> | null>(null);
    const [vietnamStockData, setVietnamStockData] = useState<StockData[] | null>(null);
    const [worldStockData, setWorldStockData] = useState<StockData[] | null>(null);
    const [forexData, setForexData] = useState<ForexData[] | null>(null);
    const [goldData, setGoldData] = useState<GoldPrices | null>(null);
    const [fuelData, setFuelData] = useState<FuelPrices | null>(null);

    // UI & Animation State
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isBreakingNewsMode, setIsBreakingNewsMode] = useState(false);
    const [customBreakingNewsTitle, setCustomBreakingNewsTitle] = useState<string | null>(null);
    const [animationState, setAnimationState] = useState<'idle' | 'flipping'>('idle');
    const [bottomBarAnimationState, setBottomBarAnimationState] = useState<'idle' | 'flipping'>('idle');
    const [isManualInputPanelOpen, setIsManualInputPanelOpen] = useState(false);
    const [isManualNewsLoading, setIsManualNewsLoading] = useState(false);
    const [manualNewsError, setManualNewsError] = useState<string | null>(null);
    const [isErrorState, setIsErrorState] = useState(false);
    
    // Ticker View State
    const [currentInfoBar, setCurrentInfoBar] = useState<'weather' | 'stocks' | 'forex' | 'gold' | 'fuel'>('stocks');
    const [currentCityIndex, setCurrentCityIndex] = useState(0);
    const [stockView, setStockView] = useState<'vietnam' | 'world'>('vietnam');
    const [goldView, setGoldView] = useState<'domestic' | 'world'>('domestic');
    const [fuelView, setFuelView] = useState<'domestic' | 'world'>('domestic');
    
    // --- Data Fetching Callbacks ---
    const fetchRssNews = useCallback(async () => {
        setNewsItems([]);
        console.log("Sử dụng nguồn RSS mặc định từ Báo Tin Tức (TTXVN)...");
        const RSS_FEEDS = ['https://baotintuc.vn/tin-moi-nhat.rss', 'https://baotintuc.vn/thoi-su.rss', 'https://baotintuc.vn/the-gioi.rss', 'https://baotintuc.vn/kinh-te.rss'];
        const PROXY_URL = 'https://api.allorigins.win/raw?url=';

        try {
            const fetchPromises = RSS_FEEDS.map(feedUrl => fetch(`${PROXY_URL}${encodeURIComponent(feedUrl)}`));
            const results = await Promise.allSettled(fetchPromises);
            const parser = new DOMParser();
            let allDescriptions: string[] = [];

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    const response = result.value;
                    if (!response.ok) continue;
                    const xmlText = await response.text();
                    const doc = parser.parseFromString(xmlText, "application/xml");
                    const items = Array.from(doc.querySelectorAll("item"));
                    const descriptions = items.map(item => {
                        const descriptionNode = item.querySelector("description");
                        if (!descriptionNode?.textContent) return '';
                        
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = descriptionNode.textContent;
                        
                        const cleanText = (tempDiv.textContent || tempDiv.innerText || "").trim();
                        return cleanText;
                    }).filter(Boolean);
                    allDescriptions.push(...descriptions);
                }
            }
            let uniqueDescriptions = [...new Set(allDescriptions)];
            if (uniqueDescriptions.length > 0) {
                setNewsItems(uniqueDescriptions);
                setError(null);
            } else {
                throw new Error("Không tìm thấy tin tức nào từ các nguồn RSS.");
            }
        } catch (e) {
            setError("Đang cập nhật...");
            setNewsItems(["Không thể tải tin tức vào lúc này. Vui lòng thử lại sau."]);
        }
    }, []);

    const fetchNews = useCallback(async () => {
        if (animationState === 'flipping' || customBreakingNewsTitle) return;
        setError(null);
        setNewsItems([]);

        if (!isBreakingNewsMode) {
            await fetchRssNews();
            return;
        }

        const prompt = `Liệt kê 10 tin tức nóng hổi, quan trọng nhất tại Việt Nam và thế giới trong giờ qua. Hãy sử dụng văn phong báo chí trung lập, khách quan, tránh các từ ngữ nhạy cảm hoặc gây tranh cãi. Trả về dưới dạng một mảng JSON các chuỗi tóm tắt. Ví dụ: ["Tóm tắt tin tức 1", "Tóm tắt tin tức 2"]`;
        try {
            const ai = getAiInstance();
            if (!ai) throw new Error("API key không được cấu hình.");
            const response = await ai.models.generateContent({ model: geminiModel, contents: prompt, config: { tools: [{googleSearch: {}}] } });
            const summaries = parseGeminiJson<string[]>(response.text);
            if (summaries && summaries.length > 0) setNewsItems(summaries);
            else throw new Error('Gemini không trả về tin tức nào.');
        } catch (e) {
            await fetchRssNews();
        }
    }, [isBreakingNewsMode, animationState, fetchRssNews, customBreakingNewsTitle]);

    const fetchBackgroundData = useCallback(async () => {
        console.log("Bắt đầu cập nhật toàn bộ dữ liệu nền bằng một lệnh gọi API...");
        const ai = getAiInstance();
        if (!ai) {
             setIsErrorState(true);
             return;
        }

        const combinedPrompt = `Sử dụng Google Search để lấy dữ liệu mới nhất và trả về MỘT đối tượng JSON duy nhất có các khóa sau: "weatherData", "vietnamStocks", "worldStocks", "forex", "goldPrices", và "fuelPrices".
- "weatherData": Một mảng các đối tượng thời tiết cho các thành phố sau: ${JSON.stringify(CITIES_FOR_WEATHER)}. Mỗi đối tượng phải chứa 'city', 'tempMin', 'tempMax', 'humidity', 'rainChance'.
- "vietnamStocks": Một mảng các đối tượng cho VN-INDEX, HNX-INDEX, UPCOM.
- "worldStocks": Một mảng các đối tượng cho DOW JONES, S&P 500, NIKKEI 225.
- "forex": Một mảng các đối tượng cho tỷ giá USD, EUR, JPY.
- "goldPrices": Một đối tượng chứa khóa "domestic" (cho vàng SJC, 9999) và "world" (cho Spot Gold).
- "fuelPrices": Một đối tượng chứa khóa "domestic" (cho xăng RON95-V, E5 RON92) và "world" (cho dầu BRENT, WTI).
Hãy đảm bảo dữ liệu là chính xác và mới nhất.`;

        try {
            const response = await ai.models.generateContent({ model: geminiModel, contents: combinedPrompt, config: { tools: [{googleSearch: {}}] } });
            const data = parseGeminiJson<CombinedData>(response.text);
            
            if (data) {
                setVietnamStockData(data.vietnamStocks || FALLBACK_VIETNAM_STOCKS);
                setWorldStockData(data.worldStocks || FALLBACK_WORLD_STOCKS);
                setForexData(data.forex || FALLBACK_FOREX_DATA);
                setGoldData(data.goldPrices || FALLBACK_GOLD_PRICES);
                setFuelData(data.fuelPrices || FALLBACK_FUEL_PRICES);

                if (data.weatherData && data.weatherData.length > 0) {
                    const weatherMap = new Map<string, WeatherData>();
                    data.weatherData.forEach(weather => {
                        const originalCityName = CITIES_FOR_WEATHER.find(c => c.toLowerCase() === weather.city.toLowerCase());
                        if (originalCityName) {
                            weatherMap.set(originalCityName, weather);
                        }
                    });
                    setWeatherData(weatherMap);
                } else {
                    setWeatherData(null);
                }
            } else {
                throw new Error("Gemini không trả về dữ liệu kết hợp hợp lệ.");
            }
        } catch (e) {
            console.error("Lỗi nghiêm trọng khi lấy dữ liệu nền từ Gemini. Sử dụng dữ liệu dự phòng.", e);
            setVietnamStockData(FALLBACK_VIETNAM_STOCKS); 
            setWorldStockData(FALLBACK_WORLD_STOCKS); 
            setForexData(FALLBACK_FOREX_DATA); 
            setGoldData(FALLBACK_GOLD_PRICES); 
            setFuelData(FALLBACK_FUEL_PRICES);
            setWeatherData(null);
        }
    }, []);

    const fetchManualBreakingNews = useCallback(async (topic: string, count: number) => {
        setIsManualNewsLoading(true);
        setManualNewsError(null);
        
        const ai = getAiInstance();
        if (!ai) {
            setManualNewsError("Lỗi: API Keys chưa được cấu hình.");
            setIsManualNewsLoading(false);
            return;
        }
        
        const prompt = `Tạo JSON với khóa "title" (tiêu đề siêu ngắn cho "${topic}") và "summaries" (mảng ${count} tóm tắt tin tức mới nhất liên quan đến chủ đề này trong vòng 1 giờ qua). Hãy tóm tắt với văn phong báo chí trung lập, khách quan, phù hợp với mọi đối tượng và tránh các từ ngữ nhạy cảm hoặc gây tranh cãi. Ưu tiên các tin tức có nguồn uy tín.`;

        try {
            const response = await ai.models.generateContent({ model: geminiModel, contents: prompt, config: { tools: [{ googleSearch: {} }] } });
            const data = parseGeminiJson<{ title: string, summaries: string[] }>(response.text);

            if (data?.title && data?.summaries?.length > 0) {
                setAnimationState('flipping');
                setTimeout(() => {
                    setIsBreakingNewsMode(true);
                    setCustomBreakingNewsTitle(data.title.toUpperCase());
                    setNewsItems(data.summaries);
                }, 300);
                setTimeout(() => {
                    setAnimationState('idle');
                }, 600);
                setIsManualInputPanelOpen(false); // Close panel on success
            } else {
                 const errorMsg = "AI không trả về dữ liệu hợp lệ. Vui lòng thử lại với chủ đề khác hoặc kiểm tra lại prompt.";
                 console.error("Lỗi tạo tin tức thủ công:", errorMsg);
                 setManualNewsError(errorMsg);
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "Lỗi không xác định";
            console.error("Lỗi khi gọi API tạo tin tức thủ công:", e);
            setManualNewsError(`Lỗi API: ${errorMessage}.`);
        } finally {
            setIsManualNewsLoading(false);
        }
    }, []);

    const openManualPanel = useCallback(() => {
        setIsManualInputPanelOpen(true);
        setManualNewsError(null);
    }, []);

    const closeManualPanel = useCallback(() => {
        setIsManualInputPanelOpen(false);
        setManualNewsError(null);
    }, []);
    
    // --- UI Logic & Memos ---
    const newsString = useMemo(() => {
        if (error) return error;
        if (newsItems.length === 0) return 'Đang tải tin tức...';
        const SEPARATOR = `\u00A0\u00A0●\u00A0\u00A0`;
        const formatNewsItem = (item: string) => `\u00A0\u00A0\u00A0\u00A0\u00A0${item.trim().replace(/\.$/, '')}\u00A0\u00A0\u00A0\u00A0\u00A0`;
        return newsItems.map(formatNewsItem).join(SEPARATOR);
    }, [newsItems, error]);

    const availableInfoBars = useMemo(() => {
        const bars: Array<'weather' | 'stocks' | 'forex' | 'gold' | 'fuel'> = [];
        if (weatherData && weatherData.size > 0) bars.push('weather');
        if (vietnamStockData || worldStockData) bars.push('stocks');
        if (forexData) bars.push('forex');
        if (goldData) bars.push('gold');
        if (fuelData) bars.push('fuel');
        return bars.length > 0 ? bars : [];
    }, [weatherData, vietnamStockData, worldStockData, forexData, goldData, fuelData]);
    
    const switchToNextInfoBar = useCallback(() => {
      if (bottomBarAnimationState !== 'idle' || availableInfoBars.length === 0) return;
      setBottomBarAnimationState('flipping');
      setTimeout(() => {
          setCurrentInfoBar(prev => {
              const currentIndex = availableInfoBars.indexOf(prev);
              const nextIndex = (currentIndex + 1) % availableInfoBars.length;
              return availableInfoBars[nextIndex] || availableInfoBars[0];
          });
          setStockView('vietnam'); setGoldView('domestic'); setFuelView('domestic');
      }, 300);
      setTimeout(() => setBottomBarAnimationState('idle'), 600);
    }, [bottomBarAnimationState, availableInfoBars]);

    const toggleBreakingNewsMode = useCallback(() => {
        if (animationState !== 'idle') return;
        setAnimationState('flipping');
        setTimeout(() => {
            setIsBreakingNewsMode(prev => { if (prev) setCustomBreakingNewsTitle(null); return !prev; });
            setNewsItems([]);
        }, 300);
        setTimeout(() => setAnimationState('idle'), 600);
    }, [animationState]);
    
    const currentCityName = CITIES_FOR_WEATHER[currentCityIndex];
    const currentCityWeather = weatherData ? (weatherData.get(currentCityName) || null) : null;

    // --- Effects ---
    useEffect(() => {
        if (API_KEYS.length === 0) {
            setIsErrorState(true);
            return;
        }
        const runUpdates = () => {
            fetchNews();
            fetchBackgroundData();
        };
        runUpdates();
        const hourlyInterval = setInterval(runUpdates, 60 * 60 * 1000);
        return () => clearInterval(hourlyInterval);
    }, [fetchNews, fetchBackgroundData]);

    useEffect(() => {
        if (isInitialLoad && availableInfoBars.length > 0) {
            setBottomBarAnimationState('flipping');
            setTimeout(() => {
                setIsInitialLoad(false);
            }, 300);
            setTimeout(() => {
                setBottomBarAnimationState('idle');
            }, 600);
        }
    }, [availableInfoBars, isInitialLoad]);

    useEffect(() => {
        if (isInitialLoad || currentInfoBar !== 'weather' || availableInfoBars.length === 0) return;
        
        const cityInterval = setInterval(() => {
            setCurrentCityIndex(prev => {
                const nextIndex = prev + 1;
                if (nextIndex >= CITIES_FOR_WEATHER.length) { 
                    switchToNextInfoBar(); 
                    return 0; 
                }
                return nextIndex;
            });
        }, WEATHER_CITY_DURATION);
        return () => clearInterval(cityInterval);
    }, [currentInfoBar, switchToNextInfoBar, availableInfoBars, isInitialLoad]);

    useEffect(() => {
        if (isInitialLoad || currentInfoBar === 'weather' || bottomBarAnimationState !== 'idle' || availableInfoBars.length === 0) return;
        const switchTimer = setTimeout(switchToNextInfoBar, NON_WEATHER_BAR_DURATION);
        return () => clearTimeout(switchTimer);
    }, [currentInfoBar, bottomBarAnimationState, switchToNextInfoBar, availableInfoBars, isInitialLoad]);

    // Set initial info bar based on available data
    useEffect(() => {
        if (availableInfoBars.length > 0 && isInitialLoad) {
            // Don't set the info bar until the initial load is done
            return;
        }
        if (availableInfoBars.length > 0) {
            setCurrentInfoBar(availableInfoBars[0]);
        }
    }, [availableInfoBars, isInitialLoad]);

    useEffect(() => { if (!isInitialLoad && currentInfoBar === 'stocks') { const i = setInterval(() => setStockView(p => p === 'vietnam' ? 'world' : 'vietnam'), 7000); return () => clearInterval(i); }}, [currentInfoBar, isInitialLoad]);
    useEffect(() => { if (!isInitialLoad && currentInfoBar === 'gold') { const i = setInterval(() => setGoldView(p => p === 'domestic' ? 'world' : 'domestic'), 7000); return () => clearInterval(i); }}, [currentInfoBar, isInitialLoad]);
    useEffect(() => { if (!isInitialLoad && currentInfoBar === 'fuel') { const i = setInterval(() => setFuelView(p => p === 'domestic' ? 'world' : 'domestic'), 7000); return () => clearInterval(i); }}, [currentInfoBar, isInitialLoad]);

    return {
        isErrorState,
        isInitialLoad,
        newsItems,
        error,
        vietnamStockData,
        worldStockData,
        forexData,
        goldData,
        fuelData,
        isBreakingNewsMode,
        customBreakingNewsTitle,
        animationState,
        bottomBarAnimationState,
        isManualInputPanelOpen,
        isManualNewsLoading,
        manualNewsError,
        currentInfoBar,
        stockView,
        goldView,
        fuelView,
        currentCityWeather,
        newsString,
        toggleBreakingNewsMode,
        fetchManualBreakingNews,
        openManualPanel,
        closeManualPanel,
    };
};
