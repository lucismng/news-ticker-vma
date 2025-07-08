
export interface RssItem {
  title: string;
  description: string;
  // Other properties are available but not used in this app
}

export interface RssResponse {
  status: string;
  items: RssItem[];
}

export interface WeatherData {
  city: string;
  tempMin: number;
  tempMax: number;
  humidity: number;
  rainChance: number;
}

export interface StockData {
  index: string;
  value: number;
  change: number;
  percentChange: number;
}

export interface ForexData {
  code: string;
  buy: number;
  sell: number;
}

export interface GoldData {
  name: string;
  buy: number;
  sell: number;
}

export interface WorldGoldData {
    name: string;
    price: number;
}

export interface GoldPrices {
    domestic: GoldData[];
    world: WorldGoldData[];
}

export interface FuelData {
    name: string;
    price: number;
}

export interface FuelPrices {
    domestic: FuelData[];
    world: FuelData[];
}
