import { useState, useEffect, useMemo, useCallback } from 'react';
import { WeatherData, StockData, ForexData, GoldPrices, FuelPrices } from './types';
import { GoogleGenAI } from '@google/genai';

// --- Gemini AI Setup ---
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
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
const INFO_BAR_ORDER: Array<'weather' | 'stocks' | 'forex' | 'gold' | 'fuel'> = ['weather', 'stocks', 'forex', 'gold', 'fuel'];
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
    const [isBreakingNewsMode, setIsBreakingNewsMode] = useState(false);
    const [customBreakingNewsTitle, setCustomBreakingNewsTitle] = useState<string | null>(null);
    const [animationState, setAnimationState] = useState<'idle' | 'flipping'>('idle');
    const [bottomBarAnimationState, setBottomBarAnimationState] = useState<'idle' | 'flipping'>('idle');
    const [isManualInputPanelOpen, setIsManualInputPanelOpen] = useState(false);
    const [isManualNewsLoading, setIsManualNewsLoading] = useState(false);
    
    // Ticker View State
    const [currentInfoBar, setCurrentInfoBar] = useState<'weather' | 'stocks' | 'forex' | 'gold' | 'fuel'>('weather');
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
            const response = await ai.models.generateContent({ model: geminiModel, contents: prompt, config: { tools: [{googleSearch: {}}] } });
            const summaries = parseGeminiJson<string[]>(response.text);
            if (summaries && summaries.length > 0) setNewsItems(summaries);
            else throw new Error('Gemini không trả về tin tức nào.');
        } catch (e) {
            await fetchRssNews();
        }
    }, [isBreakingNewsMode, animationState, fetchRssNews, customBreakingNewsTitle]);
    
    const fetchFallbackWeatherData = useCallback(async () => {
        console.log("Gemini lỗi. Kích hoạt API thời tiết dự phòng (wttr.in)...");
        try {
            const fetchPromises = CITIES_FOR_WEATHER.map(async (city) => {
                try {
                    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
                    const response = await fetch(url);
                    if (!response.ok) return null;
                    const data = await response.json();

                    if (!data.weather || !data.current_condition) return null;

                    const maxRainChance = data.weather[0]?.hourly?.reduce((max: number, hour: any) => {
                        const chance = parseInt(hour.chanceofrain, 10);
                        return isNaN(chance) ? max : Math.max(max, chance);
                    }, 0) ?? 0;

                    return {
                        city: data.nearest_area[0].areaName[0].value,
                        tempMax: parseInt(data.weather[0].maxtempC, 10),
                        tempMin: parseInt(data.weather[0].mintempC, 10),
                        humidity: parseInt(data.current_condition[0].humidity, 10),
                        rainChance: maxRainChance,
                    };
                } catch (cityError) {
                    console.error(`Lỗi khi lấy dữ liệu thời tiết cho ${city}:`, cityError);
                    return null;
                }
            });

            const results = await Promise.all(fetchPromises);
            const weatherArray = results.filter((d): d is WeatherData => d !== null);

            if (weatherArray.length > 0) {
                 const weatherMap = new Map<string, WeatherData>();
                 weatherArray.forEach((data, index) => {
                    const originalCityName = CITIES_FOR_WEATHER[index];
                    weatherMap.set(originalCityName, { ...data, city: originalCityName });
                 });
                setWeatherData(weatherMap);
            } else {
                throw new Error("API thời tiết dự phòng (wttr.in) thất bại.");
            }
        } catch (e) {
            console.error("Lỗi với API thời tiết dự phòng:", e);
            setWeatherData(null);
        }
    }, []);

    const fetchBackgroundData = useCallback(async () => {
        console.log("Bắt đầu cập nhật dữ liệu tài chính và thời tiết...");
        const financePrompt = `Cung cấp dữ liệu tài chính mới nhất. Trả lời bằng một đối tượng JSON duy nhất có năm khóa: "vietnamStocks", "worldStocks", "forex", "goldPrices", và "fuelPrices". - "vietnamStocks": mảng các đối tượng cho VN-INDEX, HNX-INDEX, UPCOM. - "worldStocks": mảng các đối tượng cho DOW JONES, S&P 500, NIKKEI 225. - "forex": mảng các đối tượng cho USD, EUR, JPY. - "goldPrices": đối tượng có "domestic" (SJC, 9999) và "world" (Spot Gold). - "fuelPrices": đối tượng có "domestic" (RON95-V, E5 RON92) và "world" (BRENT, WTI).`;
        const weatherPrompt = `Cung cấp dữ liệu thời tiết hiện tại cho danh sách thành phố Việt Nam sau: ${JSON.stringify(CITIES_FOR_WEATHER)}. Trả về dưới dạng một mảng JSON các đối tượng.`;

        try {
            const [financeResponse, weatherResponse] = await Promise.all([
                ai.models.generateContent({ model: geminiModel, contents: financePrompt, config: { tools: [{googleSearch: {}}] } }),
                ai.models.generateContent({ model: geminiModel, contents: weatherPrompt, config: { tools: [{googleSearch: {}}] } })
            ]);

            const finData = parseGeminiJson<{vietnamStocks: StockData[], worldStocks: StockData[], forex: ForexData[], goldPrices: GoldPrices, fuelPrices: FuelPrices}>(financeResponse.text);
            if (finData) {
                setVietnamStockData(finData.vietnamStocks || FALLBACK_VIETNAM_STOCKS);
                setWorldStockData(finData.worldStocks || FALLBACK_WORLD_STOCKS);
                setForexData(finData.forex || FALLBACK_FOREX_DATA);
                setGoldData(finData.goldPrices || FALLBACK_GOLD_PRICES);
                setFuelData(finData.fuelPrices || FALLBACK_FUEL_PRICES);
            } else throw new Error("Finance data parsing failed.");

            const weatherArray = parseGeminiJson<WeatherData[]>(weatherResponse.text);
            if (weatherArray && weatherArray.length > 0) {
                const weatherMap = new Map<string, WeatherData>();
                for (const cityName of CITIES_FOR_WEATHER) {
                    const data = weatherArray.find(d => d.city.toLowerCase() === cityName.toLowerCase());
                    if (data) {
                        weatherMap.set(cityName, data);
                    }
                }
                setWeatherData(weatherMap);
            } else {
                 await fetchFallbackWeatherData();
            }
        } catch (e) {
            console.error("Lỗi lấy dữ liệu nền từ Gemini. Kích hoạt chế độ dự phòng.", e);
            setVietnamStockData(FALLBACK_VIETNAM_STOCKS); setWorldStockData(FALLBACK_WORLD_STOCKS); setForexData(FALLBACK_FOREX_DATA); setGoldData(FALLBACK_GOLD_PRICES); setFuelData(FALLBACK_FUEL_PRICES);
            await fetchFallbackWeatherData();
        }
    }, [fetchFallbackWeatherData]);

    const fetchManualBreakingNews = useCallback(async (topic: string, count: number) => {
        setIsManualNewsLoading(true);
        setIsManualInputPanelOpen(false);
        
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
            } else {
                 console.error("Lỗi tạo tin tức thủ công: AI không trả về dữ liệu hợp lệ.");
            }
        } catch (e) {
            console.error("Lỗi khi gọi API tạo tin tức thủ công:", e);
        } finally {
            setIsManualNewsLoading(false);
        }
    }, []);
    
    // --- UI Logic Callbacks & Memos ---
    const toggleBreakingNewsMode = useCallback(() => {
        if (animationState !== 'idle') return;
        setAnimationState('flipping');
        setTimeout(() => {
            setIsBreakingNewsMode(prev => {
                if (prev) {
                    setCustomBreakingNewsTitle(null);
                }
                return !prev;
            });
            setNewsItems([]); // Clear news to show loading state
        }, 300);
        setTimeout(() => setAnimationState('idle'), 600);
    }, [animationState]);
    
    const newsString = useMemo(() => {
        if (error) return error;
        if (newsItems.length === 0) return 'Đang tải tin tức...';
        const SEPARATOR = `\u00A0\u00A0●\u00A0\u00A0`;
        const formatNewsItem = (item: string) => `\u00A0\u00A0\u00A0\u00A0\u00A0${item.trim().replace(/\.$/, '')}\u00A0\u00A0\u00A0\u00A0\u00A0`;
        return newsItems.map(formatNewsItem).join(SEPARATOR);
    }, [newsItems, error]);
    
    const switchToNextInfoBar = useCallback(() => {
      if (bottomBarAnimationState !== 'idle') return;
      setBottomBarAnimationState('flipping');
      setTimeout(() => {
          setCurrentInfoBar(prev => INFO_BAR_ORDER[(INFO_BAR_ORDER.indexOf(prev) + 1) % INFO_BAR_ORDER.length]);
          setStockView('vietnam'); setGoldView('domestic'); setFuelView('domestic');
      }, 300);
      setTimeout(() => setBottomBarAnimationState('idle'), 600);
    }, [bottomBarAnimationState]);
    
    const currentCityName = CITIES_FOR_WEATHER[currentCityIndex];
    const currentCityWeather = weatherData ? (weatherData.get(currentCityName) || null) : null;

    // --- Effects ---
    useEffect(() => {
        const runUpdates = () => {
            fetchNews();
            fetchBackgroundData();
        };
        runUpdates();
        const hourlyInterval = setInterval(runUpdates, 60 * 60 * 1000);
        return () => clearInterval(hourlyInterval);
    }, [fetchNews, fetchBackgroundData]);

    useEffect(() => {
        if (currentInfoBar !== 'weather') return;
        const cityInterval = setInterval(() => {
            setCurrentCityIndex(prev => {
                if (prev + 1 >= CITIES_FOR_WEATHER.length) { 
                    switchToNextInfoBar(); 
                    return 0; 
                }
                return prev + 1;
            });
        }, WEATHER_CITY_DURATION);
        return () => clearInterval(cityInterval);
    }, [currentInfoBar, switchToNextInfoBar]);

    useEffect(() => {
        if (currentInfoBar === 'weather' || bottomBarAnimationState !== 'idle') return;
        const switchTimer = setTimeout(switchToNextInfoBar, NON_WEATHER_BAR_DURATION);
        return () => clearTimeout(switchTimer);
    }, [currentInfoBar, bottomBarAnimationState, switchToNextInfoBar]);

    useEffect(() => { if (currentInfoBar === 'stocks') { const i = setInterval(() => setStockView(p => p === 'vietnam' ? 'world' : 'vietnam'), 7000); return () => clearInterval(i); }}, [currentInfoBar]);
    useEffect(() => { if (currentInfoBar === 'gold') { const i = setInterval(() => setGoldView(p => p === 'domestic' ? 'world' : 'domestic'), 7000); return () => clearInterval(i); }}, [currentInfoBar]);
    useEffect(() => { if (currentInfoBar === 'fuel') { const i = setInterval(() => setFuelView(p => p === 'domestic' ? 'world' : 'domestic'), 7000); return () => clearInterval(i); }}, [currentInfoBar]);

    return {
        newsItems, error, vietnamStockData, worldStockData, forexData, goldData, fuelData,
        isBreakingNewsMode, customBreakingNewsTitle, animationState, bottomBarAnimationState, isManualInputPanelOpen, isManualNewsLoading,
        currentInfoBar, stockView, goldView, fuelView,
        currentCityWeather,
        newsString,
        toggleBreakingNewsMode, fetchManualBreakingNews, setIsManualInputPanelOpen
    };
};
