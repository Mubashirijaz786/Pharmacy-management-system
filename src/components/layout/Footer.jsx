import React from "react";

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-100 py-4 px-6 text-center text-xs text-slate-400 font-medium mt-auto">
      <div>
        &copy; {new Date().getFullYear()} PharmaCare ERP. All rights reserved.
      </div>
    </footer>
  );
};
