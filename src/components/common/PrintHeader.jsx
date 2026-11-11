import React from "react";

/**
 * Universal Minimalist Black & White Print Header
 * Completely removes clutter (metadata boxes, license numbers, extra footers)
 * 100% Pure Black and White
 */
export const PrintHeader = ({
  title = "OFFICIAL RECORD",
  subtitle = "",
  branch
}) => {
  const branchName = branch?.name || "Downtown Branch";
  const branchCode = branch?.code;
  const branchAddress = branch?.address || "102 Main Street, City Center";
  const branchPhone = branch?.phone || "+92 300 1234567";
  const printedAt = new Date().toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  return (
    <div className="hidden print:block mb-3 text-black font-sans bg-white">
      {/* Top Header - Pure Black & White with Full Branch Details */}
      <div className="border-b-2 border-black pb-2 mb-2 flex items-start justify-between">
        <div>
          <h1 className="text-base font-black tracking-wider uppercase text-black leading-tight">
            PHARMACARE PHARMACY
          </h1>
          <div className="text-[11px] font-bold text-black mt-1">
            <span>Branch: {branchName}</span>
            {branchCode && <span className="ml-1 text-[10px] font-mono font-medium">({branchCode})</span>}
          </div>
          {branchAddress && (
            <div className="text-[10px] text-black font-medium mt-0.5">
              Address: {branchAddress}
            </div>
          )}
          {branchPhone && (
            <div className="text-[10px] text-black font-medium mt-0.5">
              Contact: {branchPhone}
            </div>
          )}
        </div>
        <div className="text-right text-[11px] font-mono font-bold text-black">
          <div>Date: {printedAt}</div>
        </div>
      </div>

      {/* Document Title Header - Clean Single Underline (No Surrounding Box) */}
      <div className="border-b border-black pb-1 mb-2 flex items-center justify-between">
        <div className="text-xs font-black tracking-wider uppercase text-black">
          {title}
        </div>
        {subtitle && (
          <div className="text-[10px] font-bold text-black uppercase">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintHeader;
