import React from 'react';

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  bgColor: string;
  iconColor: string;
  onClick?: () => void;
}

export function QuickAction({ icon, title, description, bgColor, iconColor, onClick }: QuickActionProps) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left w-full"
    >
      <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
        <div className={iconColor}>{icon}</div>
      </div>
      <div>
        <div className="font-medium text-gray-900">{title}</div>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
    </button>
  );
}
