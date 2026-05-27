import { useMemo } from "react";
import { getBarcodeSvgData } from "../utils/barcodeGenerator";
import { Printer, Tag } from "lucide-react";

interface BarcodeRendererProps {
  value: string;
  productName?: string;
  price?: number;
  currencySymbol?: string;
  height?: number;
  showPrint?: boolean;
}

export default function BarcodeRenderer({
  value,
  productName,
  price,
  currencySymbol = "$",
  height = 50,
  showPrint = false
}: BarcodeRendererProps) {
  const barcodeData = useMemo(() => {
    try {
      return getBarcodeSvgData(value || "SKU-TEMP");
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [value]);

  if (!barcodeData) {
    return <span className="text-[10px] text-rose-500 font-mono font-semibold">Invalid Barcode Range</span>;
  }

  const handlePrint = () => {
    // Generate isolated window style for high resolution label printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup blocked! Enable popups to print barcode stickers.");
      return;
    }

    const priceText = price !== undefined ? `${currencySymbol}${price.toFixed(2)}` : "";
    const nameText = productName ? productName : "Product Stock";

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Product Label - ${value}</title>
          <style>
            @media print {
              @page {
                size: 50mm 30mm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 4px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: 'Courier New', monospace;
                width: 50mm;
                height: 30mm;
                box-sizing: border-box;
                background-color: white;
              }
            }
            body {
              text-align: center;
              padding: 10px;
              color: #000;
              font-family: sans-serif;
            }
            .label-title {
              font-size: 8px;
              font-weight: bold;
              text-transform: uppercase;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 105%;
              margin-bottom: 2px;
            }
            .price-tag {
              font-size: 10px;
              font-weight: 800;
              margin-top: 2px;
            }
            .barcode-svg {
              height: 35px;
              width: auto;
            }
            .barcode-text {
              font-size: 8px;
              letter-spacing: 2px;
              margin-top: 1px;
            }
          </style>
        </head>
        <body>
          <div class="label-title">${nameText}</div>
          <svg class="barcode-svg" viewBox="0 0 ${barcodeData.totalWidth} ${height}" preserveAspectRatio="none">
            ${barcodeData.paths.map(p => `<path d="${p}" stroke="black" stroke-width="2" />`).join("")}
          </svg>
          <div class="barcode-text">${barcodeData.label}</div>
          ${priceText ? `<div class="price-tag">${priceText}</div>` : ""}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col items-center bg-slate-50 border border-slate-150 p-3 rounded-2xl select-none w-full max-w-[240px]">
      <div className="w-full text-center mb-1">
        {productName && (
          <p className="text-[10px] font-extrabold text-slate-700 uppercase truncate max-w-[190px]">
            {productName}
          </p>
        )}
      </div>

      <div className="py-2.5 px-3 bg-white border border-slate-100 rounded-xl flex flex-col items-center w-full">
        <svg 
          className="w-full max-h-[50px]" 
          viewBox={`0 0 ${barcodeData.totalWidth} ${height}`} 
          preserveAspectRatio="none"
          style={{ height: `${height}px` }}
        >
          {barcodeData.paths.map((p, idx) => (
            <path key={idx} d={p} stroke="black" strokeWidth="2.5" />
          ))}
        </svg>
        <div className="text-[9.5px] font-mono font-semibold tracking-wider text-slate-500 mt-1.5 leading-none">
          {barcodeData.label}
        </div>
      </div>

      <div className="flex items-center justify-between w-full mt-2.5">
        <div className="text-left">
          <span className="text-[8px] text-slate-400 font-bold uppercase block leading-none">Format</span>
          <span className="text-[9.5px] font-black text-teal-700 uppercase">{barcodeData.type}</span>
        </div>

        {price !== undefined && (
          <div className="text-right">
            <span className="text-[8px] text-slate-400 font-bold uppercase block leading-none">Retail</span>
            <span className="text-[10px] font-mono font-bold text-slate-800">{currencySymbol}{price.toFixed(2)}</span>
          </div>
        )}

        {showPrint && (
          <button
            onClick={handlePrint}
            title="Print Shelf/Product Label"
            className="p-1 px-2.5 bg-[#093530] hover:bg-[#0c4a43] text-teal-300 rounded-xl flex items-center space-x-1 shadow-sm transition active:scale-95 cursor-pointer ml-1"
          >
            <Printer className="w-3 h-3" />
            <span className="text-[9px] font-bold">Print</span>
          </button>
        )}
      </div>
    </div>
  );
}
