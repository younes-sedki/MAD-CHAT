import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageCircle, LogOut, Users, MessageSquare, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatRoomList from "@/components/chat/ChatRoomList";
import FriendsList from "@/components/chat/FriendsList";
import ChatWindow from "@/components/chat/ChatWindow";
import PrivateChatWindow from "@/components/chat/PrivateChatWindow";

const Chat = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("rooms");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        loadProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        loadProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
    } else {
      setProfile(data);
    }
  };

  const handleSelectFriend = (friendId: string, friendProfile: any) => {
    setSelectedFriend(friendProfile);
    setSelectedRoom(null);
  };

  const handleSelectRoom = (room: any) => {
    setSelectedRoom(room);
    setSelectedFriend(null);
  };

  const handleBackToList = () => {
    setSelectedRoom(null);
    setSelectedFriend(null);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
      navigate("/");
    }
  };

  if (!session || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm shrink-0">
        <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full gradient-hero flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base md:text-lg text-gradient truncate">MoroccoChat</h1>
              <p className="text-xs text-muted-foreground truncate">
                {profile.username} • {profile.city}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/profile")}
              className="flex items-center gap-1 md:gap-2"
            >
              <User className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Profile</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-1 md:gap-2"
            >
              <LogOut className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b bg-card px-2 md:px-4 shrink-0">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="rooms" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <MessageSquare className="w-3 h-3 md:w-4 md:h-4" />
                <span>Rooms</span>
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <Users className="w-3 h-3 md:w-4 md:h-4" />
                <span>Friends</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <TabsContent value="rooms" className="flex-1 flex m-0">
              {/* Mobile View - Show either list or chat */}
              <div className={`w-full md:hidden ${selectedRoom ? 'flex' : 'flex'}`}>
                {selectedRoom ? (
                  <ChatWindow
                    session={session}
                    profile={profile}
                    selectedRoom={selectedRoom}
                    onBack={handleBackToList}
                  />
                ) : (
                  <ChatRoomList
                    profile={profile}
                    selectedRoom={selectedRoom}
                    onSelectRoom={handleSelectRoom}
                  />
                )}
              </div>
              
              {/* Desktop View - Show both list and chat side by side */}
              <div className="hidden md:flex md:flex-1">
                <ChatRoomList
                  profile={profile}
                  selectedRoom={selectedRoom}
                  onSelectRoom={handleSelectRoom}
                />
                <ChatWindow
                  session={session}
                  profile={profile}
                  selectedRoom={selectedRoom}
                  onBack={handleBackToList}
                />
              </div>
            </TabsContent>

            <TabsContent value="friends" className="flex-1 flex m-0">
              {/* Mobile View - Show either list or chat */}
              <div className={`w-full md:hidden ${selectedFriend ? 'flex' : 'flex'}`}>
                {selectedFriend ? (
                  <PrivateChatWindow
                    session={session}
                    profile={profile}
                    selectedFriend={selectedFriend}
                    onBack={handleBackToList}
                  />
                ) : (
                  <FriendsList
                    profile={profile}
                    onSelectFriend={handleSelectFriend}
                  />
                )}
              </div>
              
              {/* Desktop View - Show both list and chat side by side */}
              <div className="hidden md:flex md:flex-1">
                <FriendsList
                  profile={profile}
                  onSelectFriend={handleSelectFriend}
                />
                <PrivateChatWindow
                  session={session}
                  profile={profile}
                  selectedFriend={selectedFriend}
                  onBack={handleBackToList}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Chat;
