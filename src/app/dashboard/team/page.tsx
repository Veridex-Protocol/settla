"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/dashboard/header";
import {
    Card,
    CardContent,
    Button,
    Input,
    Badge,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Plus,
    Search,
    MoreVertical,
    Mail,
    Shield,
    UserPlus,
    Loader2,
    Trash2,
    Edit3,
    Crown,
    CheckCircle,
    Clock,
    XCircle,
    Users,
    AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    lastActive: string | null;
    createdAt: string;
    isOwner?: boolean;
}

const roleColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    admin: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: <Crown className="h-3 w-3" /> },
    finance: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: <Shield className="h-3 w-3" /> },
    developer: { bg: "bg-cyan-500/10", text: "text-cyan-400", icon: <Shield className="h-3 w-3" /> },
    member: { bg: "bg-zinc-500/10", text: "text-zinc-400", icon: <Shield className="h-3 w-3" /> },
};

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    active: { color: "text-emerald-400", icon: <CheckCircle className="h-3.5 w-3.5" />, label: "Active" },
    invited: { color: "text-amber-400", icon: <Clock className="h-3.5 w-3.5" />, label: "Pending" },
    inactive: { color: "text-zinc-500", icon: <XCircle className="h-3.5 w-3.5" />, label: "Inactive" },
};

