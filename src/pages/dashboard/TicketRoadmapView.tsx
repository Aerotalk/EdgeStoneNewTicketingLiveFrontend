import React, { useEffect, useState, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Position
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { getRoadmapData } from '../../services/roadmapService';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import CircuitNode from '../../components/roadmap/CircuitNode';
import TicketNode from '../../components/roadmap/TicketNode';
import SLANode from '../../components/roadmap/SLANode';
import ConversationNode from '../../components/roadmap/ConversationNode';
const nodeTypes = {
  circuit: CircuitNode,
  ticket: TicketNode,
  sla: SLANode,
  conversation: ConversationNode
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // Estimating standard node widths based on our custom components
    let width = 250;
    let height = 150;
    if (node.data?.type === 'sla') { width = 180; height = 80; }
    if (node.data?.type === 'conversation') { width = 120; height = 40; }
    
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x - nodeWithPosition.width / 2,
      y: nodeWithPosition.y - nodeWithPosition.height / 2,
    };

    return node;
  });

  return { nodes, edges };
};

const TicketRoadmapView: React.FC = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const onConnect = useCallback(
        (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    useEffect(() => {
        const fetchGraphData = async () => {
            try {
                setLoading(true);
                const data = await getRoadmapData();
                
                // Map the data to properly use custom node types
                const formattedNodes = (data.nodes || []).map((node: any) => ({
                    ...node,
                    type: node.data?.type || 'default' // This triggers our custom node components!
                }));

                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                    formattedNodes,
                    data.edges || []
                );

                setNodes(layoutedNodes);
                setEdges(layoutedEdges);
            } catch (error) {
                console.error("Failed to fetch roadmap data", error);
                toast.error("Failed to load Roadmap Data");
            } finally {
                setLoading(false);
            }
        };

        fetchGraphData();
    }, [setNodes, setEdges]);

    return (
        <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-900">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex justify-between items-center shadow-sm z-10 relative">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-outfit">Ticket Roadmap</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Visual mapping of Circuits, Tickets, and SLAs</p>
                </div>
            </div>

            <div className="flex-grow w-full relative">
                {loading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    </div>
                )}
                
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    fitView
                    attributionPosition="bottom-right"
                    minZoom={0.1}
                >
                    <Controls />
                    <MiniMap zoomable pannable nodeColor={(n) => {
                        if (n.data?.type === 'circuit') return '#cbd5e1';
                        if (n.data?.type === 'ticket') return '#38bdf8';
                        if (n.data?.type === 'sla') return '#f87171';
                        if (n.data?.type === 'conversation') return '#c084fc';
                        return '#eee';
                    }} />
                    <Background color="#ccc" gap={16} />
                </ReactFlow>
            </div>
        </div>
    );
};

export default TicketRoadmapView;
