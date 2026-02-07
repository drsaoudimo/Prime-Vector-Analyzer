import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '', headerAction }) => {
  return (
    <div className={`bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex flex-col ${className}`}>
      <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">{title}</h3>
        {headerAction}
      </div>
      <div className="p-4 flex-grow relative">
        {children}
      </div>
    </div>
  );
};