export default function TeamPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [inviteOpen, setInviteOpen] = useState(false);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Invite form state
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteName, setInviteName] = useState("");
    const [inviteRole, setInviteRole] = useState("member");

    // Fetch team members
    const fetchTeam = useCallback(async () => {
        try {
            const res = await fetch("/api/team");
            if (!res.ok) throw new Error("Failed to fetch team");
            const data = await res.json();
            setMembers(data.members);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch team:", err);
            setError("Failed to load team members");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTeam();
    }, [fetchTeam]);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;

        setInviting(true);
        try {
            const res = await fetch("/api/team", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: inviteEmail,
                    name: inviteName || undefined,
                    role: inviteRole,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to send invite");
            }

            // Refresh team list
            await fetchTeam();

            // Reset form
            setInviteEmail("");
            setInviteName("");
            setInviteRole("member");
            setInviteOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send invite");
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveMember = async (id: string) => {
        if (!confirm("Are you sure you want to remove this team member?")) return;

        try {
            const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to remove member");
            await fetchTeam();
        } catch (err) {
            console.error("Failed to remove member:", err);
            setError("Failed to remove team member");
        }
    };

    const handleUpdateRole = async (id: string, role: string) => {
        try {
            const res = await fetch(`/api/team/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role }),
            });
            if (!res.ok) throw new Error("Failed to update role");
            await fetchTeam();
        } catch (err) {
            console.error("Failed to update role:", err);
            setError("Failed to update role");
        }
    };

    const filteredTeam = members.filter(
        (member) =>
            member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            'from-emerald-500 to-teal-600',
            'from-emerald-500 to-cyan-600',
            'from-pink-500 to-rose-600',
            'from-cyan-500 to-blue-600',
            'from-amber-500 to-orange-600',
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    return (
        <div className="flex flex-col mb-10">
            <Header
                title="Team Management"
                description="Manage access and roles for your team members"
                actions={
                    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <UserPlus className="h-4 w-4" />
                                Invite Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-zinc-800">
                            <DialogHeader>
                                <DialogTitle className="text-white">Invite Team Member</DialogTitle>
                                <DialogDescription className="text-zinc-400">
                                    Send an invitation to join your workspace. They'll receive an email with instructions.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Email Address</Label>
                                    <Input
                                        placeholder="colleague@company.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Name (Optional)</Label>
                                    <Input
                                        placeholder="John Doe"
                                        value={inviteName}
                                        onChange={(e) => setInviteName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Role</Label>
                                    <Select value={inviteRole} onValueChange={setInviteRole}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">
                                                <div className="flex items-center gap-2">
                                                    <Crown className="h-4 w-4 text-emerald-400" />
                                                    Admin - Full access
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="finance">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="h-4 w-4 text-emerald-400" />
                                                    Finance - Payments & invoices
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="developer">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="h-4 w-4 text-cyan-400" />
                                                    Developer - API access
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="member">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="h-4 w-4 text-zinc-400" />
                                                    Viewer - Read-only access
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                                    {inviting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="h-4 w-4 mr-2" />
                                            Send Invitation
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                }
            />

            <div className="p-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card variant="glass" className="relative overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-zinc-400">Total Members</p>
                                    <p className="text-2xl font-bold text-white">{members.length}</p>
                                </div>
                                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-emerald-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card variant="glass" className="relative overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-zinc-400">Active</p>
                                    <p className="text-2xl font-bold text-white">
                                        {members.filter(m => m.status === 'active' || m.isOwner).length}
                                    </p>
                                </div>
                                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                                    <CheckCircle className="h-5 w-5 text-cyan-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card variant="glass" className="relative overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-zinc-400">Pending Invites</p>
                                    <p className="text-2xl font-bold text-white">
                                        {members.filter(m => m.status === 'invited').length}
                                    </p>
                                </div>
                                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-amber-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <span className="text-red-300">{error}</span>
                        <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
                            Dismiss
                        </Button>
                    </div>
                )}

                {/* Search */}
                <Card variant="glass">
                    <CardContent className="pt-6">
                        <div className="relative max-w-md">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="w-full">
                                        <Input
                                            placeholder="Search team members..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            icon={<Search className="h-4 w-4" />}
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Search by name or email</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </CardContent>
                </Card>

                {/* Team Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading ? (
                        // Loading skeletons
                        [...Array(3)].map((_, i) => (
                            <Card key={i} variant="glass" className="animate-pulse">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-zinc-800" />
                                        <div className="flex-1">
                                            <div className="h-4 w-24 bg-zinc-800 rounded mb-2" />
                                            <div className="h-3 w-32 bg-zinc-800 rounded" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : filteredTeam.length === 0 ? (
                        <div className="col-span-full">
                            <Card variant="glass">
                                <CardContent className="py-16 flex flex-col items-center justify-center">
                                    <div className="h-16 w-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
                                        <Users className="h-8 w-8 text-zinc-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">
                                        {searchQuery ? "No members found" : "No team members yet"}
                                    </h3>
                                    <p className="text-zinc-500 text-center max-w-sm mb-4">
                                        {searchQuery
                                            ? "Try adjusting your search"
                                            : "Start building your team by inviting colleagues to your workspace."}
                                    </p>
                                    {!searchQuery && (
                                        <Button onClick={() => setInviteOpen(true)} className="gap-2">
                                            <UserPlus className="h-4 w-4" />
                                            Invite Your First Member
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        filteredTeam.map((member) => (
                            <Card key={member.id} variant="glass" className="group hover:border-emerald-500/30 transition-colors">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            {/* Avatar */}
                                            <div className={`relative h-12 w-12 rounded-full bg-gradient-to-br ${getAvatarColor(member.name)} flex items-center justify-center text-white font-medium shadow-lg`}>
                                                {getInitials(member.name)}
                                                {member.isOwner && (
                                                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center shadow">
                                                        <Crown className="h-3 w-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-white flex items-center gap-2">
                                                    {member.name}
                                                    {member.isOwner && (
                                                        <span className="text-xs text-amber-400">(Owner)</span>
                                                    )}
                                                </h3>
                                                <p className="text-sm text-zinc-500">{member.email}</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {!member.isOwner && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id)}>
                                                            <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-400" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Remove member</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        {/* Role Badge */}
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${roleColors[member.role]?.bg || roleColors.member.bg}`}>
                                            <span className={roleColors[member.role]?.text || roleColors.member.text}>
                                                {roleColors[member.role]?.icon}
                                            </span>
                                            <span className={`text-xs font-medium capitalize ${roleColors[member.role]?.text || roleColors.member.text}`}>
                                                {member.role}
                                            </span>
                                        </div>

                                        {/* Status */}
                                        <div className={`flex items-center gap-1.5 ${statusConfig[member.status]?.color || 'text-zinc-500'}`}>
                                            {statusConfig[member.status]?.icon}
                                            <span className="text-xs">{statusConfig[member.status]?.label || member.status}</span>
                                        </div>
                                    </div>

                                    {/* Last Active */}
                                    {member.lastActive && (
                                        <p className="text-xs text-zinc-600 mt-3">
                                            Last active {formatDistanceToNow(new Date(member.lastActive), { addSuffix: true })}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
