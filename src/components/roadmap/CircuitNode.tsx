import { Handle, Position } from '@xyflow/react';
import { Server, User, Building } from 'lucide-react';

const CircuitNode = ({ data }: any) => {
  const { details, status } = data;
  const isProtected = status === 'PROTECTED';

  return (
    <div className={`px-4 py-3 shadow-lg rounded-xl border-2 backdrop-blur-md transition-all duration-300 hover:shadow-xl
      ${isProtected 
        ? 'bg-indigo-50/90 border-indigo-300 dark:bg-indigo-900/40 dark:border-indigo-600' 
        : 'bg-slate-50/90 border-slate-300 dark:bg-slate-800/40 dark:border-slate-600'}
      w-72 relative`}>
      
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400" />
      
      {/* Animated Glow for Protected */}
      {isProtected && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-30 animate-pulse -z-10"></div>
      )}

      <div className="flex items-center gap-2 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
        <div className={`p-2 rounded-lg ${isProtected ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
          <Server size={18} />
        </div>
        <div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 font-outfit">Circuit</h3>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{details.customerCircuitId || 'N/A'}</span>
        </div>
        {isProtected && (
            <span className="ml-auto text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200 dark:bg-indigo-900/50 dark:border-indigo-700 dark:text-indigo-300">Protected</span>
        )}
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-start gap-2">
           <User size={14} className="text-blue-500 mt-0.5 shrink-0" />
           <div>
             <span className="font-semibold text-slate-700 dark:text-slate-300">Client:</span> <span className="text-slate-600 dark:text-slate-400">{details.client?.name || 'N/A'}</span>
           </div>
        </div>
        <div className="flex items-start gap-2">
           <Building size={14} className="text-orange-500 mt-0.5 shrink-0" />
           <div>
             <span className="font-semibold text-slate-700 dark:text-slate-300">Vendor:</span> <span className="text-slate-600 dark:text-slate-400">{details.vendor?.name || 'N/A'}</span>
           </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-400" />
    </div>
  );
};

export default CircuitNode;
