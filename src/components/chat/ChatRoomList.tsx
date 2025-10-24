import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageCircle, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatRoomListProps {
  profile: any;
  selectedRoom: any;
  onSelectRoom: (room: any) => void;
}

const ChatRoomList = ({ profile, selectedRoom, onSelectRoom }: ChatRoomListProps) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRooms();
  }, [profile]);

  const loadRooms = async () => {
    try {
      // Load public city rooms
      const { data, error } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("is_private", false)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setRooms(data || []);

      // Auto-select the user's city room
      if (data && data.length > 0) {
        const cityRoom = data.find((room) => room.city === profile.city);
        if (cityRoom) {
          onSelectRoom(cityRoom);
        }
      }
    } catch (error: any) {
      console.error("Error loading rooms:", error);
      toast({
        title: "Error",
        description: "Failed to load chat rooms.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCityRoom = async (cityName: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_rooms")
        .insert({
          name: `${cityName} Chat`,
          city: cityName,
          is_private: false,
        })
        .select()
        .single();

      if (error) throw error;

      setRooms([...rooms, data]);
      onSelectRoom(data);

      toast({
        title: "Room Created",
        description: `${cityName} chat room has been created.`,
      });
    } catch (error: any) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: "Failed to create chat room.",
        variant: "destructive",
      });
    }
  };

  const checkAndCreateCityRoom = async () => {
    const cityRoom = rooms.find((room) => room.city === profile.city);
    if (!cityRoom) {
      await createCityRoom(profile.city);
    } else {
      toast({
        title: "Room Exists",
        description: `${profile.city} chat room already exists.`,
      });
    }
  };

  if (loading) {
    return (
      <div className="w-80 border-r bg-card flex items-center justify-center">
        <p className="text-muted-foreground">Loading rooms...</p>
      </div>
    );
  }

  return (
    <div className="w-full md:w-80 border-r bg-card flex flex-col h-full">
      <div className="p-3 md:p-4 border-b shrink-0">
        <h2 className="font-semibold text-base md:text-lg mb-2 md:mb-3">Chat Rooms</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={checkAndCreateCityRoom}
          className="w-full flex items-center gap-2 text-xs md:text-sm"
        >
          <Plus className="w-3 h-3 md:w-4 md:h-4" />
          Create {profile.city} Room
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room)}
              className={`w-full p-2 md:p-3 rounded-lg text-left transition-colors flex items-center gap-2 md:gap-3 ${
                selectedRoom?.id === room.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <MessageCircle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm md:text-base">{room.name}</p>
                <p
                  className={`text-xs truncate ${
                    selectedRoom?.id === room.id
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {room.city}
                </p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatRoomList;
