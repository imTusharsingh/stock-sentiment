import React, { useState, useMemo } from "react";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import "./DataExport.css";

const DataExport = ({ stock, sentimentData, priceData, onBackToStock }) => {
  const [exportFormat, setExportFormat] = useState("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Prepare CSV data for sentiment analysis
  const sentimentCSVData = useMemo(() => {
    if (!sentimentData?.articles) return [];

    return sentimentData.articles.map((article, index) => ({
      "Article #": index + 1,
      Title: article.title,
      Sentiment: article.sentiment.label,
      "Sentiment Score": article.sentiment.score?.toFixed(3) || "N/A",
      Confidence: article.sentiment.confidence?.toFixed(3) || "N/A",
      URL: article.url,
      "Published Date": article.publishedAt,
    }));
  }, [sentimentData]);

  // Prepare CSV data for stock prices
  const priceCSVData = useMemo(() => {
    if (!priceData?.data) return [];

    return priceData.data.map((item, index) => ({
      Date: item.date,
      Open: item.open,
      High: item.high,
      Low: item.low,
      Close: item.close,
      Volume: item.volume,
      "Daily Return (%)": item.dailyReturn,
    }));
  }, [priceData]);

  // Prepare CSV data for summary
  const summaryCSVData = useMemo(() => {
    if (!sentimentData || !priceData) return [];

    return [
      {
        "Stock Ticker": stock?.ticker || "N/A",
        "Stock Name": stock?.name || "N/A",
        "Overall Sentiment": sentimentData.overallSentiment?.label || "N/A",
        "Sentiment Score":
          sentimentData.overallSentiment?.score?.toFixed(3) || "N/A",
        "Total Articles": sentimentData.totalArticles || 0,
        "Positive Articles": sentimentData.sentimentBreakdown?.positive || 0,
        "Negative Articles": sentimentData.sentimentBreakdown?.negative || 0,
        "Neutral Articles": sentimentData.sentimentBreakdown?.neutral || 0,
        "Current Price": priceData.summary?.currentPrice || "N/A",
        "Total Return (%)": priceData.summary?.totalReturn?.toFixed(2) || "N/A",
        "Days Analyzed": priceData.summary?.daysAnalyzed || 0,
        "Export Date": new Date().toISOString().split("T")[0],
      },
    ];
  }, [stock, sentimentData, priceData]);

  // Generate PDF report
  const generatePDF = async () => {
    if (!stock || !sentimentData || !priceData) return;

    setIsExporting(true);
    setExportProgress(10);

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text("Stock Sentiment Analysis Report", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 15;

      // Stock Info
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${stock.name} (${stock.ticker})`, pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Generated on: ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      yPosition += 20;

      setExportProgress(30);

      // Sentiment Summary
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Sentiment Analysis Summary", 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Overall Sentiment: ${sentimentData.overallSentiment?.label || "N/A"}`,
        20,
        yPosition
      );
      yPosition += 6;
      pdf.text(
        `Sentiment Score: ${
          sentimentData.overallSentiment?.score?.toFixed(3) || "N/A"
        }`,
        20,
        yPosition
      );
      yPosition += 6;
      pdf.text(
        `Total Articles Analyzed: ${sentimentData.totalArticles || 0}`,
        20,
        yPosition
      );
      yPosition += 6;
      pdf.text(
        `Positive: ${sentimentData.sentimentBreakdown?.positive || 0} (${
          sentimentData.sentimentBreakdown?.positivePercentage?.toFixed(1) || 0
        }%)`,
        20,
        yPosition
      );
      yPosition += 6;
      pdf.text(
        `Negative: ${sentimentData.sentimentBreakdown?.negative || 0} (${
          sentimentData.sentimentBreakdown?.negativePercentage?.toFixed(1) || 0
        }%)`,
        20,
        yPosition
      );
      yPosition += 6;
      pdf.text(
        `Neutral: ${sentimentData.sentimentBreakdown?.neutral || 0} (${
          sentimentData.sentimentBreakdown?.neutralPercentage?.toFixed(1) || 0
        }%)`,
        20,
        yPosition
      );
      yPosition += 15;

      setExportProgress(50);

      // Price Summary
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Stock Price Summary", 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Current Price: ₹${priceData.summary?.currentPrice || "N/A"}`,
        20,
        yPosition
      );
      yPosition += 6;
      pdf.text(
        `Total Return: ${priceData.summary?.totalReturn?.toFixed(2) || "N/A"}%`,
        20,
        yPosition
      );
      pdf.text(`Period: ${priceData.period || "N/A"}`, 20, yPosition);
      yPosition += 6;
      pdf.text(
        `Days Analyzed: ${priceData.summary?.daysAnalyzed || 0}`,
        20,
        yPosition
      );
      yPosition += 15;

      setExportProgress(70);

      // Recent Articles (first page)
      if (sentimentData.articles && sentimentData.articles.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Recent News Articles", 20, yPosition);
        yPosition += 8;

        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");

        const articlesToShow = sentimentData.articles.slice(0, 8); // Show first 8 articles
        articlesToShow.forEach((article, index) => {
          if (yPosition > pageHeight - 30) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.text(`${index + 1}. ${article.title}`, 20, yPosition);
          yPosition += 5;
          pdf.text(
            `   Sentiment: ${article.sentiment.label} (Score: ${
              article.sentiment.score?.toFixed(3) || "N/A"
            })`,
            25,
            yPosition
          );
          yPosition += 5;
          pdf.text(`   Date: ${article.publishedAt}`, 25, yPosition);
          yPosition += 8;
        });
      }

      setExportProgress(90);

      // Footer
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "italic");
      pdf.text(
        "Generated by Stock Sentiment Analyzer",
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );

      setExportProgress(100);

      // Save PDF
      pdf.save(
        `${stock.ticker}_sentiment_report_${
          new Date().toISOString().split("T")[0]
        }.pdf`
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  if (!stock || !sentimentData || !priceData) {
    return (
      <div className="data-export-container">
        <div className="text-center p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Data Export
          </h3>
          <p className="text-gray-600">
            No data available for export. Please select a stock first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="data-export-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={onBackToStock}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
          >
            ← Back to Stock Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Data Export: {stock.ticker}
          </h1>
          <p className="text-gray-600 mt-2">
            {stock.name} • Export sentiment analysis and price data
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Export Options
        </h3>

        {/* Export Format Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Format:
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="exportFormat"
                value="csv"
                checked={exportFormat === "csv"}
                onChange={(e) => setExportFormat(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">CSV</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="exportFormat"
                value="pdf"
                checked={exportFormat === "pdf"}
                onChange={(e) => setExportFormat(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">PDF Report</span>
            </label>
          </div>
        </div>

        {/* CSV Export Options */}
        {exportFormat === "csv" && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Sentiment Analysis Data
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Export detailed sentiment analysis for{" "}
                {sentimentData.totalArticles || 0} articles
              </p>
              <div className="text-xs text-gray-500 mb-3">
                <p>
                  • <strong>Sentiment Score:</strong> Model's prediction
                  strength (0.0-1.0)
                </p>
                <p>
                  • <strong>Confidence:</strong> Model's certainty about the
                  prediction (0.0-1.0)
                </p>
              </div>
              <CSVLink
                data={sentimentCSVData}
                filename={`${stock.ticker}_sentiment_analysis_${
                  new Date().toISOString().split("T")[0]
                }.csv`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                📊 Download Sentiment CSV
              </CSVLink>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Stock Price Data
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Export historical price data for {priceData.data?.length || 0}{" "}
                days
              </p>
              <CSVLink
                data={priceCSVData}
                filename={`${stock.ticker}_price_data_${
                  new Date().toISOString().split("T")[0]
                }.csv`}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                📈 Download Price CSV
              </CSVLink>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Summary Report
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Export consolidated summary with key metrics
              </p>
              <div className="text-xs text-gray-500 mb-3">
                <p>
                  • <strong>Sentiment Score:</strong> Overall sentiment strength
                  across all articles
                </p>
                <p>
                  • <strong>Confidence:</strong> Reliability of the overall
                  sentiment analysis
                </p>
              </div>
              <CSVLink
                data={summaryCSVData}
                filename={`${stock.ticker}_summary_report_${
                  new Date().toISOString().split("T")[0]
                }.csv`}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
              >
                📋 Download Summary CSV
              </CSVLink>
            </div>
          </div>
        )}

        {/* PDF Export */}
        {exportFormat === "pdf" && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              PDF Report
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Generate a comprehensive PDF report with sentiment analysis, price
              data, and insights
            </p>

            {isExporting ? (
              <div className="space-y-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  Generating PDF... {exportProgress}%
                </p>
              </div>
            ) : (
              <button
                onClick={generatePDF}
                className="inline-flex items-center px-6 py-3 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                📄 Generate PDF Report
              </button>
            )}
          </div>
        )}

        {/* Export Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Export Information
          </h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>
              • CSV files contain raw data for further analysis in Excel or
              other tools
            </p>
            <p>• PDF reports include formatted summaries and insights</p>
            <p>• All exports include the current date for reference</p>
            <p>
              • Data is exported based on the currently selected time period
            </p>
            <p>
              • <strong>Note:</strong> Sentiment Score and Confidence are
              different metrics - Score shows prediction strength, Confidence
              shows prediction certainty
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExport;
