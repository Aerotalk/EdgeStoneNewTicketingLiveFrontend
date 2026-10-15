import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    List,
    ListOrdered,
    Table as TableIcon,
    Link2,
    Undo,
    Redo,
    Eraser,
    Palette,
    Highlighter,
    Plus,
    Trash2,
    Columns2,
    Rows2,
    X
} from 'lucide-react';

interface RichMailComposerProps {
    valueHtml: string;
    onChange: (html: string, plainText: string) => void;
    placeholder?: string;
    signatureHtml?: string;
    minHeight?: string;
    autoFocus?: boolean;
    disabled?: boolean;
}

// Curated Outlook-grade color swatches
const TEXT_COLORS = [
    { label: 'Default', color: '#1f2937' },
    { label: 'Dark Blue', color: '#1e3a8a' },
    { label: 'Blue', color: '#2563eb' },
    { label: 'Teal', color: '#0d9488' },
    { label: 'Green', color: '#16a34a' },
    { label: 'Orange', color: '#ea580c' },
    { label: 'Red', color: '#dc2626' },
    { label: 'Purple', color: '#7c3aed' },
    { label: 'Muted Gray', color: '#6b7280' }
];

const HIGHLIGHT_COLORS = [
    { label: 'None', color: 'transparent' },
    { label: 'Yellow', color: '#fef08a' },
    { label: 'Green', color: '#bbf7d0' },
    { label: 'Cyan', color: '#bae6fd' },
    { label: 'Pink', color: '#fbcfe8' },
    { label: 'Orange', color: '#fed7aa' }
];

