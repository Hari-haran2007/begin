import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: 'purple' | 'blue' | 'green' | 'mixed';
  onClick?: (e?: React.MouseEvent) => void;
}

const gradients = {
  purple: 'from-purple-600/20 to-purple-900/20 border-purple-500/30',
  blue: 'from-blue-600/20 to-blue-900/20 border-blue-500/30',
  green: 'from-green-600/20 to-green-900/20 border-green-500/30',
  mixed: 'from-purple-600/20 via-blue-600/20 to-green-600/20 border-purple-500/30',
};

export function Card({ children, className = '', hover = true, gradient = 'mixed', onClick }: CardProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? { y: -4 } : undefined}
      transition={{ duration: 0.2 }}
      className={`relative backdrop-blur-xl bg-gradient-to-br ${gradients[gradient]} bg-white/5 border rounded-2xl p-6 shadow-xl shadow-black/20 ${className}`}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  subLabel?: string;
  color?: 'purple' | 'blue' | 'green' | 'mixed';
}

export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  label,
  subLabel,
  color = 'purple',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const gradientColors = {
    purple: ['#7c3aed', '#a78bfa'],
    blue: ['#3b82f6', '#60a5fa'],
    green: ['#22c55e', '#4ade80'],
    mixed: ['#7c3aed', '#3b82f6', '#22c55e'],
  };

  const colors = gradientColors[color];
  const gradientId = `gradient-${Math.random().toString(36).slice(2)}`;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[colors.length - 1]} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{ strokeDasharray: circumference, strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-2xl font-bold text-white"
        >
          {value}%
        </motion.span>
        {label && <span className="text-xs text-gray-400">{label}</span>}
        {subLabel && <span className="text-xs text-gray-500">{subLabel}</span>}
      </div>
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  label?: string;
  showValue?: boolean;
  color?: 'purple' | 'blue' | 'green' | 'mixed';
  height?: number;
}

export function ProgressBar({
  value,
  label,
  showValue = true,
  color = 'purple',
  height = 8,
}: ProgressBarProps) {
  const gradientColors = {
    purple: 'from-purple-600 to-purple-400',
    blue: 'from-blue-600 to-blue-400',
    green: 'from-green-600 to-green-400',
    mixed: 'from-purple-600 via-blue-500 to-green-500',
  };

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between mb-2">
          {label && <span className="text-sm text-gray-300">{label}</span>}
          {showValue && <span className="text-sm text-gray-400">{value}%</span>}
        </div>
      )}
      <div
        className="w-full bg-white/10 rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${gradientColors[color]} rounded-full`}
        />
      </div>
    </div>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'risk' | 'medium' | 'good' | 'advanced' | 'placement';
}

const badgeVariants = {
  risk: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  good: 'bg-green-500/20 text-green-400 border-green-500/30',
  advanced: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  placement: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export function Badge({ children, variant = 'medium' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${badgeVariants[variant]}`}
    >
      {children}
    </span>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  gradient?: 'purple' | 'blue' | 'green' | 'mixed';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  gradient = 'mixed',
}: StatCardProps) {
  return (
    <Card gradient={gradient} className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-white/10">{icon}</div>
        {trend && trendValue && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              trend === 'up'
                ? 'bg-green-500/20 text-green-400'
                : trend === 'down'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {trendValue}
          </span>
        )}
      </div>
      <div className="flex-1">
        <p className="text-gray-400 text-sm mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </Card>
  );
}
