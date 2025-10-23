import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PrivateChatWindowProps {
  session: any;
  profile: any;
  selectedFriend: any;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  profiles?: {
    username: string;
  };
}

const PrivateChatWindow = ({ session, profile, selectedFriend }: PrivateChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [privateRoom, setPrivateRoom] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedFriend) {
      initializePrivateChat();
    }
  }, [selectedFriend]);

  useEffect(() => {
    if (privateRoom) {
      loadMessages();
      subscribeToMessages();
    }
  }, [privateRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const initializePrivateChat = async () => {
    try {
      // Check if private room already exists between these two users
      const { data: existingRooms, error: roomError } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("is_private", true)
        .or(`name.eq.${profile.id}_${selectedFriend.id},name.eq.${selectedFriend.id}_${profile.id}`);

      if (roomError) throw roomError;

      if (existingRooms && existingRooms.length > 0) {
        setPrivateRoom(existingRooms[0]);
      } else {
        // Create new private room
        const roomName = `${profile.id}_${selectedFriend.id}`;
        const { data: newRoom, error: createError } = await supabase
          .from("chat_rooms")
          .insert({
            name: roomName,
            is_private: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        setPrivateRoom(newRoom);
      }
    } catch (error: any) {
      console.error("Error initializing private chat:", error);
      toast({
        title: "Error",
        description: "Failed to initialize chat.",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async () => {
    if (!privateRoom) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", privateRoom.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map((msg) => msg.sender_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
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
    if (!privateRoom) return;

    const channel = supabase
      .channel(`private_room:${privateRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${privateRoom.id}`,
        },
        async (payload) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username")
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
    if (!newMessage.trim() || !privateRoom || loading) return;

    setLoading(true);

    try {
      const { error } = await supabase.from("messages").insert({
        room_id: privateRoom.id,
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

  if (!selectedFriend) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <UserPlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground text-lg">
            Select a friend to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="font-semibold text-primary">
              {selectedFriend.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="font-semibold text-lg">{selectedFriend.username}</h2>
            <p className="text-sm text-muted-foreground">{selectedFriend.city}</p>
          </div>
        </div>
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
            placeholder={`Message ${selectedFriend.username}...`}
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

export default PrivateChatWindow;
