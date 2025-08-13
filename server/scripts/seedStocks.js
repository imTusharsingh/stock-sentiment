const mongoose = require("mongoose");
const Stock = require("../models/Stock");
require("dotenv").config();

// Sample Indian stock data (top 100 stocks by market cap)
const sampleStocks = [
  {
    ticker: "RELIANCE",
    name: "Reliance Industries Limited",
    exchange: "NSE",
    sector: "Oil & Gas",
    marketCap: 1500000,
  },
  {
    ticker: "TCS",
    name: "Tata Consultancy Services Limited",
    exchange: "NSE",
    sector: "Information Technology",
    marketCap: 1200000,
  },
  {
    ticker: "HDFCBANK",
    name: "HDFC Bank Limited",
    exchange: "NSE",
    sector: "Banking",
    marketCap: 1100000,
  },
  {
    ticker: "INFY",
    name: "Infosys Limited",
    exchange: "NSE",
    sector: "Information Technology",
    marketCap: 1000000,
  },
  {
    ticker: "ICICIBANK",
    name: "ICICI Bank Limited",
    exchange: "NSE",
    sector: "Banking",
    marketCap: 950000,
  },
  {
    ticker: "HINDUNILVR",
    name: "Hindustan Unilever Limited",
    exchange: "NSE",
    sector: "FMCG",
    marketCap: 900000,
  },
  {
    ticker: "ITC",
    name: "ITC Limited",
    exchange: "NSE",
    sector: "FMCG",
    marketCap: 850000,
  },
  {
    ticker: "SBIN",
    name: "State Bank of India",
    exchange: "NSE",
    sector: "Banking",
    marketCap: 800000,
  },
  {
    ticker: "BHARTIARTL",
    name: "Bharti Airtel Limited",
    exchange: "NSE",
    sector: "Telecommunications",
    marketCap: 750000,
  },
  {
    ticker: "AXISBANK",
    name: "Axis Bank Limited",
    exchange: "NSE",
    sector: "Banking",
    marketCap: 700000,
  },
  {
    ticker: "KOTAKBANK",
    name: "Kotak Mahindra Bank Limited",
    exchange: "NSE",
    sector: "Banking",
    marketCap: 650000,
  },
  {
    ticker: "ASIANPAINT",
    name: "Asian Paints Limited",
    exchange: "NSE",
    sector: "Chemicals",
    marketCap: 600000,
  },
  {
    ticker: "MARUTI",
    name: "Maruti Suzuki India Limited",
    exchange: "NSE",
    sector: "Automobile",
    marketCap: 550000,
  },
  {
    ticker: "HCLTECH",
    name: "HCL Technologies Limited",
    exchange: "NSE",
    sector: "Information Technology",
    marketCap: 500000,
  },
  {
    ticker: "SUNPHARMA",
    name: "Sun Pharmaceutical Industries Limited",
    exchange: "NSE",
    sector: "Pharmaceuticals",
    marketCap: 450000,
  },
  {
    ticker: "TATAMOTORS",
    name: "Tata Motors Limited",
    exchange: "NSE",
    sector: "Automobile",
    marketCap: 400000,
  },
  {
    ticker: "WIPRO",
    name: "Wipro Limited",
    exchange: "NSE",
    sector: "Information Technology",
    marketCap: 380000,
  },
  {
    ticker: "ULTRACEMCO",
    name: "UltraTech Cement Limited",
    exchange: "NSE",
    sector: "Cement",
    marketCap: 350000,
  },
  {
    ticker: "TITAN",
    name: "Titan Company Limited",
    exchange: "NSE",
    sector: "Consumer Goods",
    marketCap: 320000,
  },
  {
    ticker: "BAJFINANCE",
    name: "Bajaj Finance Limited",
    exchange: "NSE",
    sector: "Financial Services",
    marketCap: 300000,
  },
  {
    ticker: "NESTLEIND",
    name: "Nestle India Limited",
    exchange: "NSE",
    sector: "FMCG",
    marketCap: 280000,
  },
  {
    ticker: "POWERGRID",
    name: "Power Grid Corporation of India Limited",
    exchange: "NSE",
    sector: "Power",
    marketCap: 260000,
  },
  {
    ticker: "BAJAJFINSV",
    name: "Bajaj Finserv Limited",
    exchange: "NSE",
    sector: "Financial Services",
    marketCap: 240000,
  },
  {
    ticker: "NTPC",
    name: "NTPC Limited",
    exchange: "NSE",
    sector: "Power",
    marketCap: 220000,
  },
  {
    ticker: "ONGC",
    name: "Oil & Natural Gas Corporation Limited",
    exchange: "NSE",
    sector: "Oil & Gas",
    marketCap: 200000,
  },
  {
    ticker: "ADANIENT",
    name: "Adani Enterprises Limited",
    exchange: "NSE",
    sector: "Conglomerate",
    marketCap: 180000,
  },
  {
    ticker: "JSWSTEEL",
    name: "JSW Steel Limited",
    exchange: "NSE",
    sector: "Metals",
    marketCap: 160000,
  },
  {
    ticker: "TATASTEEL",
    name: "Tata Steel Limited",
    exchange: "NSE",
    sector: "Metals",
    marketCap: 140000,
  },
  {
    ticker: "HINDALCO",
    name: "Hindalco Industries Limited",
    exchange: "NSE",
    sector: "Metals",
    marketCap: 120000,
  },
  {
    ticker: "DRREDDY",
    name: "Dr. Reddy's Laboratories Limited",
    exchange: "NSE",
    sector: "Pharmaceuticals",
    marketCap: 100000,
  },
  {
    ticker: "BRITANNIA",
    name: "Britannia Industries Limited",
    exchange: "NSE",
    sector: "FMCG",
    marketCap: 95000,
  },
  {
    ticker: "DIVISLAB",
    name: "Divi's Laboratories Limited",
    exchange: "NSE",
    sector: "Pharmaceuticals",
    marketCap: 90000,
  },
  {
    ticker: "SHREECEM",
    name: "Shree Cement Limited",
    exchange: "NSE",
    sector: "Cement",
    marketCap: 85000,
  },
  {
    ticker: "CIPLA",
    name: "Cipla Limited",
    exchange: "NSE",
    sector: "Pharmaceuticals",
    marketCap: 80000,
  },
  {
    ticker: "HEROMOTOCO",
    name: "Hero MotoCorp Limited",
    exchange: "NSE",
    sector: "Automobile",
    marketCap: 75000,
  },
  {
    ticker: "INDUSINDBK",
    name: "IndusInd Bank Limited",
    exchange: "NSE",
    sector: "Banking",
    marketCap: 70000,
  },
  {
    ticker: "VEDL",
    name: "Vedanta Limited",
    exchange: "NSE",
    sector: "Metals",
    marketCap: 65000,
  },
  {
    ticker: "COALINDIA",
    name: "Coal India Limited",
    exchange: "NSE",
    sector: "Mining",
    marketCap: 60000,
  },
  {
    ticker: "EICHERMOT",
    name: "Eicher Motors Limited",
    exchange: "NSE",
    sector: "Automobile",
    marketCap: 55000,
  },
  {
    ticker: "BPCL",
    name: "Bharat Petroleum Corporation Limited",
    exchange: "NSE",
    sector: "Oil & Gas",
    marketCap: 50000,
  },
  {
    ticker: "TECHM",
    name: "Tech Mahindra Limited",
    exchange: "NSE",
    sector: "Information Technology",
    marketCap: 45000,
  },
  {
    ticker: "GRASIM",
    name: "Grasim Industries Limited",
    exchange: "NSE",
    sector: "Cement",
    marketCap: 40000,
  },
  {
    ticker: "MM",
    name: "Mahindra & Mahindra Limited",
    exchange: "NSE",
    sector: "Automobile",
    marketCap: 38000,
  },
  {
    ticker: "LT",
    name: "Larsen & Toubro Limited",
    exchange: "NSE",
    sector: "Construction",
    marketCap: 35000,
  },
  {
    ticker: "ADANIPORTS",
    name: "Adani Ports and Special Economic Zone Limited",
    exchange: "NSE",
    sector: "Infrastructure",
    marketCap: 32000,
  },
  {
    ticker: "SBILIFE",
    name: "SBI Life Insurance Company Limited",
    exchange: "NSE",
    sector: "Insurance",
    marketCap: 30000,
  },
  {
    ticker: "HDFCLIFE",
    name: "HDFC Life Insurance Company Limited",
    exchange: "NSE",
    sector: "Insurance",
    marketCap: 28000,
  },
  {
    ticker: "ICICIGI",
    name: "ICICI Lombard General Insurance Company Limited",
    exchange: "NSE",
    sector: "Insurance",
    marketCap: 26000,
  },
  {
    ticker: "CHOLAFIN",
    name: "Cholamandalam Investment and Finance Company Limited",
    exchange: "NSE",
    sector: "Financial Services",
    marketCap: 24000,
  },
  {
    ticker: "BERGEPAINT",
    name: "Berger Paints India Limited",
    exchange: "NSE",
    sector: "Chemicals",
    marketCap: 22000,
  },
  {
    ticker: "DABUR",
    name: "Dabur India Limited",
    exchange: "NSE",
    sector: "FMCG",
    marketCap: 20000,
  },
  {
    ticker: "COLPAL",
    name: "Colgate-Palmolive (India) Limited",
    exchange: "NSE",
    sector: "FMCG",
    marketCap: 18000,
  },
  {
    ticker: "GODREJCP",
    name: "Godrej Consumer Products Limited",
    exchange: "NSE",
    sector: "FMCG",
    marketCap: 16000,
  },
  {
    ticker: "MARICO",
    name: "Marico Limited",
    exchange: "NSE",
    sector: "FMCG",
    marketCap: 14000,
  },
  {
    ticker: "UBL",
    name: "United Breweries Limited",
    exchange: "NSE",
    sector: "Beverages",
    marketCap: 12000,
  },
  {
    ticker: "VBL",
    name: "Varun Beverages Limited",
    exchange: "NSE",
    sector: "Beverages",
    marketCap: 10000,
  },
];

async function seedStocks() {
  try {
    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/stock-sentiment";
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // Clear existing stocks
    await Stock.deleteMany({});
    console.log("🗑️  Cleared existing stocks");

    // Insert new stocks
    const result = await Stock.insertMany(sampleStocks);
    console.log(`✅ Inserted ${result.length} stocks successfully`);

    // Create indexes
    await Stock.createIndexes();
    console.log("✅ Indexes created");

    console.log("🎉 Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the seeding function
if (require.main === module) {
  seedStocks();
}

module.exports = { seedStocks };
