import { Handle, Position } from '@xyflow/react';
import { MessageCircle } from 'lucide-react';

const ConversationNode = ({ data }: any) => {
  // data.label = 'Replies: 5'
  const replyCount = data.label.split(': ')[1];

  return (
    <div className="px-3 py-2 shadow-sm rounded-full border border-purple-200 bg-purple-50/90 dark:bg-purple-900/40 dark:border-purple-700/50 flex items-center gap-2 backdrop-blur-md">
      <Handle type="target" position={Position.Top} className="w-1 h-1 bg-transparent border-0" />
      
      <div className="bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 p-1 rounded-full">
         <MessageCircle size={14} />
      </div>
      <span className="text-xs font-bold text-purple-800 dark:text-purple-300">
        {replyCount} Replies
      </span>
    </div>
  );
};

export default ConversationNode;
