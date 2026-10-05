import React from 'react';
import { ShiftHandoverDrawer } from './ShiftHandoverDrawer';

interface GlobalStickyNoteProps {
    isOpen?: boolean;
    onClose?: () => void;
    showFloatingButton?: boolean;
}

export const GlobalStickyNote: React.FC<GlobalStickyNoteProps> = ({
    isOpen = false,
    onClose
}) => {
    return <ShiftHandoverDrawer isOpen={isOpen} onClose={onClose} />;
};

export default GlobalStickyNote;
export { ShiftHandoverDrawer };
