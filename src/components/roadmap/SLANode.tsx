import { Handle, Position } from '@xyflow/react';
import { AlertTriangle, Clock } from 'lucide-react';

const SLANode = ({ data }: any) => {
  const { details, status } = data;
  const isBreached = status === 'Breached';

  return (
    <div className={`px-4 py-2 shadow-sm rounded-lg border-2 backdrop-blur-md transition-all duration-300 min-w-[180px] text-center relative
      ${isBreached 
        ? 'bg-red-50/90 border-red-400 dark:bg-red-900/40 dark:border-red-500/80' 
        : 'bg-yellow-50/90 border-yellow-400 dark:bg-yellow-900/40 dark:border-yellow-500/80'}`}>
      
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-400" />
      
      {isBreached && (
        <div className="absolute -inset-1 bg-red-500 rounded-lg blur opacity-30 animate-pulse -z-10"></div>
      )}

      <div className={`flex items-center justify-center gap-2 font-bold text-sm mb-1 ${isBreached ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
        {isBreached ? <AlertTriangle size={16} className="animate-bounce" /> : <Clock size={16} />}
        <span>SLA: {details.type}</span>
      </div>
      <div className={`text-[10px] font-mono tracking-wider uppercase ${isBreached ? 'text-red-600 dark:text-red-300' : 'text-yellow-600 dark:text-yellow-300'}`}>
        {status}
      </div>

    </div>
  );
};

export default SLANode;
