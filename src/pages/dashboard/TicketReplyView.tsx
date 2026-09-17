import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
    ChevronLeft,
    Mail,
    ChevronDown,
    CornerUpLeft,
    Reply as ReplyIcon,
    MoreVertical,
    User,
    X,
    Send,
    Eye,
    Paperclip,
    Plus,
    Loader2,
    PenLine,
    RefreshCw,
    Trash2,
    Download,
    Lock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { TicketInfoSidebar } from './TicketInfoSidebar';
import { NotificationDropdown } from '../../components/ui/NotificationDropdown';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { EmailRecipientAutocomplete } from '../../components/ui/EmailRecipientAutocomplete';

import { ticketService, type Reply, type Ticket } from '../../services/ticketService';
import { signatureService, type Signature } from '../../services/signatureService';
import SignaturesPage from './SignaturesPage';

import { nowDateIST, nowTimeIST, formatDateWithTZ, formatTimeWithTZ } from '../../utils/dateUtils';
import { vendorService } from '../../services/vendorService';
import { circuitService } from '../../services/circuitService';
import { clientService } from '../../services/clientService';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardData } from '../../contexts/DashboardDataContext';
import { GlobalClock } from '../../components/ui/GlobalClock';


// ... (keep imports)

interface UITicket extends Ticket {
    name: string;
    isMaintenance?: boolean;
}

interface TicketReplyViewProps {
    ticket: UITicket;
    onBack: () => void;
}

