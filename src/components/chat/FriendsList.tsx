import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Search, Check, X, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface FriendsListProps {
  profile: any;
  onSelectFriend: (friendId: string, friendProfile: any) => void;
}

const FriendsList = ({ profile, onSelectFriend }: FriendsListProps) => {
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      loadFriends();
      loadPendingRequests();
    }
  }, [profile]);

  const loadFriends = async () => {
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`);

      if (error) throw error;

      // Get friend profiles
      if (data && data.length > 0) {
        const friendIds = data.map((f) =>
          f.user1_id === profile.id ? f.user2_id : f.user1_id
        );

        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", friendIds);

        setFriends(profiles || []);
      } else {
        setFriends([]);
      }
    } catch (error: any) {
      console.error("Error loading friends:", error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      // Get pending requests where current user is user2
      const { data: requests, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("user2_id", profile.id)
        .eq("status", "pending");

      if (error) throw error;

      if (requests && requests.length > 0) {
        // Fetch profiles for the senders (user1)
        const senderIds = requests.map(r => r.user1_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, city")
          .in("id", senderIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));
        
        const requestsWithProfiles = requests.map(req => ({
          ...req,
          profiles: profileMap.get(req.user1_id),
        }));

        setPendingRequests(requestsWithProfiles);
      } else {
        setPendingRequests([]);
      }
    } catch (error: any) {
      console.error("Error loading pending requests:", error);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", `%${searchQuery}%`)
        .neq("id", profile.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: "Failed to search users.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      // Check if friendship already exists
      const { data: existing } = await supabase
        .from("friendships")
        .select("*")
        .or(`and(user1_id.eq.${profile.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${profile.id})`);

      if (existing && existing.length > 0) {
        toast({
          title: "Request exists",
          description: "Friend request already sent or you're already friends.",
        });
        return;
      }

      const { error } = await supabase.from("friendships").insert({
        user1_id: profile.id,
        user2_id: userId,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Request sent!",
        description: "Friend request has been sent.",
      });

      setSearchResults([]);
      setSearchQuery("");
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      toast({
        title: "Error",
        description: "Failed to send friend request.",
        variant: "destructive",
      });
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Friend added!",
        description: "You are now friends.",
      });

      loadFriends();
      loadPendingRequests();
    } catch (error: any) {
      console.error("Error accepting request:", error);
      toast({
        title: "Error",
        description: "Failed to accept friend request.",
        variant: "destructive",
      });
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Request rejected",
        description: "Friend request has been rejected.",
      });

      loadPendingRequests();
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: "Failed to reject friend request.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full md:w-80 border-r bg-card flex flex-col h-full">
      <div className="p-3 md:p-4 border-b shrink-0">
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <h2 className="font-semibold text-base md:text-lg">Friends</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs md:text-sm">
                <UserPlus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Add Friend</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Search Users</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                  />
                  <Button onClick={searchUsers} disabled={searching}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.city}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => sendFriendRequest(user.id)}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    ))}
                    {searchResults.length === 0 && searchQuery && !searching && (
                      <p className="text-center text-muted-foreground py-4">
                        No users found
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {pendingRequests.length > 0 && (
          <Badge variant="destructive" className="mb-2">
            {pendingRequests.length} pending request{pendingRequests.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1">
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="p-2 border-b">
            <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">
              PENDING REQUESTS
            </p>
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="p-3 rounded-lg border mb-2 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">
                      {request.profiles?.username || 'Unknown User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.profiles?.city || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => acceptFriendRequest(request.id)}
                    className="flex-1"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectFriendRequest(request.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends List */}
        <div className="p-2">
          {friends.length > 0 && (
            <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">
              YOUR FRIENDS
            </p>
          )}
          {friends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => onSelectFriend(friend.id, friend)}
              className="w-full p-2 md:p-3 rounded-lg text-left transition-colors flex items-center gap-2 md:gap-3 hover:bg-muted"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-semibold text-primary text-sm md:text-base">
                  {friend.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm md:text-base">{friend.username}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {friend.city}
                </p>
              </div>
              <MessageCircle className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
          {friends.length === 0 && pendingRequests.length === 0 && (
            <div className="text-center py-8 px-4">
              <UserPlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No friends yet. Search and add friends to start chatting!
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FriendsList;
