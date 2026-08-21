import React, { useState } from "react";
import { AppSection, Contact, AppNotification, ChatMessage, UniversityMatchProfile } from "@/src/types";
import { INITIAL_CONTACTS, INITIAL_NOTIFICATIONS, UNIVERSITY_MATCH_PROFILES } from "@/src/data/mockData";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { 
  MessageSquare, 
  Search, 
  Bell, 
  User, 
  Settings, 
  Sparkles, 
  Send, 
  Shield, 
  Heart, 
  Users, 
  Check, 
  X, 
  ArrowLeft,
  CheckCheck,
  Plus,
  Compass
} from "lucide-react";
import confetti from "canvas-confetti";

interface AppViewProps {
  onBackToLanding: () => void;
}

export const AppView: React.FC<AppViewProps> = ({ onBackToLanding }) => {
  const [currentSection, setCurrentSection] = useState<AppSection>("messages");
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [selectedContact, setSelectedContact] = useState<Contact>(INITIAL_CONTACTS[0]);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [searchFilter, setSearchFilter] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({
    'user-akhil': [
      { id: '1', senderId: 'user-akhil', receiverId: 'me', content: 'Hey! The WebSocket routing lookup is completely O(1) now.', timestamp: '10:14 AM', status: 'read', isMe: false },
      { id: '2', senderId: 'me', receiverId: 'user-akhil', content: 'Awesome! Did you also verify that the messages persist to Postgres before dispatch?', timestamp: '10:15 AM', status: 'read', isMe: true },
      { id: '3', senderId: 'user-akhil', receiverId: 'me', content: 'Yes, write-before-send pattern guarantees zero lost messages even on network drop.', timestamp: '10:16 AM', status: 'read', isMe: false }
    ],
    'user-sirjan': [
      { id: '1', senderId: 'user-sirjan', receiverId: 'me', content: 'Would you like more details on this product design?', timestamp: 'Yesterday', status: 'read', isMe: false },
      { id: '2', senderId: 'me', receiverId: 'user-sirjan', content: 'Yes, let us connect the dithered 1-bit style with Sajilo Patra!', timestamp: 'Yesterday', status: 'read', isMe: true }
    ]
  });

  const activeMessages = chatHistories[selectedContact.id] || [
    { id: 'init', senderId: selectedContact.id, receiverId: 'me', content: selectedContact.lastMessage, timestamp: selectedContact.lastMessageTime, status: 'read', isMe: false }
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'me',
      receiverId: selectedContact.id,
      content: typedMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
      isMe: true
    };

    setChatHistories(prev => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), newMsg]
    }));

    setTypedMessage("");

    // Simulate auto-reply from contact over WebSocket
    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        senderId: selectedContact.id,
        receiverId: 'me',
        content: `Received via WebSocket socket("${selectedContact.handle}")! Verified persistence in Supabase Postgres.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
        isMe: false
      };
      setChatHistories(prev => ({
        ...prev,
        [selectedContact.id]: [...(prev[selectedContact.id] || []), replyMsg]
      }));
    }, 900);
  };

  const handleNotificationAction = (id: string, action: 'accept' | 'reject') => {
    setNotifications(prev =>
      prev.map(notif => {
        if (notif.id === id) {
          return {
            ...notif,
            status: action === 'accept' ? 'accepted' : 'rejected'
          };
        }
        return notif;
      })
    );
    if (action === 'accept') {
      try {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
      } catch (e) {}
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.handle.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.major.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.sharedInterests.some(i => i.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="relative flex h-screen w-full bg-black text-white font-sans overflow-hidden">
      
      {/* 
        Expandable Sidebar 
        Matches the exact HTML mockup: 
        72px collapsed, 260px expanded on hover with cubic-bezier transition 
      */}
      <nav className="group absolute left-0 top-0 h-screen w-[72px] hover:w-[260px] bg-black border-r border-[#2a2a2a] flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-50 overflow-hidden whitespace-nowrap shadow-2xl hover:shadow-[10px_0_20px_rgba(0,0,0,0.8)] select-none">
        <div>
          {/* Brand Header */}
          <div className="h-20 px-6 font-bold text-lg text-white flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100">
            <span className="font-mono text-white text-base">Sajilo patra</span>
          </div>

          {/* Nav Items */}
          <div className="flex flex-col gap-2 p-2 w-full">
            <button
              onClick={() => setCurrentSection("messages")}
              className={`flex items-center px-4 py-3 gap-4 rounded-lg transition-colors cursor-pointer w-full text-left ${
                currentSection === "messages"
                  ? "bg-[#1e1e1e] text-white"
                  : "text-[#a0a0a0] hover:bg-[#1e1e1e] hover:text-white"
              }`}
            >
              <MessageSquare className="h-6 w-6 min-w-[24px]" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-150 text-sm font-medium">
                Messages
              </span>
            </button>

            <button
              onClick={() => setCurrentSection("matching")}
              className={`flex items-center px-4 py-3 gap-4 rounded-lg transition-colors cursor-pointer w-full text-left ${
                currentSection === "matching"
                  ? "bg-[#1e1e1e] text-white"
                  : "text-[#a0a0a0] hover:bg-[#1e1e1e] hover:text-white"
              }`}
            >
              <Compass className="h-6 w-6 min-w-[24px]" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-150 text-sm font-medium">
                Interest Matches
              </span>
            </button>

            <button
              onClick={() => setCurrentSection("notifications")}
              className={`flex items-center px-4 py-3 gap-4 rounded-lg transition-colors cursor-pointer w-full text-left relative ${
                currentSection === "notifications"
                  ? "bg-[#1e1e1e] text-white"
                  : "text-[#a0a0a0] hover:bg-[#1e1e1e] hover:text-white"
              }`}
            >
              <div className="relative">
                <Bell className="h-6 w-6 min-w-[24px]" />
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400" />
              </div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-150 text-sm font-medium">
                Notifications
              </span>
            </button>

            <button
              onClick={() => setCurrentSection("search")}
              className={`flex items-center px-4 py-3 gap-4 rounded-lg transition-colors cursor-pointer w-full text-left ${
                currentSection === "search"
                  ? "bg-[#1e1e1e] text-white"
                  : "text-[#a0a0a0] hover:bg-[#1e1e1e] hover:text-white"
              }`}
            >
              <Search className="h-6 w-6 min-w-[24px]" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-150 text-sm font-medium">
                Search Students
              </span>
            </button>
          </div>
        </div>

        {/* Sidebar Bottom Items */}
        <div className="flex flex-col gap-2 p-2 mb-4">
          <button
            onClick={() => setCurrentSection("profile")}
            className={`flex items-center px-4 py-3 gap-4 rounded-lg transition-colors cursor-pointer w-full text-left ${
              currentSection === "profile"
                ? "bg-[#1e1e1e] text-white"
                : "text-[#a0a0a0] hover:bg-[#1e1e1e] hover:text-white"
            }`}
          >
            <User className="h-6 w-6 min-w-[24px]" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-150 text-sm font-medium">
              Profile
            </span>
          </button>

          <button
            onClick={() => setCurrentSection("settings")}
            className={`flex items-center px-4 py-3 gap-4 rounded-lg transition-colors cursor-pointer w-full text-left ${
              currentSection === "settings"
                ? "bg-[#1e1e1e] text-white"
                : "text-[#a0a0a0] hover:bg-[#1e1e1e] hover:text-white"
            }`}
          >
            <Settings className="h-6 w-6 min-w-[24px]" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-150 text-sm font-medium">
              Settings & RLS
            </span>
          </button>

          <button
            onClick={onBackToLanding}
            className="flex items-center px-4 py-3 gap-4 rounded-lg transition-colors cursor-pointer w-full text-left text-zinc-400 hover:bg-[#1e1e1e] hover:text-amber-300"
          >
            <ArrowLeft className="h-6 w-6 min-w-[24px]" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-150 text-xs font-mono">
              Back to Landing
            </span>
          </button>
        </div>
      </nav>

      {/* Main Content Area (padding-left: 72px for collapsed sidebar offset) */}
      <div className="flex w-full pl-[72px] h-screen overflow-hidden bg-black">
        
        {/* Section 1: Messages */}
        {currentSection === "messages" && (
          <div className="flex w-full h-full">
            
            {/* Contacts Column (350px fixed) */}
            <div className="w-[350px] min-w-[350px] bg-[#121212] border-r border-[#2a2a2a] flex flex-col h-full">
              <div className="p-5 border-b border-[#2a2a2a]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-white">Messages</h2>
                  <Badge variant="pixel" className="text-[9px]">LIVE WSS</Badge>
                </div>
                <div className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white px-4 py-2.5 rounded-full flex items-center gap-2.5">
                  <Search className="h-4 w-4 text-[#a0a0a0]" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className="bg-transparent border-none text-white outline-none w-full text-xs font-sans placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <div className="flex-grow overflow-y-auto divide-y divide-[#2a2a2a]/40">
                {filteredContacts.map(contact => {
                  const isSelected = selectedContact.id === contact.id;
                  return (
                    <div
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={`flex items-center p-4 cursor-pointer transition-colors ${
                        isSelected ? "bg-[#1e1e1e]" : "hover:bg-[#1e1e1e]/60"
                      }`}
                    >
                      <div className="relative mr-3.5 shrink-0">
                        <div className="w-12 h-12 rounded-full bg-[#444] flex items-center justify-center font-bold text-sm text-zinc-300">
                          {contact.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        {contact.status === 'online' && (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black" />
                        )}
                      </div>
                      <div className="flex flex-col justify-center w-full overflow-hidden">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-semibold text-sm text-white truncate">{contact.name}</span>
                          <span className="text-[11px] text-[#a0a0a0] shrink-0 font-mono">{contact.lastMessageTime}</span>
                        </div>
                        <div className="text-xs text-[#a0a0a0] truncate font-sans">
                          {contact.lastMessage}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat Conversation Column */}
            <div className="flex-grow flex flex-col bg-black h-full">
              {/* Chat Header */}
              <div className="p-5 border-b border-[#2a2a2a] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#666] flex items-center justify-center font-bold text-sm text-white">
                    {selectedContact.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-base text-white">{selectedContact.name}</div>
                    <div className="text-xs text-[#a0a0a0] flex items-center gap-2">
                      <span>{selectedContact.major} • {selectedContact.university}</span>
                      <span className="text-emerald-400 font-mono text-[10px]">● {selectedContact.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono text-zinc-400 border-[#2a2a2a]">
                    SOCKET ID: ws_{selectedContact.id}
                  </Badge>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-grow p-6 overflow-y-auto space-y-4">
                <div className="text-center my-2">
                  <span className="text-[11px] font-mono text-zinc-500 bg-[#121212] px-3 py-1 rounded-full border border-[#2a2a2a]">
                    Stateless JWT Handshake Verified • End-to-End Persistence Active
                  </span>
                </div>

                {activeMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.isMe
                          ? "bg-white text-black font-normal rounded-tr-none shadow-md"
                          : "bg-[#1e1e1e] text-zinc-100 border border-[#2a2a2a] rounded-tl-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#a0a0a0] font-mono">
                      <span>{msg.timestamp}</span>
                      {msg.isMe && <CheckCheck className="h-3 w-3 text-zinc-400" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-5 border-t border-[#2a2a2a] bg-black">
                <div className="bg-[#1e1e1e] rounded-full px-5 py-3 flex items-center gap-3 border border-[#2a2a2a] focus-within:border-zinc-500 transition-colors">
                  <input
                    type="text"
                    placeholder={`Message ${selectedContact.name}... (press Enter to send via WebSocket)`}
                    value={typedMessage}
                    onChange={e => setTypedMessage(e.target.value)}
                    className="bg-transparent border-none text-white outline-none w-full text-sm placeholder:text-zinc-500"
                  />
                  <Button
                    type="submit"
                    variant="pixel"
                    size="sm"
                    disabled={!typedMessage.trim()}
                    className="h-8 px-3 rounded-full text-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* Section 2: Notifications */}
        {currentSection === "notifications" && (
          <div className="w-full h-full overflow-y-auto flex justify-center bg-black">
            <div className="w-full max-w-[720px] py-10 px-6">
              <div className="flex items-center justify-between pb-6 border-b border-[rgba(255,255,255,0.15)] mb-4">
                <h1 className="text-3xl font-bold text-white">Notifications</h1>
                <Badge variant="pixel">REAL-TIME EVENTS</Badge>
              </div>

              <div className="divide-y divide-[rgba(255,255,255,0.1)]">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className="flex items-start py-5 px-3 hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#444] mr-4.5 shrink-0 flex items-center justify-center text-zinc-300">
                      {notif.type === 'friend_request' && <User className="h-6 w-6" />}
                      {notif.type === 'like' && <Heart className="h-6 w-6 text-red-400" />}
                      {notif.type === 'mention' && <Users className="h-6 w-6 text-blue-400" />}
                      {notif.type === 'security' && <Shield className="h-6 w-6 text-amber-400" />}
                      {notif.type === 'match_found' && <Sparkles className="h-6 w-6 text-emerald-400" />}
                    </div>

                    <div className="flex-grow flex flex-col justify-center min-h-[48px]">
                      <div className="text-sm text-[#a0a0a0] leading-relaxed">
                        <span className="font-bold text-white">{notif.userName}</span>{" "}
                        <span className="font-medium text-white">{notif.actionText}</span>
                        {notif.messagePreview && (
                          <span className="italic text-zinc-400 ml-1">"{notif.messagePreview}"</span>
                        )}
                      </div>

                      <div className="text-xs text-[#666] mt-1.5 font-mono">{notif.timeAgo}</div>

                      {notif.type === 'friend_request' && notif.status === 'pending' && (
                        <div className="flex gap-2.5 mt-3">
                          <button
                            onClick={() => handleNotificationAction(notif.id, 'accept')}
                            className="bg-white text-black hover:bg-[#e0e0e0] font-semibold text-xs px-5 py-2 rounded-md transition-all cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => handleNotificationAction(notif.id, 'reject')}
                            className="bg-[#1e1e1e] text-white hover:bg-[#2a2a2a] border border-[#2a2a2a] font-semibold text-xs px-5 py-2 rounded-md transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {notif.status === 'accepted' && (
                        <span className="text-xs text-emerald-400 mt-2 font-mono flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Request Accepted • Socket Channel Opened
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 3: University Interest Matching (No Cards Layout) */}
        {currentSection === "matching" && (
          <div className="w-full h-full overflow-y-auto p-8 bg-black">
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#2a2a2a] gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    University Interest Matching
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    Matching students by shared course syllabi, research clusters, and niche passions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    ALGORITHM ACTIVE
                  </span>
                </div>
              </div>

              {/* Seamless List Directory (No Cards) */}
              <div className="divide-y divide-[#2a2a2a] border-y border-[#2a2a2a]">
                {UNIVERSITY_MATCH_PROFILES.map((profile, idx) => (
                  <div
                    key={profile.id}
                    className="py-5 sm:py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-[#121212]/50 transition-colors px-4 -mx-4 rounded-xl group"
                  >
                    {/* Left: Student Info */}
                    <div className="flex items-start sm:items-center gap-4 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={profile.avatar}
                          alt={profile.name}
                          className="w-14 h-14 rounded-full object-cover border border-zinc-800"
                        />
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-bold text-base text-white group-hover:text-zinc-200 transition-colors">
                            {profile.name}
                          </h3>
                          <span className="text-xs text-zinc-400 font-semibold">
                            {profile.matchScore}% Match
                          </span>
                        </div>

                        <p className="text-xs text-zinc-400">
                          {profile.major} • {profile.year} • <span className="text-zinc-300 font-medium">{profile.university}</span>
                        </p>

                        <p className="text-xs text-zinc-300 italic pt-1 max-w-xl leading-relaxed">
                          "{profile.bio}"
                        </p>
                      </div>
                    </div>

                    {/* Middle: Shared Interests & Seeking */}
                    <div className="lg:max-w-xs space-y-2 text-left">
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-300">
                        {profile.interests.map((interest, iIdx) => (
                          <span key={iIdx} className="text-zinc-400 font-medium">
                            #{interest}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Seeking: <span className="text-zinc-300">{profile.seeking}</span>
                      </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <Button
                        onClick={() => {
                          setCurrentSection("messages");
                        }}
                        className="rounded-full bg-white text-black font-semibold hover:bg-zinc-200 text-xs px-5 h-9"
                      >
                        Connect &amp; Chat
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* Section 4: Search & Discovery */}
        {currentSection === "search" && (
          <div className="w-full h-full overflow-y-auto p-8 bg-black flex justify-center">
            <div className="max-w-2xl w-full space-y-6">
              <h1 className="text-3xl font-bold text-white">Search University Network</h1>
              <div className="bg-[#121212] border border-[#2a2a2a] p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 bg-black border border-[#2a2a2a] rounded-lg px-4 py-2.5">
                  <Search className="h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search by student name, college, course code (e.g. CS101, Distributed Systems)..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className="w-full bg-transparent outline-none text-xs text-white placeholder:text-zinc-600"
                  />
                </div>
                <div className="flex gap-2 font-mono text-[11px] text-zinc-400">
                  <span>Popular:</span>
                  <button onClick={() => setSearchFilter("Rust")} className="hover:text-white underline">Rust</button>
                  <button onClick={() => setSearchFilter("Distributed")} className="hover:text-white underline">Distributed</button>
                  <button onClick={() => setSearchFilter("Tribhuvan")} className="hover:text-white underline">Tribhuvan</button>
                  <button onClick={() => setSearchFilter("UI/UX")} className="hover:text-white underline">UI/UX</button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredContacts.map(c => (
                  <div key={c.id} className="p-4 rounded-lg border border-[#2a2a2a] bg-[#121212] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{c.name} <span className="text-zinc-500 font-normal font-mono">{c.handle}</span></div>
                      <div className="text-xs text-zinc-400">{c.major} • {c.university}</div>
                    </div>
                    <Button 
                      onClick={() => {
                        setSelectedContact(c);
                        setCurrentSection("messages");
                      }}
                      variant="pixel" 
                      size="sm" 
                      className="text-xs h-8"
                    >
                      Message
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Profile & Settings */}
        {(currentSection === "profile" || currentSection === "settings") && (
          <div className="w-full h-full overflow-y-auto p-8 bg-black flex justify-center">
            <div className="max-w-2xl w-full space-y-6">
              <div className="border-b border-[#2a2a2a] pb-4">
                <h1 className="text-3xl font-bold text-white">Student Profile & Security Config</h1>
                <p className="text-xs text-zinc-400 mt-1">Verified Supabase Stateless Token & Row-Level-Security Status</p>
              </div>

              <div className="bg-[#121212] border border-[#2a2a2a] p-6 rounded-xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white text-black font-bold text-xl flex items-center justify-center">
                    SP
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Logged In Student (You)</h3>
                    <p className="text-xs text-zinc-400 font-mono">UID: usr_8923a1f9c • @student_dev</p>
                    <Badge variant="pixel" className="text-emerald-400 text-[10px] mt-1">JWT VERIFIED</Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#2a2a2a] space-y-3 font-mono text-xs text-zinc-300">
                  <div className="flex justify-between py-1 border-b border-[#2a2a2a]/60">
                    <span className="text-zinc-500">AUTH PROVIDER</span>
                    <span>Supabase Auth (Argon2 / RS256 JWT)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a2a2a]/60">
                    <span className="text-zinc-500">PERSISTENCE STRATEGY</span>
                    <span>Write-Before-Send to Postgres</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#2a2a2a]/60">
                    <span className="text-zinc-500">ROW LEVEL SECURITY</span>
                    <span className="text-emerald-400">ENABLED (Dual Anon/Auth Policies)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">WEBSOCKET STATUS</span>
                    <span className="text-emerald-400">OPEN (127.0.0.1:3000)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