export const TicketReplyView: React.FC<TicketReplyViewProps> = ({ ticket, onBack }) => {
    const dashboardData = useDashboardData();
    const [, startTransition] = useTransition();
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<string>(() => {
        if (tabParam === 'vendor' || tabParam?.startsWith('vendor_')) return tabParam;
        return ticket.ticketType === 'Vendor' ? 'vendor' : 'client';
    });
    const [ticketCircuit, setTicketCircuit] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'vendor' || tab?.startsWith('vendor_') || tab === 'client') {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleRefresh = async () => {
        try {
            setIsRefreshing(true);

            if (dashboardData?.refresh) {
                await dashboardData.refresh().catch(console.error);
            }

            const allTickets = await ticketService.getAllTickets();
            const updatedTicket = allTickets.find(t => t.id === ticket.id);
            if (updatedTicket) {
                if (updatedTicket.replies) {
                    setReplies(updatedTicket.replies);
                }
                if (updatedTicket.status) {
                    setTicketStatus(updatedTicket.status);
                }
                toast.success('Conversation refreshed');
            } else {
                toast.error('Ticket not found');
            }
        } catch (error: any) {
            console.error('Failed to refresh ticket:', error);
            toast.error('Failed to refresh conversation');
        } finally {
            setTimeout(() => {
                setIsRefreshing(false);
            }, 800);
        }
    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteTicket = async () => {
        try {
            setIsDeleting(true);
            await ticketService.deleteTicket(ticket.id);
            toast.success(`Ticket ${ticket.ticketId} deleted successfully`);
            if (dashboardData?.refresh) {
                dashboardData.refresh().catch(console.error);
            }
            setShowDeleteModal(false);
            onBack();
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete ticket');
        } finally {
            setIsDeleting(false);
        }
    };

    const [showCircuitModal, setShowCircuitModal] = useState(false);
    const [selectedCircuit, setSelectedCircuit] = useState(() => {
        return localStorage.getItem(`confirmed_circuit_id_${ticket.id}`) || ticket.circuitId || '';
    });
    const [selectedPriority, setSelectedPriority] = useState('');
    const [openDropdown, setOpenDropdown] = useState<'circuit' | 'priority' | null>(null);
    const [replyText, setReplyText] = useState('');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [attachments, setAttachments] = useState<File[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showCc, setShowCc] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [globalTimeZone, setGlobalTimeZone] = useState('UTC');

    // Signature state
    const { user, canDelete } = useAuth();
    const [signatures, setSignatures] = useState<Signature[]>([]);
    const [activeSignatureId, setActiveSignatureId] = useState<string | null>(null);
    const [signatureHtml, setSignatureHtml] = useState<string>(''); // Raw HTML — never stripped
    const [showSigDropdown, setShowSigDropdown] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);

    // Dynamic Circuit Options
    const [dynamicCircuitOptions, setDynamicCircuitOptions] = useState<string[]>([]);

    // Single Source of Truth (SSOT) Thread Matcher
    const isReplyForTab = (reply: any, tab: string, circuit: any): boolean => {
        if (!reply) return false;
        if (tab === 'client') {
            return reply.category === 'client' || (!reply.category && reply.type !== 'vendor');
        }
        if (tab === 'vendor') {
            return reply.category === 'vendor' || reply.category?.startsWith('vendor_') || reply.type === 'vendor';
        }
        if (tab.startsWith('vendor_')) {
            if (reply.category === tab) return true;
            if (reply.category === 'vendor') {
                const currentVendorId = tab.replace('vendor_', '');
                const currentVc = circuit?.vendorCircuits?.find((vc: any) => vc.vendorId === currentVendorId);
                const vendorEmails = (currentVc?.vendor?.emails || []).map((e: string) => e.toLowerCase().trim());
                const vendorName = currentVc?.vendor?.name?.toLowerCase().trim();
                const participants = [
                    ...(reply.to || []),
                    ...(reply.cc || []),
                    reply.author || ''
                ].map((t: string) => t.toLowerCase().trim());

                if (reply.type === 'agent') {
                    const replyTos = [
                        ...(reply.to || []),
                        ...(reply.cc || [])
                    ].map((t: string) => t.toLowerCase().trim());

                    if (vendorEmails.length > 0 && replyTos.some((t: string) => vendorEmails.includes(t))) {
                        return true;
                    }

                    // If it matches another vendor on this circuit, it must NOT show in this vendor's tab!
                    if (circuit?.vendorCircuits && circuit.vendorCircuits.length > 1) {
                        const matchesOtherVendor = circuit.vendorCircuits.some((vc: any) => {
                            if (vc.vendorId === currentVendorId) return false;
                            const otherEmails = (vc.vendor?.emails || []).map((e: string) => e.toLowerCase().trim());
                            return replyTos.some((t: string) => otherEmails.includes(t));
                        });
                        if (matchesOtherVendor) return false;
                    }

                    return circuit?.vendorCircuits?.length === 1;
                }

                if (reply.type === 'vendor') {
                    const matchesEmail = vendorEmails.some((e: string) => participants.some((p: string) => p.includes(e)));
                    const matchesAuthor = vendorName && (reply.author?.toLowerCase().includes(vendorName) || participants.some((p: string) => p.includes(vendorName)));
                    if (matchesEmail || matchesAuthor) return true;
                    if (circuit?.vendorCircuits?.length === 1) return true;
                }
            }
            return false;
        }
        return reply.category === tab;
    };

    const getCleanSubject = (subj: string): string => {
        if (!subj) return '';
        let clean = subj.replace(/^(Re|Fwd|FW|RE|FWD):\s*/gi, '').trim();
        clean = clean.replace(/^\[#?[A-Za-z0-9_-]+?(?:-V)?\]\s*/i, '').trim();
        return clean;
    };

    // Helper to calculate the immutable locked subject line for mid-conversation replies
    const getLockedSubject = (tab: string = activeTab): string => {
        if (tab.startsWith('vendor')) {
            const isSpecificVendor = tab.startsWith('vendor_');
            const vendorReplies = replies.filter(r => r && (isSpecificVendor ? r.category === tab : (r.category === tab || r.category === 'vendor' || r.category?.startsWith('vendor_') || r.type === 'vendor')));

            // 1. Check if any vendor reply in the thread has a subject
            const latestVendorReplyWithSubject = [...vendorReplies]
                .reverse()
                .find(r => r.subject && r.subject.trim() && (r.type === 'vendor' || r.author?.toLowerCase().includes('vendor') || r.author?.toLowerCase().includes('aerovendor')));

            // 2. Identify if this is a Maintenance ticket or Vendor-originated ticket
            const isMaintenanceTicket = ticket.isMaintenance || ticket.status?.toLowerCase() === 'maintenance';
            const isVendorTicket = ticket.ticketType === 'Vendor' || ticket.ticketId?.includes('V');

            // 3. Determine vendor-provided subject (Vendor-provided subject is PRIMARY for maintenance & vendor tickets)
            let vendorProvidedSubject = '';
            if (latestVendorReplyWithSubject?.subject) {
                vendorProvidedSubject = latestVendorReplyWithSubject.subject;
            } else if (isMaintenanceTicket || isVendorTicket || vendorReplies.some(r => r.type === 'vendor')) {
                vendorProvidedSubject = ticket.header;
            }

            // 4. If a valid localSub exists in localStorage from this conversation, check if it's usable.
            // Discard any contaminated localSub that has "Issue regarding Circuit" when a vendor-provided subject exists!
            const localSub = localStorage.getItem(`vendor_subject_${ticket.id}_${tab}`);
            if (localSub && localSub.includes(ticket.ticketId)) {
                const isContaminatedIssueSubject = localSub.includes('Issue regarding Circuit');
                if (!vendorProvidedSubject || !isContaminatedIssueSubject) {
                    return localSub;
                }
            }

            // 5. If vendor provided a subject (primary for maintenance & vendor communication), format and lock it
            if (vendorProvidedSubject) {
                const cleanSubject = getCleanSubject(vendorProvidedSubject) || vendorProvidedSubject;
                return `Re: [${ticket.ticketId}-V] ${cleanSubject}`;
            }

            // 6. Fallback ONLY for client-originated tickets where vendor has never emailed (initial outreach to vendor):
            let supplierId: string | null = null;
            if (isSpecificVendor && ticketCircuit?.vendorCircuits) {
                const currentVendorId = tab.replace('vendor_', '');
                const vc = ticketCircuit.vendorCircuits.find((v: any) => v.vendorId === currentVendorId);
                if (vc && vc.supplierCircuitId) supplierId = vc.supplierCircuitId;
            }
            if (!supplierId) {
                supplierId = ticketCircuit?.supplierCircuitId || confirmedCircuit || ticket.circuitId;
            }
            if (supplierId) {
                return `Re: [${ticket.ticketId}-V] Issue regarding Circuit ${supplierId}`;
            }
            return `Re: [${ticket.ticketId}-V] ${ticket.header}`;
        }

        const cleanHeader = getCleanSubject(ticket.header) || ticket.header;
        return `Re: [${ticket.ticketId}] ${cleanHeader}`;
    };

    // Email Modal form states
    const [emailForm, setEmailForm] = useState({
        from: 'support@edgestone.in',
        to: [] as string[],
        cc: [] as string[],
        bcc: [] as string[],
        subject: ''
    });

    // Track recipients (CC & BCC) per tab to completely isolate Client tab from Vendor tab
    const [tabRecipients, setTabRecipients] = useState<Record<string, { cc: string[], bcc: string[] }>>({});

    // Reset emailForm whenever the ticket changes so stale data from a previous ticket don't bleed in
    useEffect(() => {
        setTabRecipients({});
        setEmailForm({
            from: 'support@edgestone.in',
            to: [],
            cc: [],
            bcc: [],
            subject: getLockedSubject(activeTab)
        });
        setShowCc(false);
    }, [ticket.id, activeTab]);


    const [confirmedCircuit, setConfirmedCircuit] = useState(() => {
        return localStorage.getItem(`confirmed_circuit_id_${ticket.id}`) || ticket.circuitId || '';
    });

    useEffect(() => {
        circuitService.getAllCircuits().then(circuits => {
            const matchedCircuit = circuits.find(c =>
                (confirmedCircuit && c.customerCircuitId === confirmedCircuit) ||
                c.customerCircuitId === ticket.header ||
                c.customerCircuitId === ticket.circuitId ||
                c.id === ticket.circuitId
            );
            if (matchedCircuit) {
                setTicketCircuit(matchedCircuit);
                const firstVc = matchedCircuit.vendorCircuits?.[0];
                if (matchedCircuit.isMultiVendor && firstVc?.vendorId) {
                    setActiveTab(prev => (prev === 'vendor' ? `vendor_${firstVc.vendorId}` : prev));
                }
            }
        }).catch(console.error);
    }, [confirmedCircuit, ticket.header, ticket.circuitId]);

    useEffect(() => {
        const storedCircuit = localStorage.getItem(`confirmed_circuit_id_${ticket.id}`);
        if (storedCircuit) {
            setConfirmedCircuit(storedCircuit);
        } else if (ticket.circuitId) {
            setConfirmedCircuit(ticket.circuitId);
        } else {
            setConfirmedCircuit('');
        }
    }, [ticket.circuitId, ticket.id]);

    const [confirmedPriority, setConfirmedPriority] = useState(() => {
        return localStorage.getItem(`confirmed_priority_${ticket.id}`) || '';
    });

    useEffect(() => {
        setConfirmedPriority(localStorage.getItem(`confirmed_priority_${ticket.id}`) || '');
    }, [ticket.id]);

    const [ticketStatus, setTicketStatus] = useState(() => {
        return ticket.status || localStorage.getItem(`ticket_status_${ticket.id}`) || 'Open';
    });

    useEffect(() => {
        setTicketStatus(ticket.status || localStorage.getItem(`ticket_status_${ticket.id}`) || 'Open');
    }, [ticket.id, ticket.status]);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [vendorName, setVendorName] = useState<string>('');
    const [closedAt, setClosedAt] = useState(() => {
        return localStorage.getItem(`ticket_closed_at_${ticket.id}`) || '';
    });

    useEffect(() => {
        if (ticketStatus.toLowerCase() === 'open') {
            setShowCircuitModal(true);
        } else {
            setShowCircuitModal(false);
        }
    }, [ticketStatus]);

    useEffect(() => {
        // Update toEmail when tab or ticket changes
        if (activeTab === 'client') {
            circuitService.getAllCircuits().then(circuits => {
                const matchedCircuit = circuits.find(c =>
                    (confirmedCircuit && c.customerCircuitId === confirmedCircuit) ||
                    c.customerCircuitId === ticket.header ||
                    c.customerCircuitId === ticket.circuitId ||
                    c.id === ticket.circuitId
                );

                if (matchedCircuit && matchedCircuit.clientId) {
                    clientService.getAllClients().then(clients => {
                        const found = clients.find(c => c.id === matchedCircuit.clientId);
                        if (found && found.emails && found.emails.length > 0) {
                            setEmailForm(prev => ({
                                ...prev,
                                to: [found.emails[0]],
                                subject: `Re: [${ticket.ticketId}] ${ticket.header}`
                            }));
                        } else {
                            setEmailForm(prev => ({
                                ...prev,
                                to: [ticket.email],
                                subject: `Re: [${ticket.ticketId}] ${ticket.header}`
                            }));
                        }
                    }).catch(() => {
                        setEmailForm(prev => ({ ...prev, to: [ticket.email], subject: `Re: [${ticket.ticketId}] ${ticket.header}` }));
                    });
                } else {
                    setEmailForm(prev => ({
                        ...prev,
                        to: [ticket.email],
                        subject: `Re: [${ticket.ticketId}] ${ticket.header}`
                    }));
                }
            }).catch(() => {
                setEmailForm(prev => ({
                    ...prev,
                    to: [ticket.email],
                    subject: `Re: [${ticket.ticketId}] ${ticket.header}`
                }));
            });


        } else if (activeTab.startsWith('vendor')) {
            const isSpecificVendor = activeTab.startsWith('vendor_');
            const specificVendorId = isSpecificVendor ? activeTab.replace('vendor_', '') : undefined;

            // Fetch dynamically on vendor tab click - pass specific vendorId if multi-vendor
            ticketService.getVendorEmails(ticket.id, specificVendorId).then(emails => {
                const lockedSub = getLockedSubject(activeTab);

                setEmailForm(prev => ({
                    ...prev,
                    to: emails,
                    subject: lockedSub
                }));

                // Fetch the vendor name associated specifically with the connected circuit
                circuitService.getAllCircuits().then(circuits => {
                    const matchedCircuit = circuits.find(c =>
                        (confirmedCircuit && c.customerCircuitId === confirmedCircuit) ||
                        c.customerCircuitId === ticket.header ||
                        c.customerCircuitId === ticket.circuitId ||
                        c.id === ticket.circuitId
                    );

                    if (matchedCircuit) {
                        let targetVendor = null;

                        if (specificVendorId && matchedCircuit.isMultiVendor && matchedCircuit.vendorCircuits) {
                            const vc = matchedCircuit.vendorCircuits.find((v: any) => v.vendorId === specificVendorId);
                            if (vc && vc.vendor) {
                                targetVendor = vc.vendor;
                            }
                        } else if (matchedCircuit.vendor) {
                            targetVendor = matchedCircuit.vendor;
                        }

                        if (targetVendor) {
                            setVendorName(targetVendor.name);
                            vendorService.getAllVendors().then(vendors => {
                                const fullVendor = vendors.find(v => v.id === targetVendor?.id || v.name === targetVendor?.name);
                                if (fullVendor && fullVendor.emails && fullVendor.emails.length > 0) {
                                    setEmailForm(prev => ({ ...prev, to: fullVendor.emails }));
                                }
                            }).catch(console.error);
                        } else {
                            setVendorName('EdgeStone Vendor');
                        }

                    } else {
                        setVendorName('EdgeStone Vendor');
                    }
                }).catch(() => setVendorName('EdgeStone Vendor'));
            }).catch(err => {
                console.error("Failed to fetch vendor emails", err);
                setEmailForm(prev => ({
                    ...prev,
                    to: [],
                    subject: getLockedSubject(activeTab)
                }));
                setVendorName('EdgeStone Vendor');
            });
        }

        // Aggregate CCs separately for Client tab vs Vendor tab so they never bleed into each other
        let targetCc: string[] = [];
        let targetBcc: string[] = [];

        if (tabRecipients[activeTab]) {
            targetCc = tabRecipients[activeTab].cc;
            targetBcc = tabRecipients[activeTab].bcc;
        } else if (activeTab === 'client') {
            const clientCcs = new Set<string>();
            const storedClientCc = localStorage.getItem(`ticket_client_cc_${ticket.id}`);
            if (storedClientCc) {
                try {
                    const parsed = JSON.parse(storedClientCc);
                    if (Array.isArray(parsed)) parsed.forEach(e => e && clientCcs.add(e.toLowerCase().trim()));
                } catch (_) {}
            }
            if (ticket.cc && Array.isArray(ticket.cc)) {
                ticket.cc.forEach(email => email && clientCcs.add(email.toLowerCase().trim()));
            }
            if (replies && Array.isArray(replies)) {
                replies.forEach(reply => {
                    const isClientReply = reply.category === 'client' || (!reply.category && reply.type !== 'vendor');
                    if (isClientReply) {
                        if (reply.cc && Array.isArray(reply.cc)) {
                            reply.cc.forEach(email => email && clientCcs.add(email.toLowerCase().trim()));
                        }
                        if (reply.to && Array.isArray(reply.to)) {
                            reply.to.forEach(email => {
                                const clean = email && email.toLowerCase().trim();
                                if (clean && !clean.includes('edgestone.in') && clean !== ticket.email?.toLowerCase()) {
                                    clientCcs.add(clean);
                                }
                            });
                        }
                    }
                });
            }
            targetCc = Array.from(clientCcs);
        } else if (activeTab.startsWith('vendor')) {
            const isSpecificVendor = activeTab.startsWith('vendor_');
            const specificVendorId = isSpecificVendor ? activeTab.replace('vendor_', '') : null;

            // Collect all client-side emails (requester, client CCs, client reply recipients) to guarantee client emails NEVER appear in vendor CC
            const clientEmails = new Set<string>();
            if (ticket.email) clientEmails.add(ticket.email.toLowerCase().trim());
            if (ticket.cc && Array.isArray(ticket.cc)) {
                ticket.cc.forEach(email => email && clientEmails.add(email.toLowerCase().trim()));
            }
            if (replies && Array.isArray(replies)) {
                replies.forEach(reply => {
                    const isClientReply = reply.category === 'client' || (!reply.category && reply.type !== 'vendor');
                    if (isClientReply) {
                        if (reply.cc && Array.isArray(reply.cc)) {
                            reply.cc.forEach(email => email && clientEmails.add(email.toLowerCase().trim()));
                        }
                        if (reply.to && Array.isArray(reply.to)) {
                            reply.to.forEach(email => email && clientEmails.add(email.toLowerCase().trim()));
                        }
                    }
                });
            }

            // Also collect other vendors' emails so vendor 1's emails NEVER leak into vendor 2's CC
            const otherVendorsEmails = new Set<string>();
            if (ticketCircuit?.isMultiVendor && Array.isArray(ticketCircuit?.vendorCircuits)) {
                ticketCircuit.vendorCircuits.forEach((vc: any) => {
                    if (vc.vendorId !== specificVendorId && vc.vendor?.emails) {
                        vc.vendor.emails.forEach((e: string) => otherVendorsEmails.add(e.toLowerCase().trim()));
                    }
                });
            }

            const vendorCcs = new Set<string>();
            const storedVendorCc = localStorage.getItem(`ticket_vendor_cc_${ticket.id}_${activeTab}`);
            if (storedVendorCc) {
                try {
                    const parsed = JSON.parse(storedVendorCc);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(e => {
                            const clean = e && e.toLowerCase().trim();
                            if (clean && !clientEmails.has(clean) && !otherVendorsEmails.has(clean)) {
                                vendorCcs.add(clean);
                            }
                        });
                    }
                } catch (_) {}
            }

            if (replies && Array.isArray(replies)) {
                replies.forEach(reply => {
                    const isVendorReply = isSpecificVendor
                        ? reply.category === activeTab
                        : (reply.category === 'vendor' || (!reply.category && reply.type === 'vendor'));
                    if (isVendorReply) {
                        if (reply.cc && Array.isArray(reply.cc)) {
                            reply.cc.forEach(email => {
                                const clean = email && email.toLowerCase().trim();
                                if (clean && !clean.includes('edgestone.in') && !clientEmails.has(clean) && !otherVendorsEmails.has(clean)) {
                                    vendorCcs.add(clean);
                                }
                            });
                        }
                        if (reply.to && Array.isArray(reply.to)) {
                            reply.to.forEach(email => {
                                const clean = email && email.toLowerCase().trim();
                                if (clean && !clean.includes('edgestone.in') && !clientEmails.has(clean) && !otherVendorsEmails.has(clean)) {
                                    vendorCcs.add(clean);
                                }
                            });
                        }
                    }
                });
            }
            targetCc = Array.from(vendorCcs);
        }

        setEmailForm(prev => {
            const toLowerSet = new Set((prev.to || []).map(e => e.toLowerCase().trim()));
            const cleanCc = targetCc.filter(e => !toLowerSet.has(e.toLowerCase().trim()));
            return {
                ...prev,
                cc: cleanCc,
                bcc: targetBcc.filter(e => !toLowerSet.has(e.toLowerCase().trim()) && !cleanCc.some(c => c.toLowerCase().trim() === e.toLowerCase().trim()))
            };
        });
        setShowCc(targetCc.length > 0 || targetBcc.length > 0);
    }, [activeTab, ticket.email, ticket.header, ticket.id, confirmedCircuit, ticket.circuitId, ticket.cc, replies, tabRecipients, ticketCircuit]);

    // Ensure subject line is locked and populated when opening the email modal
    useEffect(() => {
        if (showEmailModal) {
            setEmailForm(prev => ({
                ...prev,
                subject: getLockedSubject(activeTab)
            }));
        }
    }, [showEmailModal, activeTab, replies, ticket.id, ticket.ticketId, confirmedCircuit, ticket.circuitId]);

    // Fetch dynamic circuits depending on current ticket vendor context
    useEffect(() => {
        circuitService.getAllCircuits().then(circuits => {
            const vendorId = vendorName && vendorName !== 'EdgeStone Vendor'
                ? circuits.find(c => c.vendor?.name === vendorName)?.vendorId
                : undefined;

            // Filter circuits dynamically based on vendor or client context to prevent mixing records
            const filtered = circuits.filter(c => {
                if (activeTab.startsWith('vendor') && vendorId) return c.vendorId === vendorId;
                if (ticket.clientId) return c.clientId === ticket.clientId;
                return true;
            });
            setDynamicCircuitOptions(filtered.map(c => c.customerCircuitId).filter(Boolean));
        }).catch(err => console.error(err));
    }, [activeTab, vendorName, ticket.clientId]);

    // Construct replies from ticket prop & keep fresh via auto-poll and notifications
    useEffect(() => {
        if (ticket.replies) {
            setReplies(ticket.replies);
        }
    }, [ticket]);

    useEffect(() => {
        let isMounted = true;
        const fetchLatestReplies = async () => {
            try {
                const allTickets = await ticketService.getAllTickets();
                if (!isMounted) return;
                const fresh = allTickets.find(t => t.id === ticket.id);
                if (fresh?.replies) {
                    setReplies(fresh.replies);
                }
                if (fresh?.status) {
                    setTicketStatus(fresh.status);
                }
            } catch (err) {
                console.error('Failed to sync ticket replies:', err);
            }
        };

        // Fetch fresh replies on mount
        fetchLatestReplies();

        // Listen for new notifications in real-time
        const handleNewNotification = () => {
            fetchLatestReplies();
        };
        window.addEventListener('new_notification', handleNewNotification);

        // Auto-poll every 10 seconds while ticket is open
        const pollInterval = setInterval(fetchLatestReplies, 10000);

        return () => {
            isMounted = false;
            window.removeEventListener('new_notification', handleNewNotification);
            clearInterval(pollInterval);
        };
    }, [ticket.id]);

    // Load signatures and auto-insert default reply signature
    useEffect(() => {
        if (!user?.id) return;
        signatureService.getSignatures(user.id).then(sigs => {
            setSignatures(sigs);
            // Auto-select default for replies
            const defaultReply = sigs.find(s => s.defaultFor === 'reply' || s.defaultFor === 'both');
            if (defaultReply) {
                setActiveSignatureId(defaultReply.id);
                setSignatureHtml(defaultReply.content); // Store real HTML
            }
        }).catch(() => {/* silent — signatures are optional */ });
    }, [user?.id]);



    // Convert plain text body to safe HTML paragraphs
    const plainTextToHtml = (text: string): string => {
        return text
            .split('\n')
            .map(line => line.trim() === '' ? '<br>' : `<span>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`)
            .join('<br>');
    };

    const applySignature = (sig: Signature | null) => {
        setActiveSignatureId(sig?.id || null);
        if (!sig) {
            setSignatureHtml(''); // Clear stored HTML
            return;
        }
        setSignatureHtml(sig.content); // Store RAW HTML
    };

    const handleConfirm = async () => {
        const newStatus = 'In Progress';

        // Optimistic UI update — show changes instantly while API call is in-flight
        setTicketStatus(newStatus);
        setConfirmedCircuit(selectedCircuit);
        setConfirmedPriority(selectedPriority);
        setShowCircuitModal(false);

        // Persist to localStorage as a UI cache (so it survives within this session)
        localStorage.setItem(`confirmed_circuit_${ticket.id}`, 'true');
        localStorage.setItem(`confirmed_circuit_id_${ticket.id}`, selectedCircuit);
        localStorage.setItem(`confirmed_priority_${ticket.id}`, selectedPriority);
        localStorage.setItem(`ticket_status_${ticket.id}`, newStatus);

        // Persist to DB — this is what other accounts will see
        try {
            await ticketService.updateTicket(ticket.id, {
                circuitId: selectedCircuit,
                priority: selectedPriority,
                status: newStatus,
            });
        } catch (error: any) {
            console.error('Failed to save circuit/priority to DB:', error);
            // UI already updated — don't block the agent, just log it
        }
    };

    const handleReopenTicket = async () => {
        await handleStatusChange('In progress');
    };

    const handleStatusChange = async (newStatus: string) => {
        const toastId = toast.loading('Updating status...');
        try {
            setIsUpdatingStatus(true);
            const isMaintenanceStatus = newStatus.toLowerCase() === 'maintenance';
            // When tagging as Maintenance, set isMaintenance=true so it moves to Maintenance bucket
            // When moving away from Maintenance, set isMaintenance=false
            const wasMaintenanceStatus = ticketStatus.toLowerCase() === 'maintenance';
            const updates: Record<string, any> = { status: newStatus };
            if (isMaintenanceStatus) updates.isMaintenance = true;
            else if (wasMaintenanceStatus) updates.isMaintenance = false;

            await ticketService.updateTicket(ticket.id, updates);

            setTicketStatus(newStatus);
            localStorage.setItem(`ticket_status_${ticket.id}`, newStatus);

            if (newStatus.toLowerCase() === 'closed') {
                const dateStr = nowDateIST();
                const timeStr = nowTimeIST();
                const fullStr = `${dateStr} • ${timeStr}`;
                setClosedAt(fullStr);
                localStorage.setItem(`ticket_closed_at_${ticket.id}`, fullStr);
            } else {
                setClosedAt('');
                localStorage.removeItem(`ticket_closed_at_${ticket.id}`);
            }

            setShowStatusDropdown(false);
            toast.success(`Status updated to ${newStatus}`, { id: toastId });
        } catch (error: any) {
            console.error('Failed to update status:', error);
            toast.error(`Failed to update ticket status: ${error.message}`, { id: toastId });
        } finally {
            setIsUpdatingStatus(false);
        }
    };




    const handleSendReply = async () => {
        if (!replyText.trim() && !signatureHtml && attachments.length === 0) return;

        // ── Build the plain-text body ──
        const plainBody = replyText.trim();

        // ── Build the full HTML email body ────────────────────────────
        // Message body → convert newlines to <br> tags, escape HTML
        const htmlBody = plainTextToHtml(plainBody);
        const htmlSignature = signatureHtml
            ? `<br><br><div style="border-top:1px solid #e0e0e0;margin-top:16px;padding-top:12px;">${signatureHtml}</div>`
            : '';
        const fullHtmlContent = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.6;">${htmlBody}${htmlSignature}</div>`;

        try {
            setIsSending(true);

            let uploadedAttachments: any[] = [];
            if (attachments.length > 0) {
                uploadedAttachments = await ticketService.uploadAttachments(attachments);
            }

            // Send to client or vendor based on the active tab
            let newReply;
            const finalSubject = emailForm.subject.trim() || getLockedSubject(activeTab);
            if (activeTab.startsWith('vendor')) {
                const vendorId = activeTab.replace('vendor_', '');
                newReply = await ticketService.replyToVendor(ticket.id, {
                    ...emailForm,
                    subject: finalSubject,
                    message: plainBody,
                    htmlContent: fullHtmlContent,
                    attachments: uploadedAttachments,
                    vendorId: vendorId !== 'vendor' ? vendorId : undefined
                });

                if (finalSubject) {
                    localStorage.setItem(`vendor_subject_${ticket.id}_${activeTab}`, finalSubject);
                }
                if (emailForm.cc && emailForm.cc.length > 0) {
                    localStorage.setItem(`ticket_vendor_cc_${ticket.id}_${activeTab}`, JSON.stringify(emailForm.cc));
                }
            } else {
                newReply = await ticketService.replyToTicket(ticket.id, plainBody, fullHtmlContent, uploadedAttachments, {
                    ...emailForm,
                    subject: finalSubject
                });
                if (emailForm.cc && emailForm.cc.length > 0) {
                    localStorage.setItem(`ticket_client_cc_${ticket.id}`, JSON.stringify(emailForm.cc));
                }
            }

            // Update local state
            const updatedReplies = [...replies, newReply];
            setReplies(updatedReplies);

            // Clear form
            setReplyText('');
            setAttachments([]);
            setEmailForm(prev => ({
                ...prev,
                cc: [],
                bcc: []
            }));
            setTabRecipients(prev => {
                const next = { ...prev };
                delete next[activeTab];
                return next;
            });
            setShowCc(false);
            setShowEmailModal(false);

            // Auto-move to In Progress if currently Open (client replies only)
            if (activeTab === 'client' && ticketStatus.toLowerCase() === 'open') {
                try {
                    await ticketService.updateTicket(ticket.id, { status: 'In Progress' });
                    setTicketStatus('In Progress');
                    localStorage.setItem(`ticket_status_${ticket.id}`, 'In Progress');
                } catch (error) {
                    console.error('Failed to auto-update status to In Progress:', error);
                }
            }

        } catch (error) {
            console.error('Failed to send reply:', error);
            toast.error('Failed to send reply. Please try again.');
        } finally {
            setIsSending(false);
        }
    };


    const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB limit
    const MAX_FILES_ALLOWED = 10;

    const formatFileSize = (bytes?: number) => {
        if (!bytes || isNaN(bytes)) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const validFiles: File[] = [];
            const oversizedFiles: string[] = [];

            newFiles.forEach(file => {
                if (file.size > MAX_FILE_SIZE_BYTES) {
                    oversizedFiles.push(`"${file.name}" (${formatFileSize(file.size)})`);
                } else {
                    validFiles.push(file);
                }
            });

            if (oversizedFiles.length > 0) {
                toast.error(`File size limit of 20MB exceeded for: ${oversizedFiles.join(', ')}`);
            }

            setAttachments(prev => {
                const combined = [...prev, ...validFiles];
                if (combined.length > MAX_FILES_ALLOWED) {
                    toast.error(`Maximum ${MAX_FILES_ALLOWED} attachments allowed. Excess files were not added.`);
                    return combined.slice(0, MAX_FILES_ALLOWED);
                }
                return combined;
            });
        }
        e.target.value = '';
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const addRecipient = (field: 'to' | 'cc' | 'bcc', value: string) => {
        const email = value.trim().replace(/,$/, '');
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            const cleanLower = email.toLowerCase();
            setEmailForm(prev => {
                if (prev[field].some(e => e.toLowerCase() === cleanLower)) return prev;

                let nextTo = [...prev.to];
                let nextCc = [...prev.cc];
                let nextBcc = [...prev.bcc];

                if (field === 'to') {
                    nextTo.push(email);
                    nextCc = nextCc.filter(e => e.toLowerCase() !== cleanLower);
                    nextBcc = nextBcc.filter(e => e.toLowerCase() !== cleanLower);
                } else if (field === 'cc') {
                    if (nextTo.some(e => e.toLowerCase() === cleanLower)) return prev;
                    nextCc.push(email);
                    nextBcc = nextBcc.filter(e => e.toLowerCase() !== cleanLower);
                } else {
                    if (nextTo.some(e => e.toLowerCase() === cleanLower) || nextCc.some(e => e.toLowerCase() === cleanLower)) return prev;
                    nextBcc.push(email);
                }

                setTabRecipients(tPrev => ({
                    ...tPrev,
                    [activeTab]: {
                        cc: nextCc,
                        bcc: nextBcc
                    }
                }));

                if (activeTab.startsWith('vendor')) {
                    localStorage.setItem(`ticket_vendor_cc_${ticket.id}_${activeTab}`, JSON.stringify(nextCc));
                } else if (activeTab === 'client') {
                    localStorage.setItem(`ticket_client_cc_${ticket.id}`, JSON.stringify(nextCc));
                }

                return {
                    ...prev,
                    to: nextTo,
                    cc: nextCc,
                    bcc: nextBcc
                };
            });
        }
    };

    const removeRecipient = (field: 'to' | 'cc' | 'bcc', index: number) => {
        setEmailForm(prev => {
            const nextField = prev[field].filter((_, i) => i !== index);
            if (field === 'cc' || field === 'bcc') {
                setTabRecipients(tPrev => ({
                    ...tPrev,
                    [activeTab]: {
                        cc: field === 'cc' ? nextField : (tPrev[activeTab]?.cc ?? prev.cc),
                        bcc: field === 'bcc' ? nextField : (tPrev[activeTab]?.bcc ?? prev.bcc)
                    }
                }));
            }
            if (field === 'cc') {
                if (activeTab.startsWith('vendor')) {
                    localStorage.setItem(`ticket_vendor_cc_${ticket.id}_${activeTab}`, JSON.stringify(nextField));
                } else if (activeTab === 'client') {
                    localStorage.setItem(`ticket_client_cc_${ticket.id}`, JSON.stringify(nextField));
                }
            }
            return {
                ...prev,
                [field]: nextField
            };
        });
    };

    // vendorEmail removed (declared at top)

    const priorityOptions = [
        { label: 'High', color: 'text-red-500', bars: [true, true, true] },
        { label: 'Medium', color: 'text-orange-500', bars: [true, true, false] },
        { label: 'Low', color: 'text-green-500', bars: [true, false, false] }
    ];

    const PriorityIcon = ({ bars, type }: { bars: boolean[], type: 'High' | 'Medium' | 'Low' }) => (
        <div className="flex items-end gap-[2px] h-3.5 flex-shrink-0">
            {bars.map((active, i) => {
                let colorClass = 'bg-gray-100';
                if (active) {
                    if (type === 'High') colorClass = 'bg-[#EF4444]';
                    if (type === 'Medium') colorClass = 'bg-[#F59E0B]';
                    if (type === 'Low') colorClass = 'bg-[#22C55E]';
                }
                return (
                    <div
                        key={i}
                        className={`w-[3.5px] rounded-full transition-all duration-300 ${colorClass} ${i === 0 ? 'h-1.5' : i === 1 ? 'h-2.5' : 'h-3.5'}`}
                    />
                );
            })}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white relative font-sans">
            {/* Header Area */}
            <div className="flex flex-col border-b border-gray-100 w-full relative z-[60]">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between px-4 sm:px-6 py-4 gap-4 w-full">
                    <div className="flex items-center gap-2 sm:gap-4 text-[16px] sm:text-[18px] text-gray-500 font-medium flex-1 min-w-0 w-full pr-0 xl:pr-4">
                        <button
                            onClick={onBack}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 flex-shrink-0"
                            title="Back to Tickets"
                        >
                            <ChevronLeft size={20} strokeWidth={2.5} />
                        </button>
                        <div className="flex items-center gap-2 flex-nowrap min-w-0 flex-1">
                            <button onClick={onBack} className="hover:text-gray-900 transition-colors flex-shrink-0 hidden sm:block">Tickets</button>
                            <span className="flex-shrink-0 hidden sm:block">/</span>
                            <div className="group flex-1 min-w-0 flex items-center">
                                <span className="text-gray-900 font-bold truncate cursor-help max-w-full" title={ticket.header}>{ticket.header}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-row items-center gap-3 sm:gap-6 relative flex-shrink-0 w-full xl:w-auto justify-between xl:justify-end">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="relative p-2.5 bg-white text-gray-500 hover:bg-red-50 hover:text-brand-red shadow-sm hover:shadow-md border border-gray-100 rounded-full transition-all duration-300 focus:outline-none active:scale-95 group hidden sm:block disabled:opacity-50"
                                title="Refresh Conversation"
                            >
                                <RefreshCw size={20} className={`transition-transform duration-700 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                            </button>
                            {canDelete() && (
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    className="relative p-2.5 bg-white text-gray-400 hover:bg-red-50 hover:text-brand-red shadow-sm hover:shadow-md border border-gray-100 rounded-full transition-all duration-300 focus:outline-none active:scale-95 group hidden sm:block"
                                    title="Delete Ticket"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                            <NotificationDropdown />
                        </div>
                        <div className="overflow-x-auto scrollbar-hide max-w-full">
                            <GlobalClock />
                        </div>
                        <div className="relative flex-shrink-0">
                            {true && (
                                <>
                                    <button
                                        onClick={() => !isUpdatingStatus && setShowStatusDropdown(!showStatusDropdown)}
                                        disabled={isUpdatingStatus}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-bold border transition-all whitespace-nowrap ${ticketStatus.toLowerCase() === 'closed'
                                            ? 'bg-green-100/50 text-green-600 border-green-200/30 hover:bg-green-100'
                                            : ticketStatus.toLowerCase() === 'spam' || ticketStatus.toLowerCase() === 'others' || ticketStatus.toLowerCase() === 'maintenance'
                                                ? 'bg-gray-100/50 text-gray-600 border-gray-200/30 hover:bg-gray-100'
                                                : 'bg-orange-100/50 text-orange-600 border-orange-200/30 hover:bg-orange-100'
                                            } ${isUpdatingStatus ? 'opacity-70 cursor-wait' : ''}`}
                                    >
                                        {isUpdatingStatus ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" />
                                                Updating...
                                            </>
                                        ) : (
                                            <>
                                                {ticketStatus}
                                                <ChevronDown size={14} />
                                            </>
                                        )}
                                    </button>

                                    {showStatusDropdown && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            {ticketStatus.toLowerCase() !== 'closed' && ticketStatus.toLowerCase() !== 'spam' && ticketStatus.toLowerCase() !== 'others' && ticketStatus.toLowerCase() !== 'maintenance' ? (
                                                <button
                                                    onClick={() => handleStatusChange('Closed')}
                                                    className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-green-600 hover:bg-green-50 transition-colors flex items-center justify-between"
                                                >
                                                    Close Ticket
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleStatusChange('In Progress')}
                                                    className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-between"
                                                >
                                                    Re-Open Ticket as Support
                                                </button>
                                            )}
                                            {ticketStatus.toLowerCase() !== 'spam' && (
                                                <button
                                                    onClick={() => handleStatusChange('Spam')}
                                                    className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-between"
                                                >
                                                    Mark as Spam
                                                </button>
                                            )}
                                            {ticketStatus.toLowerCase() !== 'others' && (
                                                <button
                                                    onClick={() => handleStatusChange('Others')}
                                                    className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-between"
                                                >
                                                    Mark as Others
                                                </button>
                                            )}
                                            {ticketStatus.toLowerCase() !== 'maintenance' && (
                                                <button
                                                    onClick={() => handleStatusChange('Maintenance')}
                                                    className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-between"
                                                >
                                                    Mark as Maintenance
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Overlay to close dropdown */}
                                    {showStatusDropdown && <div className="fixed inset-0 z-[105]" onClick={() => setShowStatusDropdown(false)} />}
                                </>
                            )}

                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between px-6">
                    <div className="flex items-center gap-8">

                        {ticket.ticketType !== 'Vendor' && (
                            <button
                                onClick={() => startTransition(() => setActiveTab('client'))}
                                className={`flex items-center gap-2 py-4 text-[14px] font-bold transition-all border-b-2 ${activeTab === 'client' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                <User size={18} />
                                Client
                            </button>
                        )}
                        {ticketCircuit?.isMultiVendor && ticketCircuit?.vendorCircuits ? (
                            ticketCircuit.vendorCircuits.slice(0, 4).map((vc: any, idx: number) => {
                                const count = replies.filter(r => isReplyForTab(r, `vendor_${vc.vendorId}`, ticketCircuit)).length;
                                return (
                                    <button
                                        key={vc.vendorId || idx}
                                        onClick={() => startTransition(() => setActiveTab(`vendor_${vc.vendorId}`))}
                                        className={`flex items-center gap-2 py-4 text-[14px] font-bold transition-all border-b-2 ${activeTab === `vendor_${vc.vendorId}` ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <User size={18} />
                                        {vc.vendor?.name || `Vendor ${idx + 1}`}
                                        {count > 0 && (
                                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded-full">
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <button
                                onClick={() => startTransition(() => setActiveTab('vendor'))}
                                className={`flex items-center gap-2 py-4 text-[14px] font-bold transition-all border-b-2 ${activeTab === 'vendor' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                <User size={18} />
                                Vendor
                                {replies.filter(r => r && (r.category === 'vendor' || r.category?.startsWith('vendor_') || r.type === 'vendor')).length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded-full">
                                        {replies.filter(r => r && (r.category === 'vendor' || r.category?.startsWith('vendor_') || r.type === 'vendor')).length}
                                    </span>
                                )}
                            </button>
                        )}

                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-[#F5F2F9] text-[#A688C4] text-[11px] font-bold px-2 py-1 rounded-md">
                            ##{ticket.ticketId}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Left Conversation Area */}
                <div className="flex-1 min-w-0 flex flex-col p-4 sm:p-8 space-y-6 overflow-y-auto bg-gray-50/30 scrollbar-hide relative">
                    {isRefreshing && (
                        <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-[2px] z-20 flex items-center justify-center transition-all duration-300 animate-in fade-in">
                            <div className="bg-white/95 shadow-xl border border-gray-100/80 rounded-2xl p-4 flex items-center gap-3">
                                <Loader2 className="w-5 h-5 text-brand-red animate-spin" />
                                <span className="text-[13px] font-bold text-gray-700">Syncing conversation...</span>
                            </div>
                        </div>
                    )}

                    {/* Original Client Message (Always visible but maybe distinct based on user preference) */}
                    {activeTab === 'client' && (
                        <div className="flex gap-4 group">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shadow-sm flex-shrink-0">
                                {ticket.name[0].toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[15px] font-bold text-gray-900">{ticket.name}</span>
                                                <span className="text-[14px] text-gray-400 font-medium">&lt;{ticket.email}&gt;</span>
                                            </div>
                                            <p className="text-[13px] text-gray-400 font-medium">To: support@edgestone.in</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-gray-400">
                                            <span className="text-[13px] font-medium">{formatDateWithTZ(ticket.createdAt || ticket.date, globalTimeZone, { day: 'numeric', month: 'short', year: 'numeric' })} • {ticket.receivedAt ? formatTimeWithTZ(ticket.receivedAt, globalTimeZone) : formatTimeWithTZ(ticket.createdAt, globalTimeZone)} hrs</span>
                                            <div className="flex items-center gap-2.5">
                                                <button className="hover:text-gray-600"><CornerUpLeft size={16} /></button>
                                                <button className="hover:text-gray-600" onClick={() => setShowEmailModal(true)}><ReplyIcon size={16} className="-scale-x-100" /></button>
                                                <button className="hover:text-gray-600"><MoreVertical size={16} /></button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-[14px] text-gray-600 leading-relaxed font-medium space-y-4 whitespace-pre-wrap break-all">
                                        {replies.length > 0 && replies[0].type === 'client'
                                            ? replies[0].text
                                            : 'No message content available'}
                                    </div>
                                    <div className="absolute left-[-17px] top-5 w-4 h-4 bg-white border-l border-b border-gray-100 rotate-45"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab.startsWith('vendor') && (
                        <div className="flex gap-4 group">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm shadow-sm flex-shrink-0">
                                {vendorName ? vendorName.slice(0, 2).toUpperCase() : 'VN'}
                            </div>
                            <div className="flex-1">
                                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[15px] font-bold text-gray-900">{vendorName || 'EdgeStone Vendor'}</span>
                                                <span className="text-[14px] text-gray-400 font-medium">&lt;{emailForm.to.length > 0 ? emailForm.to[0] : 'vendor@example.com'}&gt;</span>
                                            </div>
                                            <p className="text-[13px] text-gray-400 font-medium">To: support@edgestone.in</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-gray-400">
                                            {ticketCircuit?.isMultiVendor ? <span className="text-[13px] font-medium">{vendorName || 'Vendor'} Communication Thread</span> : <span className="text-[13px] font-medium">Vendor Communication Thread</span>}
                                            <div className="flex items-center gap-2.5">
                                                <button className="hover:text-gray-600" onClick={() => setShowEmailModal(true)}><ReplyIcon size={16} className="-scale-x-100" /></button>
                                                <button className="hover:text-gray-600"><MoreVertical size={16} /></button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[14px] text-gray-500 leading-relaxed font-medium italic">
                                        This thread is for coordination with the vendor NOC team. Use the Reply button below to send an email to the vendor.
                                    </div>
                                    <div className="absolute left-[-17px] top-5 w-4 h-4 bg-white border-l border-b border-gray-100 rotate-45"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Closed Ticket Notice Banner */}
                    {ticketStatus.toLowerCase() === 'closed' && (
                        <div className="bg-red-50/95 border border-red-200 rounded-xl p-3.5 flex items-center justify-between shadow-2xs mb-2">
                            <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                                <span className="text-[13px] font-semibold text-red-900">
                                    This ticket is currently Closed. Review the latest replies below and click Reopen Ticket if you want to resume the conversation.
                                </span>
                            </div>
                            <button
                                onClick={handleReopenTicket}
                                className="text-[12px] font-bold text-red-700 hover:text-red-800 bg-white border border-red-300 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                            >
                                <CornerUpLeft size={14} />
                                Reopen Ticket
                            </button>
                        </div>
                    )}


                    {/* Auto Reply (Only in client tab) */}
                    {activeTab === 'client' && (
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm shadow-sm flex-shrink-0">
                                ES
                            </div>
                            <div className="flex-1">
                                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[15px] font-bold text-gray-900">No-reply Edgestone</span>
                                                <span className="text-[14px] text-gray-400 font-medium">&lt;support@edgestone.in&gt;</span>
                                            </div>
                                            <p className="text-[13px] text-gray-400 font-medium">To: {ticket.email}</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-gray-400">
                                            <span className="text-[13px] font-medium">{formatDateWithTZ(ticket.createdAt || ticket.date, globalTimeZone)} • {(() => {
                                                const baseTime = ticket.receivedAt ? new Date(ticket.receivedAt) : new Date(ticket.createdAt);
                                                // Add 30 seconds for auto-reply simulation if exact time not recorded
                                                const autoReplyTime = new Date(baseTime.getTime() + 30000);
                                                return formatTimeWithTZ(autoReplyTime, globalTimeZone) + ' hrs';
                                            })()}</span>
                                            <div className="flex items-center gap-2.5">
                                                <button className="hover:text-gray-600 rotate-180" onClick={() => setShowEmailModal(true)}><ReplyIcon size={16} /></button>
                                                <button className="hover:text-gray-600"><MoreVertical size={16} /></button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-[14px] text-gray-600 leading-relaxed font-medium opacity-80 break-words">
                                        <p>Thank you for reaching out to us. We have received your ticket and our team will get back to you as soon as possible. Please note that this is an automated response and this email box is not be monitored.</p>
                                    </div>
                                    <div className="absolute left-[-17px] top-5 w-4 h-4 bg-white border-l border-b border-gray-100 rotate-45"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'client' && <div className="ml-5 border-l-2 border-gray-100 py-1"></div>}

                    {replies.filter(r => isReplyForTab(r, activeTab, ticketCircuit)).map((reply, idx) => (
                        <div key={idx} className="flex flex-col">
                            <div className="flex gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0 ${reply.type === 'agent' ? 'bg-orange-500 text-white' :
                                    reply.type === 'client' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'
                                    }`}>
                                    {reply.author[0].toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[15px] font-bold text-gray-900">{reply.author}</span>
                                                    <span className="text-[14px] text-gray-400 font-medium">
                                                        &lt;{reply.type === 'agent' ? 'support@edgestone.in' : (reply.to && reply.to.length > 0 ? reply.to[0] : (reply.type === 'client' ? ticket.email : 'vendor@example.com'))}&gt;
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-[12px] text-gray-400 font-medium">
                                                        To: {reply.type === 'agent'
                                                            ? (reply.to?.join(', ') || (activeTab === 'client' ? ticket.email : 'Vendor NOC'))
                                                            : (() => {
                                                                const extraTos = (reply.to || []).slice(1).filter(e => e && e.toLowerCase() !== 'support@edgestone.in');
                                                                return extraTos.length > 0
                                                                    ? `support@edgestone.in, ${extraTos.join(', ')}`
                                                                    : 'support@edgestone.in';
                                                            })()}
                                                    </p>
                                                    {reply.cc && reply.cc.length > 0 && (
                                                        <p className="text-[11px] text-gray-400 font-medium">Cc: {reply.cc.join(', ')}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-gray-400">
                                                <span className="text-[13px] font-medium">{reply.createdAt ? `${formatDateWithTZ(reply.createdAt, globalTimeZone, { day: 'numeric', month: 'short', year: 'numeric' })} • ${formatTimeWithTZ(reply.createdAt, globalTimeZone)} hrs` : `${reply.date} • ${reply.time}`}</span>
                                                <div className="flex items-center gap-2.5">
                                                    <button className="hover:text-gray-600"><MoreVertical size={16} /></button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-[14px] text-gray-600 leading-relaxed font-medium whitespace-pre-wrap break-words">
                                            {reply.text}
                                        </div>
                                        {reply.attachments && reply.attachments.length > 0 && (
                                            <div className="mt-3 flex flex-col gap-2">
                                                {reply.attachments.map((att: any, idx: number) => {
                                                    const fileName = att.originalName || att.filename || att.name || 'Attachment';
                                                    const isLegacy = !att.url && att.contentBytes;
                                                    const isExceeded = !!att.exceededLimit || !!att.error;
                                                    const apiBase = import.meta.env.VITE_API_BASE_URL || '';

                                                    let downloadUrl = '#';
                                                    if (att.filename) {
                                                        downloadUrl = `${apiBase}/api/upload/attachments/${encodeURIComponent(att.filename)}/download?name=${encodeURIComponent(fileName)}`;
                                                    } else if (att.downloadUrl) {
                                                        downloadUrl = att.downloadUrl.startsWith('http://localhost:5000') && apiBase
                                                            ? att.downloadUrl.replace('http://localhost:5000', apiBase)
                                                            : (att.downloadUrl.startsWith('/') ? `${apiBase}${att.downloadUrl}` : att.downloadUrl);
                                                    } else if (att.url) {
                                                        downloadUrl = att.url.startsWith('http://localhost:5000') && apiBase
                                                            ? att.url.replace('http://localhost:5000', apiBase)
                                                            : (att.url.startsWith('/') ? `${apiBase}${att.url}` : att.url);
                                                    }

                                                    const handleDownload = (e: React.MouseEvent) => {
                                                        e.preventDefault();
                                                        if (isExceeded) {
                                                            alert(`Unable to download: ${att.error || 'File exceeded system size limit of 25MB'}`);
                                                            return;
                                                        }

                                                        if (isLegacy) {
                                                            const link = document.createElement('a');
                                                            link.href = `data:${att.mimeType || 'application/octet-stream'};base64,${att.contentBytes}`;
                                                            link.download = fileName;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                            return;
                                                        }

                                                        // Stream large files via browser native download
                                                        const link = document.createElement('a');
                                                        link.href = downloadUrl;
                                                        link.download = fileName;
                                                        link.target = '_blank';
                                                        link.rel = 'noopener noreferrer';
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        document.body.removeChild(link);
                                                    };

                                                    return (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={handleDownload}
                                                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left group ${
                                                                    isExceeded 
                                                                        ? 'bg-red-50/70 border-red-200 text-red-600 cursor-not-allowed' 
                                                                        : 'bg-gray-50 border-gray-100 hover:bg-orange-50/50 hover:border-orange-200 text-gray-700 cursor-pointer shadow-sm'
                                                                }`}
                                                                title={isExceeded ? att.error : `Click to download ${fileName}`}
                                                            >
                                                                <Paperclip size={14} className={isExceeded ? 'text-red-400' : 'text-gray-400 group-hover:text-orange-500'} />
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[13px] font-medium max-w-[260px] truncate ${isExceeded ? 'text-red-700 line-through' : 'text-blue-600 group-hover:text-orange-600 group-hover:underline'}`}>
                                                                            {fileName}
                                                                        </span>
                                                                        {att.size && (
                                                                            <span className="text-[10px] text-gray-400 font-semibold bg-gray-100 px-1.5 py-0.5 rounded">
                                                                                {formatFileSize(att.size)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {isExceeded ? (
                                                                        <span className="text-[11px] text-red-500 font-medium">⚠️ {att.error}</span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 group-hover:text-orange-500">
                                                                            <Download size={10} /> Click to download
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <div className="absolute left-[-17px] top-5 w-4 h-4 bg-white border-l border-b border-gray-100 rotate-45"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="ml-5 border-l-2 border-gray-100 py-1"></div>
                        </div>
                    ))}

                    {/* Reply CTA */}
                    <div className="pt-4">
                        {ticket.isMaintenance ? (
                            <div className="flex items-center gap-4 flex-wrap">
                                {/* <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-xl text-orange-600 text-[13px] font-bold">
                                    🔒 Maintenance Mode — awaiting vendor confirmation
                                </div> */}
                                {/* <button
                                    onClick={() => handleStatusChange('In Progress')}
                                    className="flex items-center gap-2 px-5 py-2.5 border border-green-600 rounded-lg text-[14px] font-bold text-green-600 hover:bg-green-50 transition-all active:scale-95"
                                >
                                    <CornerUpLeft size={16} />
                                    Maintenance Done — Re-Open
                                </button> */}
                                <button
                                    onClick={() => setShowEmailModal(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 border border-gray-900 rounded-lg text-[14px] font-bold text-gray-900 hover:bg-gray-50 transition-all active:scale-95"
                                >
                                    <Mail size={16} />
                                    Reply {activeTab.startsWith('vendor') ? 'to Vendor' : ''}
                                </button>
                            </div>
                        ) : ticketStatus.toLowerCase() === 'closed' ? (
                            <button
                                onClick={handleReopenTicket}
                                className="flex items-center gap-2 px-6 py-2.5 border border-green-600 rounded-lg text-[14px] font-bold text-green-600 hover:bg-green-50 transition-all active:scale-95"
                            >
                                <CornerUpLeft size={16} />
                                Reopen Ticket
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowEmailModal(true)}
                                className="flex items-center gap-2 px-6 py-2.5 border border-gray-900 rounded-lg text-[14px] font-bold text-gray-900 hover:bg-gray-50 transition-all active:scale-95"
                            >
                                <Mail size={16} />
                                Reply {activeTab.startsWith('vendor') ? 'to Vendor' : ''}
                            </button>
                        )}
                    </div>
                </div>

                <TicketInfoSidebar
                    ticket={ticket}
                    priority={confirmedPriority}
                    circuit={confirmedCircuit}
                    status={ticketStatus}
                    closedAt={closedAt}
                    activeTab={activeTab}
                    vendorEmail={emailForm.to.length > 0 ? emailForm.to.join(', ') : ''}
                    vendorName={vendorName}
                    onTimeZoneChangeActive={(zone) => setGlobalTimeZone(zone)}
                />
            </div>

            {showCircuitModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0F172A]/20 backdrop-blur-[6px] animate-in fade-in duration-500">
                    <div className="bg-white rounded-[32px] w-full max-w-[480px] shadow-[0_32px_128px_-12px_rgba(15,23,42,0.25)] border border-gray-100/50 animate-in zoom-in-95 duration-300 relative">
                        <button
                            onClick={onBack}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all active:scale-90 z-20"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-10 pb-12">
                            <h3 className="text-[24px] font-bold text-gray-900 mb-2 tracking-tight">Select circuit id</h3>
                            <p className="text-[14px] text-gray-500 mb-8 break-words leading-relaxed">{ticket.header}</p>

                            <div className="grid grid-cols-2 gap-4 mb-10">
                                {/* Circuit Dropdown */}
                                <div className="relative group flex flex-col">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Circuit ID</label>
                                    <button
                                        onClick={() => setOpenDropdown(openDropdown === 'circuit' ? null : 'circuit')}
                                        className={`w-full min-h-[56px] py-3 border rounded-2xl px-4 flex items-center justify-between transition-all active:scale-[0.98] ${openDropdown === 'circuit' ? 'bg-white border-[#0F172A] ring-4 ring-[#0F172A]/5' : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <span className={`text-[14px] font-bold flex-1 text-left break-all pr-3 ${selectedCircuit ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {selectedCircuit || 'Select id'}
                                        </span>
                                        <ChevronDown size={18} className={`text-gray-400 flex-shrink-0 transition-transform duration-300 ${openDropdown === 'circuit' ? 'rotate-180 text-gray-900' : ''}`} />
                                    </button>

                                    {openDropdown === 'circuit' && (
                                        <>
                                            <div className="fixed inset-0 z-[110]" onClick={() => setOpenDropdown(null)} />
                                            <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-[0_20px_60px_-12px_rgba(15,23,42,0.15)] z-[120] max-h-[320px] overflow-y-auto scrollbar-hide animate-in slide-in-from-top-2 duration-300">
                                                <div className="p-1.5">
                                                    {dynamicCircuitOptions.length > 0 ? dynamicCircuitOptions.map((opt) => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => { setSelectedCircuit(opt); setOpenDropdown(null); }}
                                                            className={`w-full px-3.5 py-3 text-left text-[13px] font-semibold rounded-xl transition-all flex items-center justify-between mb-0.5 last:mb-0 gap-2 ${selectedCircuit === opt ? 'bg-gray-50 text-gray-900' : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-900'}`}
                                                        >
                                                            <span className="break-all">{opt}</span>
                                                            {selectedCircuit === opt && <div className="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-gray-900" />}
                                                        </button>
                                                    )) : (
                                                        <div className="px-3.5 py-3 text-left text-[13px] font-medium text-gray-400">No circuits found</div>
                                                    )}
                                                    <div className="my-1.5 border-t border-gray-50" />
                                                    <button
                                                        onClick={() => { setSelectedCircuit('SPAM'); setOpenDropdown(null); }}
                                                        className={`w-full px-3.5 py-3 text-left text-[13px] font-bold rounded-xl transition-all ${selectedCircuit === 'SPAM' ? 'bg-red-50 text-red-600' : 'text-red-500 hover:bg-red-50'}`}
                                                    >
                                                        REPORT SPAM
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Priority Dropdown */}
                                <div className="relative group">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Priority</label>
                                    <button
                                        onClick={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
                                        className={`w-full h-[56px] border rounded-2xl px-4 flex items-center justify-between transition-all active:scale-[0.98] ${openDropdown === 'priority' ? 'bg-white border-[#0F172A] ring-4 ring-[#0F172A]/5' : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <div className="flex items-center gap-2.5 truncate">
                                            {selectedPriority && (
                                                <PriorityIcon
                                                    bars={priorityOptions.find(o => o.label === selectedPriority)?.bars || []}
                                                    type={selectedPriority as any}
                                                />
                                            )}
                                            <span className={`text-[14px] font-bold truncate ${selectedPriority ? 'text-gray-900' : 'text-gray-400'}`}>
                                                {selectedPriority || 'Set'}
                                            </span>
                                        </div>
                                        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 flex-shrink-0 ${openDropdown === 'priority' ? 'rotate-180 text-gray-900' : ''}`} />
                                    </button>

                                    {openDropdown === 'priority' && (
                                        <>
                                            <div className="fixed inset-0 z-[110]" onClick={() => setOpenDropdown(null)} />
                                            <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-[0_20px_60px_-12px_rgba(15,23,42,0.15)] z-[120] animate-in slide-in-from-top-2 duration-300">
                                                <div className="p-1.5">
                                                    {priorityOptions.map((opt) => (
                                                        <button
                                                            key={opt.label}
                                                            onClick={() => { setSelectedPriority(opt.label); setOpenDropdown(null); }}
                                                            className={`w-full px-3.5 py-3 text-left text-[13.5px] font-bold rounded-xl flex items-center justify-between mb-0.5 last:mb-0 transition-all ${selectedPriority === opt.label ? 'bg-gray-50 text-gray-900' : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-900'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <PriorityIcon bars={opt.bars} type={opt.label as any} />
                                                                {opt.label}
                                                            </div>
                                                            {selectedPriority === opt.label && <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleConfirm}
                                disabled={!selectedPriority}
                                className={`w-full h-[56px] bg-[#0F172A] text-white font-bold rounded-2xl text-[15px] shadow-[0_8px_32px_rgba(15,23,42,0.2)] transition-all active:scale-[0.97] ${!selectedPriority ? 'opacity-20 cursor-not-allowed grayscale' : 'hover:bg-[#1E293B] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(15,23,42,0.3)]'}`}
                            >
                                Confirm and Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0F172A]/20 backdrop-blur-[6px] animate-in fade-in duration-500">
                    <div className="bg-white rounded-[32px] w-full max-w-[650px] max-h-[90vh] shadow-[0_32px_128px_-12px_rgba(15,23,42,0.25)] border border-gray-100/50 animate-in zoom-in-95 duration-300 flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between bg-white relative">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-orange-500 shadow-sm">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[18px] font-bold text-gray-900 leading-none mb-1">Send Email</h3>
                                    <p className="text-[12px] text-gray-400 font-medium">Communicating with {activeTab.startsWith('vendor') ? 'Vendor' : 'Client'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowEmailModal(false)}
                                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-10 space-y-6 overflow-y-auto flex-1 scrollbar-hide">
                            {/* Email Fields */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl group focus-within:ring-4 focus-within:ring-gray-900/5 focus-within:border-gray-200 transition-all">
                                    <span className="text-[13px] font-bold text-gray-400 uppercase tracking-wider w-12">From</span>
                                    <input
                                        type="email"
                                        value={emailForm.from}
                                        onChange={(e) => setEmailForm(prev => ({ ...prev, from: e.target.value }))}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] font-bold text-gray-900 placeholder:text-gray-300"
                                    />
                                </div>

                                <EmailRecipientAutocomplete
                                    label="To"
                                    recipients={emailForm.to}
                                    onAddRecipient={(email) => addRecipient('to', email)}
                                    onRemoveRecipient={(idx) => removeRecipient('to', idx)}
                                    placeholder={emailForm.to.length === 0 ? "Add recipients..." : ""}
                                    rightElement={
                                        <button
                                            type="button"
                                            onClick={() => setShowCc(!showCc)}
                                            className={`p-1 rounded-md transition-all flex-shrink-0 ${showCc ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                            title="Add Cc/Bcc"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    }
                                />

                                {showCc && (
                                    <>
                                        <div className="animate-in slide-in-from-top-2 duration-300">
                                            <EmailRecipientAutocomplete
                                                label="Cc"
                                                recipients={emailForm.cc}
                                                onAddRecipient={(email) => addRecipient('cc', email)}
                                                onRemoveRecipient={(idx) => removeRecipient('cc', idx)}
                                                placeholder="Cc recipients..."
                                            />
                                        </div>

                                        <div className="animate-in slide-in-from-top-2 duration-300">
                                            <EmailRecipientAutocomplete
                                                label="Bcc"
                                                recipients={emailForm.bcc}
                                                onAddRecipient={(email) => addRecipient('bcc', email)}
                                                onRemoveRecipient={(idx) => removeRecipient('bcc', idx)}
                                                placeholder="Bcc recipients..."
                                            />
                                        </div>
                                    </>
                                )}

                                <div
                                    className="flex items-center gap-4 px-4 py-3 bg-gray-100/70 border border-gray-200/80 rounded-2xl select-none cursor-not-allowed transition-all"
                                    title="Subject is locked to preserve email thread integrity"
                                >
                                    <span className="text-[13px] font-bold text-gray-400 uppercase tracking-wider w-12 flex-shrink-0">Subject</span>
                                    <input
                                        type="text"
                                        readOnly
                                        disabled
                                        tabIndex={-1}
                                        value={emailForm.subject || getLockedSubject(activeTab)}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] font-bold text-gray-700 cursor-not-allowed select-all outline-none"
                                    />
                                    <div
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-200/70 text-gray-500 rounded-lg text-[11px] font-bold tracking-wide flex-shrink-0"
                                        title="Subject cannot be changed mid-conversation"
                                    >
                                        <Lock size={12} className="text-gray-400" />
                                        <span>Locked</span>
                                    </div>
                                </div>
                            </div>

                            {/* Message Area */}
                            <div className="relative group flex flex-col bg-white border border-gray-100 rounded-[24px] focus-within:border-gray-900/10 focus-within:ring-4 focus-within:ring-gray-900/5 transition-all shadow-inner overflow-hidden min-h-[220px]">
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your message here..."
                                    className="w-full min-h-[120px] flex-1 p-6 text-[15px] font-medium text-gray-700 placeholder:text-gray-300 focus:outline-none resize-none bg-transparent"
                                    autoFocus
                                />

                                {signatureHtml && (
                                    <div
                                        className="px-6 pb-4 pt-0 text-[14px] text-gray-600 border-t border-gray-50/50 mt-2 pt-4"
                                        dangerouslySetInnerHTML={{ __html: signatureHtml }}
                                    />
                                )}

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    multiple
                                />

                                <div className="flex items-center gap-3 px-6 py-3.5 bg-gray-50/50 border-t border-gray-100/80 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-2.5 py-1.5 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all flex items-center gap-2 border border-gray-200/60 bg-white shadow-2xs"
                                        title="Attach files (Max 20MB per file, up to 10 files)"
                                    >
                                        <Paperclip size={16} />
                                        <span className="text-[12px] font-medium">Attach files</span>
                                        <span className="text-[10px] text-gray-400 font-normal">(Max 20MB)</span>
                                        {attachments.length > 0 && <span className="text-[11px] font-bold text-orange-600 bg-orange-100/80 px-1.5 py-0.5 rounded-full">{attachments.length}/10</span>}
                                    </button>
                                    <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all">
                                        <Eye size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Attachment Pills */}
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {attachments.map((file, i) => (
                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200/80 rounded-xl shadow-2xs">
                                            <Paperclip size={12} className="text-gray-400" />
                                            <span className="text-[11px] font-bold text-gray-700 truncate max-w-[180px]">{file.name}</span>
                                            <span className="text-[10px] text-gray-400 font-medium">({formatFileSize(file.size)})</span>
                                            <button 
                                                type="button"
                                                onClick={() => removeAttachment(i)} 
                                                className="text-gray-400 hover:text-red-500 p-0.5 rounded hover:bg-red-50 transition-colors"
                                                title="Remove file"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-10 py-8 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
                            {/* Left: Signatures Dropdown — exactly like Outlook toolbar */}
                            <div className="relative">
                                <button
                                    id="signature-picker-btn"
                                    onClick={() => setShowSigDropdown(v => !v)}
                                    className="flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl transition-all"
                                    title="Insert signature"
                                >
                                    <PenLine size={15} />
                                    <span className="max-w-[140px] truncate">
                                        {activeSignatureId
                                            ? (signatures.find(s => s.id === activeSignatureId)?.name || 'Signature')
                                            : 'Signatures'}
                                    </span>
                                    <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
                                </button>

                                {showSigDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-[220]" onClick={() => setShowSigDropdown(false)} />
                                        <div className="absolute left-0 bottom-full mb-2 bg-white border border-gray-100 rounded-2xl shadow-[0_20px_60px_-8px_rgba(15,23,42,0.2)] z-[230] min-w-[220px] py-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                            {/* Signature list */}
                                            {signatures.length > 0 ? (
                                                <>
                                                    {signatures.map(sig => (
                                                        <button
                                                            key={sig.id}
                                                            onClick={() => { applySignature(sig); setShowSigDropdown(false); }}
                                                            className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-between gap-3"
                                                        >
                                                            <span className="truncate">{sig.name}</span>
                                                            {activeSignatureId === sig.id && (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                                                            )}
                                                        </button>
                                                    ))}
                                                    <button
                                                        onClick={() => { applySignature(null); setShowSigDropdown(false); }}
                                                        className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-gray-400 hover:bg-gray-50 transition-all"
                                                    >
                                                        (No signature)
                                                    </button>
                                                    <div className="h-px bg-gray-100 mx-3 my-1" />
                                                </>
                                            ) : (
                                                <p className="px-4 py-2 text-[12px] text-gray-400">No signatures yet</p>
                                            )}
                                            {/* Signatures settings link */}
                                            <button
                                                onClick={() => {
                                                    setShowSigDropdown(false);
                                                    setShowSignatureModal(true);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-orange-500 hover:bg-orange-50 transition-all flex items-center gap-2"
                                            >
                                                <PenLine size={13} />
                                                Signatures...
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowEmailModal(false)}
                                    className="px-6 py-2.5 text-[14px] font-bold text-gray-500 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-100"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={handleSendReply}
                                    disabled={(!replyText.trim() && !signatureHtml && attachments.length === 0) || isSending || !(emailForm.subject.trim() || getLockedSubject(activeTab))}
                                    className="flex items-center gap-2.5 px-8 py-3 bg-orange-500 text-white rounded-xl text-[15px] font-bold hover:bg-orange-600 transition-all active:scale-[0.98] shadow-[0_20px_40px_-12px_rgba(249,115,22,0.3)] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group"
                                >
                                    <span>{isSending ? 'Sending...' : 'Send Message'}</span>
                                    {!isSending && <Send size={18} className="group-hover:translate-x-1 transition-transform" />}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Signature Management Modal */}
            {showSignatureModal && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#0F172A]/20 backdrop-blur-[6px] animate-in fade-in duration-500">
                    <div className="bg-white rounded-[32px] w-full max-w-[900px] h-[85vh] shadow-[0_32px_128px_-12px_rgba(15,23,42,0.25)] border border-gray-100/50 animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col">
                        <button
                            onClick={() => {
                                setShowSignatureModal(false);
                                // Refresh signatures when closing modal
                                if (user?.id) {
                                    signatureService.getSignatures(user.id).then(sigs => {
                                        setSignatures(sigs);
                                    }).catch(() => { });
                                }
                            }}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all z-10"
                        >
                            <X size={20} />
                        </button>
                        <SignaturesPage />
                    </div>
                </div>
            )}

            <DeleteConfirmModal
                isOpen={showDeleteModal}
                title="Delete Ticket"
                itemName={`${ticket.ticketId} - ${ticket.header}`}
                itemType="Ticket"
                isLoading={isDeleting}
                onConfirm={handleDeleteTicket}
                onClose={() => setShowDeleteModal(false)}
            />
        </div>
    );
};
