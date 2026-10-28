import { ShieldCheck, ShieldAlert, FileSearch, Sparkles } from 'lucide-react';

export type AIVerificationStatus = 'Verified' | 'Suspicious' | 'Needs Review' | 'Original' | 'Pending';

interface AIVerificationBadgeProps {
  status?: AIVerificationStatus;
  confidence?: number;
  className?: string;
}

export function AIVerificationBadge({ status = 'Pending', confidence, className = '' }: AIVerificationBadgeProps) {
  const renderBadge = () => {
    switch (status) {
      case 'Verified':
      case 'Original':
        return (
          <div className="flex items-center shadow-lg shadow-green-500/20 bg-green-500/10 border border-green-500/30 rounded-full px-2 py-1 gap-1 text-xs font-medium text-green-400">
            <ShieldCheck className="w-3.5 h-3.5" /> 
            AI {status} 
            {confidence != null && <span className="opacity-70 ml-1">({confidence}%)</span>}
          </div>
        );
      case 'Suspicious':
        return (
          <div className="flex items-center shadow-lg shadow-red-500/20 bg-red-500/10 border border-red-500/30 rounded-full px-2 py-1 gap-1 text-xs font-medium text-red-400">
            <ShieldAlert className="w-3.5 h-3.5" /> 
            AI Suspicious 
            {confidence != null && <span className="opacity-70 ml-1">({confidence}%)</span>}
          </div>
        );
      case 'Needs Review':
        return (
          <div className="flex items-center shadow-lg shadow-yellow-500/20 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-2 py-1 gap-1 text-xs font-medium text-yellow-400">
            <FileSearch className="w-3.5 h-3.5" /> 
            Needs Review 
            {confidence != null && <span className="opacity-70 ml-1">({confidence}%)</span>}
          </div>
        );
      default:
        return (
          <div className="flex items-center bg-gray-800 text-gray-400 border border-gray-700 rounded-full px-2 py-1 gap-1 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" /> 
            AI Analysis Pending
          </div>
        );
    }
  };

  return (
    <div className={`inline-flex ${className}`}>
      {renderBadge()}
    </div>
  );
}
