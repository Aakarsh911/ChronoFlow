import React from 'react';

interface DashboardCardProps {
  title: string;
  icon: React.ReactNode;
  value: string;
  description: string;
  badge?: {
    text: string;
    variant: 'success' | 'default' | 'outline';
  };
}

export function DashboardCard({ title, icon, value, description, badge }: DashboardCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <div className="text-gray-400">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      {badge && (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          badge.variant === 'success' ? 'bg-green-100 text-green-800' :
          badge.variant === 'outline' ? 'bg-gray-100 text-gray-700 border border-gray-200' :
          'bg-gray-100 text-gray-700'
        }`}>
          {badge.text}
        </span>
      )}
    </div>
  );
}
