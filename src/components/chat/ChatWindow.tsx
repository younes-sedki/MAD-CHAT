import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatWindowProps {
  session: any;
  profile: any;
  selectedRoom: any;
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

const ChatWindow = ({ session, profile, selectedRoom }: ChatWindowProps) => {
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
    <div className="flex-1 flex flex-col">
      {/* Room Header */}
      <div className="border-b bg-card p-4">
        <h2 className="font-semibold text-lg">{selectedRoom.name}</h2>
        <p className="text-sm text-muted-foreground">{selectedRoom.city}</p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwnMessage = message.sender_id === session.user.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isOwnMessage
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border"
                  }`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-semibold mb-1">
                      {message.profiles?.username}
                      <span className="text-muted-foreground ml-1">
                        • {message.profiles?.city}
                      </span>
                    </p>
                  )}
                  <p className="break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage
                        ? "text-primary-foreground/70"
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
      <div className="border-t bg-card p-4">
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
