import { Handle, Position } from '@xyflow/react';
import { Ticket } from 'lucide-react';

const TicketNode = ({ data }: any) => {
  const { details, status } = data;
  const isClosed = status === 'Closed';
  const isHighPriority = details?.priority?.toLowerCase() === 'high';

  return (
    <div className={`px-4 py-3 shadow-md rounded-xl border-2 backdrop-blur-md transition-all duration-300 w-64 relative
      ${isClosed 
        ? 'bg-green-50/90 border-green-300 dark:bg-green-900/30 dark:border-green-700/50' 
        : 'bg-blue-50/90 border-blue-400 dark:bg-blue-900/40 dark:border-blue-500'}`}>
      
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400" />
      
      {isHighPriority && !isClosed && (
        <div className="absolute -inset-1 bg-red-500 rounded-xl blur opacity-40 animate-pulse -z-10"></div>
      )}

      <div className="flex justify-between items-center mb-2">
        <div className={`flex items-center gap-1.5 ${isClosed ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
          <Ticket size={16} />
          <span className="font-bold text-sm">{details.ticketId}</span>
        </div>
        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border
            ${isClosed ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/60 dark:text-green-300' : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/60 dark:text-blue-300'}`}>
            {status}
        </span>
      </div>

      <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1 italic opacity-80">
        "{details.header}"
      </div>
      
      <div className="mt-2 text-[10px] font-mono text-slate-400 dark:text-slate-500">
        Created: {details.date}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-400" />
    </div>
  );
};

export default TicketNode;
