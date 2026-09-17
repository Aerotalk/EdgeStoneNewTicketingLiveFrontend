import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Image as ImageIcon,
    Link,
    Loader2,
    ChevronDown,
    Type,
    Check,
    Camera
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { signatureService, type Signature } from '../../services/signatureService';
import { useAuth } from '../../contexts/AuthContext';
import { useAvatar } from '../../hooks/useAvatar';

// ─── Signature Editor Toolbar ─────────────────────────────────────────────────
const exec = (cmd: string, value?: string) => document.execCommand(cmd, false, value);

interface ToolbarButtonProps {
    onClick: () => void;
    title: string;
    active?: boolean;
    children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, title, active, children }) => (
    <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        title={title}
        className={`w-8 h-8 flex items-center justify-center rounded-lg text-[14px] transition-all select-none
            ${active ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'}`}
    >
        {children}
    </button>
);

// ─── Font Size Options ────────────────────────────────────────────────────────
const FONT_SIZES = ['8', '10', '11', '12', '14', '16', '18', '20', '22', '24', '28', '36', '48', '72'];
const FONT_FAMILIES = ['Arial', 'Calibri', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma'];

// ─── Signature Editor Component ───────────────────────────────────────────────
interface SignatureEditorProps {
    initialContent: string;
    onChange: (html: string) => void;
    onImageUpload: (file: File) => Promise<string>;
}

const SignatureEditor: React.FC<SignatureEditorProps> = ({ initialContent, onChange, onImageUpload }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const imgInputRef = useRef<HTMLInputElement>(null);
    const [fontSize, setFontSize] = useState('12');
    const [fontFamily, setFontFamily] = useState('Arial');
    const [showFontMenu, setShowFontMenu] = useState(false);
    const [showFontFamilyMenu, setShowFontFamilyMenu] = useState(false);
    const [uploadingImg, setUploadingImg] = useState(false);
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
    const savedRange = useRef<Range | null>(null);

    useEffect(() => {
        if (editorRef.current && initialContent !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = initialContent;
        }
    }, [initialContent]);

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedRange.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const restoreSelection = () => {
        if (savedRange.current) {
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(savedRange.current);
        }
    };

    const cleanHtmlForEmail = (html: string) => {
        if (!editorRef.current) return html;
        const fonts = editorRef.current.querySelectorAll('font[color]');
        fonts.forEach(font => {
            const span = document.createElement('span');
            span.style.color = font.getAttribute('color') || '';
            span.innerHTML = font.innerHTML;
            font.parentNode?.replaceChild(span, font);
        });
        return editorRef.current.innerHTML;
    };

    const handleInput = () => {
        onChange(cleanHtmlForEmail(editorRef.current?.innerHTML || ''));
    };

    const execAndFocus = (cmd: string, value?: string) => {
        editorRef.current?.focus();
        exec(cmd, value);
        onChange(cleanHtmlForEmail(editorRef.current?.innerHTML || ''));
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImg(true);
        try {
            const url = await onImageUpload(file);
            restoreSelection();
            editorRef.current?.focus();
            exec('insertHTML', `<img src="${url}" alt="signature-image" style="max-width:300px;width:300px;height:auto;display:inline-block;" />`);
            onChange(editorRef.current?.innerHTML || '');
        } catch {
            toast.error('Failed to upload image');
        } finally {
            setUploadingImg(false);
            e.target.value = '';
        }
    };

    const handleLink = () => {
        const url = prompt('Enter URL:', 'https://');
        if (url) execAndFocus('createLink', url);
    };

    const setFontSizeCmd = (size: string) => {
        setFontSize(size);
        setShowFontMenu(false);
        restoreSelection();
        editorRef.current?.focus();
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('fontSize', false, '7');
        const editor = editorRef.current;
        if (editor) {
            const fontEls = editor.querySelectorAll('font[size="7"]');
            fontEls.forEach(el => {
                (el as HTMLElement).style.fontSize = `${size}pt`;
                el.removeAttribute('size');
            });
        }
        onChange(editorRef.current?.innerHTML || '');
    };

    const setFontFamilyCmd = (font: string) => {
        setFontFamily(font);
        setShowFontFamilyMenu(false);
        restoreSelection();
        execAndFocus('fontName', font);
    };

    const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName.toLowerCase() === 'img') {
            setSelectedImage(target as HTMLImageElement);
        } else {
            setSelectedImage(null);
        }
    };

    const handleImageResize = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (selectedImage) {
            const width = e.target.value;
            selectedImage.style.width = `${width}px`;
            selectedImage.style.maxWidth = 'none';
            onChange(cleanHtmlForEmail(editorRef.current?.innerHTML || ''));
        }
    };

    return (
        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white ring-4 ring-gray-900/5 focus-within:border-gray-300 transition-all">
            {/* Toolbar */}
            <div className="flex items-center flex-wrap gap-1 px-3 py-2 bg-gray-50 border-b border-gray-100 relative">
                {/* Font Family */}
                <div className="relative">
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowFontFamilyMenu(v => !v); setShowFontMenu(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all min-w-[120px]"
                    >
                        <Type size={14} />
                        <span className="truncate max-w-[80px]">{fontFamily}</span>
                        <ChevronDown size={14} className="flex-shrink-0 text-gray-400" />
                    </button>
                    {showFontFamilyMenu && (
                        <div className="absolute left-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_20px_60px_-12px_rgba(15,23,42,0.15)] z-[300] py-1.5 min-w-[180px] max-h-56 overflow-y-auto animate-in slide-in-from-top-2">
                            {FONT_FAMILIES.map(f => (
                                <button key={f} type="button" onMouseDown={(e) => { e.preventDefault(); setFontFamilyCmd(f); }}
                                    className={`w-full text-left px-4 py-2 text-[14px] hover:bg-gray-50 transition-all ${fontFamily === f ? 'text-gray-900 font-bold' : 'text-gray-600'}`}
                                    style={{ fontFamily: f }}>{f}</button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-px h-5 bg-gray-200 mx-1" />

                {/* Font Size */}
                <div className="relative">
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowFontMenu(v => !v); setShowFontFamilyMenu(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all w-[72px]"
                    >
                        <span>{fontSize}</span>
                        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                    </button>
                    {showFontMenu && (
                        <div className="absolute left-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_20px_60px_-12px_rgba(15,23,42,0.15)] z-[300] py-1.5 max-h-56 overflow-y-auto w-24 animate-in slide-in-from-top-2">
                            {FONT_SIZES.map(s => (
                                <button key={s} type="button" onMouseDown={(e) => { e.preventDefault(); setFontSizeCmd(s); }}
                                    className={`w-full text-left px-4 py-2 text-[14px] hover:bg-gray-50 transition-all ${fontSize === s ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>{s}</button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-px h-5 bg-gray-200 mx-1" />

                <ToolbarButton onClick={() => execAndFocus('bold')} title="Bold (Ctrl+B)"><Bold size={15} strokeWidth={2.5} /></ToolbarButton>
                <ToolbarButton onClick={() => execAndFocus('italic')} title="Italic (Ctrl+I)"><Italic size={15} /></ToolbarButton>
                <ToolbarButton onClick={() => execAndFocus('underline')} title="Underline (Ctrl+U)"><Underline size={15} /></ToolbarButton>

                <div className="w-px h-5 bg-gray-200 mx-1" />

                <ToolbarButton onClick={() => execAndFocus('justifyLeft')} title="Align Left"><AlignLeft size={15} /></ToolbarButton>
                <ToolbarButton onClick={() => execAndFocus('justifyCenter')} title="Center"><AlignCenter size={15} /></ToolbarButton>
                <ToolbarButton onClick={() => execAndFocus('justifyRight')} title="Align Right"><AlignRight size={15} /></ToolbarButton>

                <div className="w-px h-5 bg-gray-200 mx-1" />

                {/* Font Color */}
                <label title="Font Color" className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer transition-all">
                    <span className="text-[14px] font-bold text-gray-700" style={{ textDecoration: 'underline', textDecorationColor: '#F97316', textDecorationThickness: '2px' }}>A</span>
                    <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={(e) => execAndFocus('foreColor', e.target.value)} title="Font Color" />
                </label>

                <div className="w-px h-5 bg-gray-200 mx-1" />

                {/* Image Upload */}
                <ToolbarButton
                    onClick={() => { saveSelection(); imgInputRef.current?.click(); }}
                    title="Insert Image"
                    active={uploadingImg}
                >
                    {uploadingImg ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
                </ToolbarButton>
                <ToolbarButton onClick={handleLink} title="Insert Link"><Link size={15} /></ToolbarButton>

                <input ref={imgInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" className="hidden" onChange={handleImageSelect} />

                {/* Image Resizer Control */}
                {selectedImage && (
                    <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-sm animate-in fade-in zoom-in duration-200">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Image Size:</span>
                        <input 
                            type="range" 
                            min="20" 
                            max="800" 
                            value={parseInt(selectedImage.style.width || selectedImage.width.toString() || '300')}
                            onChange={handleImageResize}
                            className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                    </div>
                )}
            </div>

            {/* Editable Content Area */}
            <div
                ref={editorRef}
                id="signature-editor"
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyUp={handleInput}
                onMouseUp={saveSelection}
                onKeyDown={saveSelection}
                onClick={handleEditorClick}
                className="min-h-[220px] p-6 text-[14px] text-gray-800 leading-relaxed focus:outline-none [&_img]:cursor-pointer [&_img]:outline-2 [&_img]:outline-transparent [&_img:active]:outline-orange-500"
                style={{ fontFamily: 'Arial' }}
                data-placeholder="Type your signature here..."
            />
        </div>
    );
};

// ─── Main SignaturesPage ──────────────────────────────────────────────────────
const SignaturesPage: React.FC = () => {
    const { user } = useAuth();
    const token = user?.token;
    const agentId = user?.id || '';

    const [liveProfile, setLiveProfile] = useState<any>(null);
    const [existingSignature, setExistingSignature] = useState<Signature | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formContent, setFormContent] = useState('');

    // Avatar logic
    const { avatarUrl, updateAvatar } = useAvatar(agentId);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be smaller than 5MB');
            return;
        }
        
        setUploadingAvatar(true);
        try {
            // Upload to ImgBB for permanent hosting (Railway ephemeral disk workaround)
            const imgUrl = await handleImageUpload(file);
            
            const rawApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const apiBase = rawApiBase.replace(/\/$/, '');
            const userStr = localStorage.getItem('edgestone_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = user?.token || '';
            
            // Save profile picture to user profile
            const updateRes = await fetch(`${apiBase}/api/auth/profile-picture`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ profilePicture: imgUrl })
            });

            if (!updateRes.ok) {
                throw new Error('Failed to update profile picture in database');
            }

            updateAvatar(imgUrl);
            toast.success('Profile photo updated successfully');
        } catch (error: any) {
            console.error('Avatar upload failed:', error);
            toast.error(error.message || 'Failed to update profile photo');
        } finally {
            setUploadingAvatar(false);
            if (avatarInputRef.current) avatarInputRef.current.value = '';
        }
    };

    useEffect(() => {
        if (!agentId || !token) return;
        setLoading(true);

        const fetchDetails = async () => {
            try {
                // Fetch real-time profile via newly created backend /me route
                const rawApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                const apiBase = rawApiBase.replace(/\/$/, '');
                
                const meRes = await fetch(`${apiBase}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (meRes.ok) {
                    const profileData = await meRes.json();
                    setLiveProfile(profileData);
                    if (profileData.profilePicture) {
                        updateAvatar(profileData.profilePicture);
                    }
                }

                // Fetch signature (only one allowed per agent)
                const signatures = await signatureService.getSignatures(agentId);
                if (signatures && signatures.length > 0) {
                    setExistingSignature(signatures[0]);
                    setFormContent(signatures[0].content);
                }
            } catch (error) {
                console.error("Failed to load details:", error);
                toast.error('Failed to load profile details');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [agentId, token]);

    const handleSave = async () => {
        if (!formContent.trim() || formContent === '<br>') { 
            toast.error('Signature content is required'); 
            return; 
        }
        
        setSaving(true);
        try {
            if (existingSignature) {
                const updated = await signatureService.updateSignature(existingSignature.id, {
                    name: `${liveProfile?.name || 'Agent'} Signature`,
                    content: formContent,
                });
                setExistingSignature(updated);
                toast.success('Signature updated successfully');
            } else {
                const created = await signatureService.createSignature({
                    agentId,
                    name: `${liveProfile?.name || 'Agent'} Signature`,
                    content: formContent,
                    defaultFor: 'both', // Always default to both since it's exactly 1 signature now
                });
                setExistingSignature(created);
                toast.success('Signature created successfully');
            }
        } catch (e: any) {
            toast.error(e.message || 'Failed to save signature');
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = useCallback(async (file: File): Promise<string> => {
        if (file.size > 5 * 1024 * 1024) throw new Error('Image must be smaller than 5MB');
        try {
            const formData = new FormData();
            formData.append('image', file);
            const apiKey = '8ab75421ccecda2f5b61e2cbacdbab8f';
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data && data.success && data.data && data.data.url) return data.data.url;
            throw new Error('ImgBB upload response invalid');
        } catch (error) {
            console.error('External upload failed, falling back to data URL:', error);
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (typeof e.target?.result === 'string') resolve(e.target.result);
                    else reject(new Error('Failed to read image fallback'));
                };
                reader.onerror = () => reject(new Error('Failed to read image fallback'));
                reader.readAsDataURL(file);
            });
        }
    }, []);

    const displayName = liveProfile?.name || user?.name || 'User';
    const displayEmail = liveProfile?.email || user?.email || '';
    const displayRole = liveProfile?.role || user?.role || 'Support Agent';

    return (
        <div className="h-full flex flex-col bg-[#F9FAFB] font-sans overflow-x-hidden">
            {/* Header Area */}
            <div className="px-6 md:px-10 py-8 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex items-start justify-between">
                    <div>
                        <h1 className="text-[28px] font-black text-gray-900 tracking-tight mb-2">Account Settings</h1>
                        <p className="text-[15px] text-gray-500 leading-relaxed font-medium">
                            Manage your profile identity and customize your outgoing communications.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Account Settings */}
                    <div className="mb-12 animate-in slide-in-from-bottom-2 duration-300">
                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-4">Identity</p>
                        
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 bg-white border border-gray-100 rounded-[24px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            
                            <div className="relative group/avatar cursor-pointer shrink-0" onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}>
                                <div className="w-28 h-28 rounded-[1.5rem] bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-orange-600 font-black text-4xl shadow-sm border-4 border-white ring-4 ring-orange-50 overflow-hidden relative transition-transform duration-300 group-hover/avatar:scale-105">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                                    ) : (
                                        (displayName[0] || displayEmail[0] || 'U').toUpperCase()
                                    )}
                                    
                                    {/* Overlay */}
                                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity ${uploadingAvatar ? 'opacity-100' : ''}`}>
                                        {uploadingAvatar ? (
                                            <Loader2 size={28} className="text-white animate-spin" />
                                        ) : (
                                            <Camera size={28} className="text-white" />
                                        )}
                                    </div>
                                </div>
                                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                                
                                <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-md border border-gray-100 text-orange-500 opacity-0 group-hover/avatar:opacity-100 transition-all translate-y-2 group-hover/avatar:translate-y-0 z-10">
                                    <Camera size={16} strokeWidth={2.5} />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 text-center md:text-left pt-2 z-10 w-full">
                                <h2 className="text-[28px] font-black text-gray-900 tracking-tight leading-none">{displayName}</h2>
                                <p className="font-semibold text-[16px] text-gray-500 mb-2">
                                    {displayEmail}
                                </p>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-auto">
                                    <span className="px-4 py-1.5 bg-gray-900 text-white text-[13px] font-bold rounded-xl uppercase tracking-wider shadow-sm">
                                        {displayRole}
                                    </span>
                                    {existingSignature && (
                                        <span className="px-4 py-1.5 bg-green-50 text-green-600 text-[13px] font-bold rounded-xl uppercase tracking-wider flex items-center gap-1.5 border border-green-100/50">
                                            <Check size={14} strokeWidth={3} /> Signature Active
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Signature Editor Area */}
                    <div className="animate-in slide-in-from-bottom-2 duration-300 delay-150">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Email Signature</p>
                        </div>

                    {loading ? (
                        <div className="flex items-center gap-3 py-10 text-gray-400 font-bold justify-center w-full bg-white border border-gray-100 rounded-[20px] shadow-sm">
                            <Loader2 size={20} className="animate-spin text-orange-500" />
                            <span>Loading your signature...</span>
                        </div>
                    ) : (
                        <div className="bg-white p-6 md:p-8 border border-gray-100 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] rounded-[24px]">
                            
                            <div className="mb-6 flex flex-col gap-1.5">
                                <h3 className="text-[18px] font-bold text-gray-900">Customize your reply template</h3>
                                <p className="text-[13px] text-gray-500">Design the footer that will be appended to all your outgoing communications.</p>
                            </div>

                            <SignatureEditor
                                key={existingSignature?.id || 'new'}
                                initialContent={formContent}
                                onChange={setFormContent}
                                onImageUpload={handleImageUpload}
                            />

                            <div className="mt-8 flex items-center justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || formContent === (existingSignature?.content || '')}
                                    className="flex items-center gap-2 px-8 py-3.5 bg-orange-500 text-white text-[14px] font-bold rounded-xl hover:bg-orange-600 transition-all active:scale-[0.98] shadow-[0_12px_24px_-8px_rgba(249,115,22,0.3)] disabled:opacity-60 disabled:cursor-not-allowed group w-full sm:w-auto justify-center"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : (
                                        existingSignature ? 'Update Signature' : 'Save Default Signature'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                </div>
            </div>
        </div>
    );
};

export default SignaturesPage;
