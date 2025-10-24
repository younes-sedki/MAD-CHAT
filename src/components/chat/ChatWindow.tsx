import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatWindowProps {
  session: any;
  profile: any;
  selectedRoom: any;
  onBack?: () => void;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  profiles?: {
    username: string;
    city: string;
  };
}

const ChatWindow = ({ session, profile, selectedRoom, onBack }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedRoom) {
      loadMessages();
      subscribeToMessages();
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const loadMessages = async () => {
    if (!selectedRoom) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", selectedRoom.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles separately
      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map((msg) => msg.sender_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, city")
          .in("id", senderIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]));
        
        const messagesWithProfiles = data.map((msg) => ({
          ...msg,
          profiles: profileMap.get(msg.sender_id),
        }));

        setMessages(messagesWithProfiles as Message[]);
      } else {
        setMessages([]);
      }
    } catch (error: any) {
      console.error("Error loading messages:", error);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedRoom) return;

    const channel = supabase
      .channel(`room:${selectedRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${selectedRoom.id}`,
        },
        async (payload) => {
          // Fetch the profile data for the new message
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username, city")
            .eq("id", payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new,
            profiles: profileData,
          } as Message;

          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || loading) return;

    setLoading(true);

    try {
      const { error } = await supabase.from("messages").insert({
        room_id: selectedRoom.id,
        sender_id: session.user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!selectedRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">Select a room to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Room Header */}
      <div className="border-b bg-card p-3 md:p-4 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="md:hidden shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base md:text-lg truncate">{selectedRoom.name}</h2>
            <p className="text-xs md:text-sm text-muted-foreground truncate">{selectedRoom.city}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3 md:p-4">
        <div className="space-y-3 md:space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => {
            const isOwnMessage = message.sender_id === session.user.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[65%] rounded-2xl px-3 py-2 md:px-4 md:py-2.5 shadow-sm ${
                    isOwnMessage
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border rounded-bl-sm"
                  }`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-semibold mb-1">
                      {message.profiles?.username}
                      <span className="text-muted-foreground ml-1.5 font-normal">
                        • {message.profiles?.city}
                      </span>
                    </p>
                  )}
                  <p className="break-words text-sm md:text-base leading-relaxed">{message.content}</p>
                  <p
                    className={`text-[10px] md:text-xs mt-1 ${
                      isOwnMessage
                        ? "text-primary-foreground/60 text-right"
                        : "text-muted-foreground"
                    }`}
                  >
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t bg-card p-3 md:p-4 shrink-0">
        <form onSubmit={sendMessage} className="flex gap-2 max-w-4xl mx-auto">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 rounded-full px-4"
          />
          <Button 
            type="submit" 
            disabled={loading || !newMessage.trim()}
            size="icon"
            className="rounded-full w-10 h-10 md:w-11 md:h-11 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