export const RichMailComposer: React.FC<RichMailComposerProps> = ({
    valueHtml,
    onChange,
    placeholder = 'Type your message here...',
    signatureHtml,
    minHeight = '180px',
    autoFocus = false,
    disabled = false
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const [showTablePicker, setShowTablePicker] = useState(false);
    const [tableHoverRows, setTableHoverRows] = useState(3);
    const [tableHoverCols, setTableHoverCols] = useState(3);
    const [selectedTable, setSelectedTable] = useState<HTMLTableElement | null>(null);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');
    const savedRangeRef = useRef<Range | null>(null);

    // Synchronize initial or external valueHtml changes without breaking typing cursor
    useEffect(() => {
        if (!editorRef.current) return;
        if (editorRef.current.innerHTML !== valueHtml && document.activeElement !== editorRef.current) {
            editorRef.current.innerHTML = valueHtml || '';
        }
    }, [valueHtml]);

    // Handle autoFocus
    useEffect(() => {
        if (autoFocus && editorRef.current) {
            editorRef.current.focus();
        }
    }, [autoFocus]);

    // Save selection range before opening modals/popups
    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const restoreSelection = () => {
        const sel = window.getSelection();
        if (sel && savedRangeRef.current) {
            sel.removeAllRanges();
            sel.addRange(savedRangeRef.current);
        }
    };

    // Emit changes back to parent
    const emitChange = useCallback(() => {
        if (!editorRef.current) return;
        const html = editorRef.current.innerHTML;
        const plainText = editorRef.current.innerText || '';
        onChange(html, plainText);
    }, [onChange]);

    // Execute standard formatting commands
    const execCommand = (command: string, value: string | undefined = undefined) => {
        if (disabled) return;
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        emitChange();
    };

    // Track active table under cursor
    const handleEditorClick = () => {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode) {
            setSelectedTable(null);
            return;
        }
        let node: Node | null = sel.anchorNode;
        while (node && node !== editorRef.current) {
            if (node.nodeName === 'TABLE') {
                setSelectedTable(node as HTMLTableElement);
                return;
            }
            node = node.parentNode;
        }
        setSelectedTable(null);
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // Table Operations (Outlook-style)
    // ─────────────────────────────────────────────────────────────────────────────
    const insertTable = (rows: number, cols: number) => {
        restoreSelection();
        editorRef.current?.focus();

        let tableHtml = `<table class="edgestone-table" style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;border:1px solid #cbd5e1;"><thead><tr>`;
        for (let c = 0; c < cols; c++) {
            tableHtml += `<th style="background-color:#f1f5f9;color:#0f172a;font-weight:700;padding:8px 12px;border:1px solid #cbd5e1;text-align:left;">Header ${c + 1}</th>`;
        }
        tableHtml += `</tr></thead><tbody>`;
        for (let r = 0; r < rows - 1; r++) {
            tableHtml += `<tr>`;
            for (let c = 0; c < cols; c++) {
                tableHtml += `<td style="padding:8px 12px;border:1px solid #cbd5e1;color:#334155;">Data</td>`;
            }
            tableHtml += `</tr>`;
        }
        tableHtml += `</tbody></table><p><br></p>`;

        document.execCommand('insertHTML', false, tableHtml);
        setShowTablePicker(false);
        emitChange();
    };

    const addTableRow = (below = true) => {
        if (!selectedTable) return;
        const sel = window.getSelection();
        let targetRow: HTMLTableRowElement | null = null;
        let node: Node | null = sel?.anchorNode || null;
        while (node && node !== selectedTable) {
            if (node.nodeName === 'TR') {
                targetRow = node as HTMLTableRowElement;
                break;
            }
            node = node.parentNode;
        }

        const colCount = selectedTable.rows[0]?.cells.length || 2;
        const newRow = document.createElement('tr');
        for (let i = 0; i < colCount; i++) {
            const td = document.createElement('td');
            td.style.padding = '8px 12px';
            td.style.border = '1px solid #cbd5e1';
            td.style.color = '#334155';
            td.innerHTML = '<br>';
            newRow.appendChild(td);
        }

        const parent = targetRow ? targetRow.parentNode : selectedTable.querySelector('tbody') || selectedTable;
        if (targetRow && !below) {
            parent?.insertBefore(newRow, targetRow);
        } else if (targetRow && below) {
            targetRow.after(newRow);
        } else {
            parent?.appendChild(newRow);
        }
        emitChange();
    };

    const addTableColumn = (right = true) => {
        if (!selectedTable) return;
        const sel = window.getSelection();
        let cellIndex = -1;
        let node: Node | null = sel?.anchorNode || null;
        while (node && node !== selectedTable) {
            if (node.nodeName === 'TD' || node.nodeName === 'TH') {
                cellIndex = (node as HTMLTableCellElement).cellIndex;
                break;
            }
            node = node.parentNode;
        }

        const rows = Array.from(selectedTable.rows);
        rows.forEach(r => {
            const isHeader = r.parentNode?.nodeName === 'THEAD' || r.cells[0]?.nodeName === 'TH';
            const cell = document.createElement(isHeader ? 'th' : 'td');
            cell.style.padding = '8px 12px';
            cell.style.border = '1px solid #cbd5e1';
            if (isHeader) {
                cell.style.backgroundColor = '#f1f5f9';
                cell.style.fontWeight = '700';
                cell.innerText = 'New Column';
            } else {
                cell.style.color = '#334155';
                cell.innerHTML = '<br>';
            }

            if (cellIndex >= 0 && !right) {
                r.insertBefore(cell, r.cells[cellIndex]);
            } else if (cellIndex >= 0 && right && cellIndex + 1 < r.cells.length) {
                r.insertBefore(cell, r.cells[cellIndex + 1]);
            } else {
                r.appendChild(cell);
            }
        });
        emitChange();
    };

    const deleteTableRow = () => {
        if (!selectedTable) return;
        const sel = window.getSelection();
        let targetRow: HTMLTableRowElement | null = null;
        let node: Node | null = sel?.anchorNode || null;
        while (node && node !== selectedTable) {
            if (node.nodeName === 'TR') {
                targetRow = node as HTMLTableRowElement;
                break;
            }
            node = node.parentNode;
        }
        if (targetRow) {
            targetRow.remove();
            if (selectedTable.rows.length === 0) {
                selectedTable.remove();
                setSelectedTable(null);
            }
            emitChange();
        }
    };

    const deleteTableColumn = () => {
        if (!selectedTable) return;
        const sel = window.getSelection();
        let cellIndex = -1;
        let node: Node | null = sel?.anchorNode || null;
        while (node && node !== selectedTable) {
            if (node.nodeName === 'TD' || node.nodeName === 'TH') {
                cellIndex = (node as HTMLTableCellElement).cellIndex;
                break;
            }
            node = node.parentNode;
        }
        if (cellIndex >= 0) {
            Array.from(selectedTable.rows).forEach(r => {
                if (r.cells[cellIndex]) {
                    r.deleteCell(cellIndex);
                }
            });
            if (selectedTable.rows[0]?.cells.length === 0) {
                selectedTable.remove();
                setSelectedTable(null);
            }
            emitChange();
        }
    };

    const deleteTable = () => {
        if (selectedTable) {
            selectedTable.remove();
            setSelectedTable(null);
            emitChange();
        }
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // Clipboard / Paste Engine: Microsoft Outlook, Word, Excel & TSV Handler
    // ─────────────────────────────────────────────────────────────────────────────
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const clipboard = e.clipboardData;
        const html = clipboard.getData('text/html');
        const text = clipboard.getData('text/plain');

        // 1. If clipboard contains HTML (from Outlook, Word, Excel, or web)
        if (html) {
            let clean = html;

            // Check if HTML contains table markup
            if (/<table[\s>]/i.test(clean)) {
                // Remove Word/Office XML & comments
                clean = clean
                    .replace(/<style[\s\S]*?<\/style>/gi, '')
                    .replace(/<script[\s\S]*?<\/script>/gi, '')
                    .replace(/<!--[\s\S]*?-->/gi, '')
                    .replace(/<\/?o:[^>]*>/gi, '')
                    .replace(/<\/?w:[^>]*>/gi, '')
                    .replace(/<\/?m:[^>]*>/gi, '');

                // Ensure tables have modern classes and crisp borders
                clean = clean.replace(/<table\b[^>]*>/gi, '<table class="edgestone-table" style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;border:1px solid #cbd5e1;">');
                clean = clean.replace(/<th\b([^>]*)>/gi, (_, attrs) => {
                    return `<th style="background-color:#f1f5f9;color:#0f172a;font-weight:700;padding:8px 12px;border:1px solid #cbd5e1;text-align:left;" ${attrs || ''}>`;
                });
                clean = clean.replace(/<td\b([^>]*)>/gi, (_, attrs) => {
                    return `<td style="padding:8px 12px;border:1px solid #cbd5e1;color:#334155;vertical-align:top;" ${attrs || ''}>`;
                });

                document.execCommand('insertHTML', false, clean);
                emitChange();
                return;
            }

            // Normal HTML paste (clean Word junk while keeping bold, italic, links, lists)
            clean = clean
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<!--[\s\S]*?-->/gi, '')
                .replace(/<\/?o:[^>]*>/gi, '')
                .replace(/<\/?w:[^>]*>/gi, '')
                .replace(/class="Mso[^"]*"/gi, '');

            document.execCommand('insertHTML', false, clean);
            emitChange();
            return;
        }

        // 2. If clipboard is plain text: Check if it's Tab-Separated Values (TSV) from Excel / Sheets
        if (text && text.includes('\t') && text.includes('\n')) {
            const rows = text.trim().split('\n').map(r => r.split('\t'));
            if (rows.length > 0 && rows[0].length > 1) {
                let tableHtml = `<table class="edgestone-table" style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;border:1px solid #cbd5e1;"><thead><tr>`;
                rows[0].forEach((cell, idx) => {
                    tableHtml += `<th style="background-color:#f1f5f9;color:#0f172a;font-weight:700;padding:8px 12px;border:1px solid #cbd5e1;text-align:left;">${cell.trim() || `Col ${idx + 1}`}</th>`;
                });
                tableHtml += `</tr></thead><tbody>`;
                for (let r = 1; r < rows.length; r++) {
                    tableHtml += `<tr>`;
                    rows[r].forEach(cell => {
                        tableHtml += `<td style="padding:8px 12px;border:1px solid #cbd5e1;color:#334155;">${cell.trim() || '<br>'}</td>`;
                    });
                    tableHtml += `</tr>`;
                }
                tableHtml += `</tbody></table><p><br></p>`;

                document.execCommand('insertHTML', false, tableHtml);
                emitChange();
                return;
            }
        }

        // 3. Fallback: clean plain text with converted line breaks
        if (text) {
            const cleanText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            document.execCommand('insertHTML', false, cleanText);
            emitChange();
        }
    };

    // Link modal submit
    const handleInsertLink = () => {
        restoreSelection();
        if (linkUrl) {
            let finalUrl = linkUrl.trim();
            if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith('mailto:')) {
                finalUrl = 'https://' + finalUrl;
            }
            const display = linkText.trim() || finalUrl;
            const linkHtml = `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">${display}</a>`;
            document.execCommand('insertHTML', false, linkHtml);
            emitChange();
        }
        setShowLinkModal(false);
        setLinkUrl('');
        setLinkText('');
    };

    return (
        <div className="flex flex-col bg-white border border-gray-200/90 rounded-[20px] shadow-xs overflow-hidden transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/40">
            {/* Outlook-Style Formatting Ribbon / Toolbar */}
            <div className="flex flex-wrap items-center gap-1 px-4 py-2 bg-[#f8fafc] border-b border-gray-200/80 select-none text-gray-700">
                {/* History */}
                <button
                    type="button"
                    onClick={() => execCommand('undo')}
                    className="p-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200 shadow-2xs"
                    title="Undo (Ctrl+Z)"
                >
                    <Undo size={15} />
                </button>
                <button
                    type="button"
                    onClick={() => execCommand('redo')}
                    className="p-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200 shadow-2xs"
                    title="Redo (Ctrl+Y)"
                >
                    <Redo size={15} />
                </button>

                <div className="h-4 w-px bg-gray-200 mx-1"></div>

                {/* Typography formatting */}
                <button
                    type="button"
                    onClick={() => execCommand('bold')}
                    className="p-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200 font-bold"
                    title="Bold (Ctrl+B)"
                >
                    <Bold size={15} />
                </button>
                <button
                    type="button"
                    onClick={() => execCommand('italic')}
                    className="p-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    title="Italic (Ctrl+I)"
                >
                    <Italic size={15} />
                </button>
                <button
                    type="button"
                    onClick={() => execCommand('underline')}
                    className="p-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    title="Underline (Ctrl+U)"
                >
                    <Underline size={15} />
                </button>
                <button
                    type="button"
                    onClick={() => execCommand('strikeThrough')}
                    className="p-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    title="Strikethrough"
                >
                    <Strikethrough size={15} />
                </button>

                <div className="h-4 w-px bg-gray-200 mx-1"></div>

                {/* Colors */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            saveSelection();
                            setShowColorPicker(prev => !prev);
                            setShowHighlightPicker(false);
                            setShowTablePicker(false);
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200 text-xs font-semibold"
                        title="Font Color"
                    >
                        <Palette size={15} className="text-gray-600" />
                    </button>
                    {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 grid grid-cols-3 gap-1.5 w-36">
                            {TEXT_COLORS.map(c => (
                                <button
                                    key={c.color}
                                    type="button"
                                    onClick={() => {
                                        restoreSelection();
                                        execCommand('foreColor', c.color);
                                        setShowColorPicker(false);
                                    }}
                                    className="w-full h-7 rounded-md flex items-center justify-center border border-gray-200 hover:scale-105 transition-transform"
                                    style={{ backgroundColor: c.color }}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            saveSelection();
                            setShowHighlightPicker(prev => !prev);
                            setShowColorPicker(false);
                            setShowTablePicker(false);
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200 text-xs font-semibold"
                        title="Highlight Color"
                    >
                        <Highlighter size={15} className="text-gray-600" />
                    </button>
                    {showHighlightPicker && (
                        <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 grid grid-cols-3 gap-1.5 w-36">
                            {HIGHLIGHT_COLORS.map(c => (
                                <button
                                    key={c.label}
                                    type="button"
                                    onClick={() => {
                                        restoreSelection();
                                        execCommand('hiliteColor', c.color);
                                        setShowHighlightPicker(false);
                                    }}
                                    className="w-full h-7 rounded-md flex items-center justify-center border border-gray-200 hover:scale-105 transition-transform text-[10px] font-bold"
                                    style={{ backgroundColor: c.color }}
                                    title={c.label}
                                >
                                    {c.color === 'transparent' ? '✕' : ''}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="h-4 w-px bg-gray-200 mx-1"></div>

                {/* Alignment */}
                <button
                    type="button"
                    onClick={() => execCommand('justifyLeft')}
                    className="p-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    title="Align Left"
                >
                    <AlignLeft size={15} />
                </button>
                <button
                    type="button"
                    onClick={() => execCommand('justifyCenter')}
                    className="p-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    title="Align Center"
                >
                    <AlignCenter size={15} />
                </button>
                <button
                    type="button"
                    onClick={() => execCommand('justifyRight')}
                    className="p-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    title="Align Right"
                >
                    <AlignRight size={15} />
                </button>

                <div className="h-4 w-px bg-gray-200 mx-1"></div>

                {/* Lists */}
                <button
                    type="button"
                    onClick={() => execCommand('insertUnorderedList')}
                    className="p-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    title="Bulleted List"
                >
                    <List size={15} />
                </button>
                <button
                    type="button"
                    onClick={() => execCommand('insertOrderedList')}
                    className="p-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    title="Numbered List"
                >
                    <ListOrdered size={15} />
                </button>

                <div className="h-4 w-px bg-gray-200 mx-1"></div>

                {/* Table Insert Tool */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            saveSelection();
                            setShowTablePicker(prev => !prev);
                            setShowColorPicker(false);
                            setShowHighlightPicker(false);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-white hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-gray-200 text-xs font-semibold text-gray-700 shadow-2xs"
                        title="Insert Table"
                    >
                        <TableIcon size={15} className="text-blue-600" />
                        <span>Table</span>
                    </button>

                    {showTablePicker && (
                        <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 w-56 flex flex-col gap-2">
                            <div className="text-xs font-bold text-gray-700">
                                Insert Table: {tableHoverCols} × {tableHoverRows}
                            </div>
                            <div className="grid grid-cols-5 gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100">
                                {[1, 2, 3, 4, 5].map(r => (
                                    <React.Fragment key={r}>
                                        {[1, 2, 3, 4, 5].map(c => (
                                            <div
                                                key={`${r}-${c}`}
                                                onMouseEnter={() => {
                                                    setTableHoverRows(r);
                                                    setTableHoverCols(c);
                                                }}
                                                onClick={() => insertTable(r, c)}
                                                className={`w-7 h-7 rounded-sm border cursor-pointer transition-all ${
                                                    r <= tableHoverRows && c <= tableHoverCols
                                                        ? 'bg-blue-100 border-blue-400'
                                                        : 'bg-white border-gray-200'
                                                }`}
                                            />
                                        ))}
                                    </React.Fragment>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => insertTable(tableHoverRows, tableHoverCols)}
                                className="w-full py-1.5 text-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                                Insert {tableHoverCols} × {tableHoverRows}
                            </button>
                        </div>
                    )}
                </div>

                {/* Contextual Table Editing Toolbar (Appears when user clicks inside a table) */}
                {selectedTable && (
                    <div className="flex items-center gap-1 bg-blue-50/80 px-2 py-1 rounded-lg border border-blue-200/80 text-blue-800 ml-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mr-1">Table:</span>
                        <button
                            type="button"
                            onClick={() => addTableRow(true)}
                            className="p-1 hover:bg-blue-100 rounded text-xs flex items-center gap-1"
                            title="Add Row Below"
                        >
                            <Rows2 size={13} />
                            <Plus size={10} />
                        </button>
                        <button
                            type="button"
                            onClick={() => addTableColumn(true)}
                            className="p-1 hover:bg-blue-100 rounded text-xs flex items-center gap-1"
                            title="Add Column Right"
                        >
                            <Columns2 size={13} />
                            <Plus size={10} />
                        </button>
                        <button
                            type="button"
                            onClick={deleteTableRow}
                            className="p-1 hover:bg-red-100 text-red-600 rounded text-xs flex items-center gap-1"
                            title="Delete Row"
                        >
                            <Rows2 size={13} />
                            <Trash2 size={10} />
                        </button>
                        <button
                            type="button"
                            onClick={deleteTableColumn}
                            className="p-1 hover:bg-red-100 text-red-600 rounded text-xs flex items-center gap-1"
                            title="Delete Column"
                        >
                            <Columns2 size={13} />
                            <Trash2 size={10} />
                        </button>
                        <button
                            type="button"
                            onClick={deleteTable}
                            className="p-1 hover:bg-red-100 text-red-600 rounded text-xs flex items-center gap-1 ml-1"
                            title="Delete Table"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                )}

                <div className="h-4 w-px bg-gray-200 mx-1"></div>

                {/* Hyperlink */}
                <button
                    type="button"
                    onClick={() => {
                        saveSelection();
                        const sel = window.getSelection();
                        if (sel) {
                            setLinkText(sel.toString());
                        }
                        setShowLinkModal(true);
                    }}
                    className="p-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    title="Insert Link"
                >
                    <Link2 size={15} />
                </button>

                {/* Clear Formatting */}
                <button
                    type="button"
                    onClick={() => execCommand('removeFormat')}
                    className="p-1.5 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-200 ml-auto"
                    title="Clear Formatting"
                >
                    <Eraser size={15} />
                </button>
            </div>

            {/* ContentEditable Writing Canvas */}
            <div className="relative flex-1 p-6 bg-white overflow-y-auto">
                <div
                    ref={editorRef}
                    contentEditable={!disabled}
                    onInput={emitChange}
                    onPaste={handlePaste}
                    onClick={handleEditorClick}
                    onKeyUp={handleEditorClick}
                    style={{ minHeight }}
                    data-placeholder={placeholder}
                    className="outline-none text-[15px] font-normal text-gray-800 leading-relaxed space-y-2 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:pointer-events-none prose max-w-none [&_table]:my-3 [&_td]:p-2 [&_th]:p-2 [&_td]:border [&_th]:border [&_td]:border-gray-300 [&_th]:border-gray-300"
                />

                {/* Embedded Signature Preview Block */}
                {signatureHtml && (
                    <div
                        className="mt-6 pt-4 border-t border-gray-100 text-[14px] text-gray-600 select-none opacity-90 pointer-events-none"
                        dangerouslySetInnerHTML={{ __html: signatureHtml }}
                    />
                )}
            </div>

            {/* Insert Link Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-sm font-bold text-gray-900">Insert Link</h3>
                            <button
                                onClick={() => setShowLinkModal(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Text to display</label>
                                <input
                                    type="text"
                                    value={linkText}
                                    onChange={(e) => setLinkText(e.target.value)}
                                    placeholder="Link text..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">URL (or email)</label>
                                <input
                                    type="text"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowLinkModal(false)}
                                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleInsertLink}
                                disabled={!linkUrl.trim()}
                                className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                Insert
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
