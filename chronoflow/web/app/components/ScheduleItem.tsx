import React from 'react';

interface ScheduleItemProps {
  title: string;
  time: string;
  description: string;
  type: 'focus' | 'meeting' | 'important';
  badge: string;
}

export function ScheduleItem({ title, time, description, type, badge }: ScheduleItemProps) {
  const getColorClasses = () => {
    switch (type) {
      case 'focus':
        return {
          bg: 'bg-teal-50 border-teal-200',
          line: 'bg-teal-600',
          badge: 'bg-teal-100 text-teal-800'
        };
      case 'meeting':
        return {
          bg: 'bg-gray-50',
          line: 'bg-blue-500',
          badge: 'bg-gray-100 text-gray-700 border border-gray-200'
        };
      case 'important':
        return {
          bg: 'bg-gray-50',
          line: 'bg-orange-500',
          badge: 'bg-orange-100 text-orange-800'
        };
      default:
        return {
          bg: 'bg-gray-50',
          line: 'bg-gray-500',
          badge: 'bg-gray-100 text-gray-700'
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg ${colors.bg}`}>
      <div className={`w-1 h-12 ${colors.line} rounded-full`}></div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-gray-900">{title}</h4>
          <span className="text-sm text-gray-600">{time}</span>
        </div>
        <p className="text-sm text-gray-600 mb-2">{description}</p>
        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${colors.badge}`}>
          {badge}
        </span>
      </div>
    </div>
  );
}
