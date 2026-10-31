import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Episode = {
  number: number;
  title: string;
  release_date: string | null;
  description: string | null;
  author: string | null;
  duration_minutes: number | null;
  cover_path: string | null;
};

export function coverUrl(path: string | null | undefined, size = 400) {
  if (!path) return "";
  return `https://is1-ssl.mzstatic.com/image/thumb/${path}/source/${size}x${size}bb.jpg`;
}

export function fullTitle(e: Pick<Episode, "title">) {
  return `Die drei ??? ${e.title}`;
}

export const episodesQuery = () =>
  queryOptions({
    queryKey: ["episodes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("episodes").select("*").order("number");
      if (error) throw error;
      return data as Episode[];
    },
    staleTime: 1000 * 60 * 30,
  });

export const statsQuery = () =>
  queryOptions({
    queryKey: ["episode_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("episode_stats").select("*");
      if (error) throw error;
      return data as { number: number; log_count: number; like_count: number; avg_rating: number | null; rating_count: number }[];
    },
  });

export const episodeQuery = (n: number) =>
  queryOptions({
    queryKey: ["episode", n],
    queryFn: async () => {
      const { data, error } = await supabase.from("episodes").select("*").eq("number", n).maybeSingle();
      if (error) throw error;
      return data as Episode | null;
    },
  });

const LOG_SELECT =
  "id, user_id, episode_number, listened_on, rating, liked, review, is_relisten, created_at, profiles(username, display_name), episodes(number, title, cover_path)";

export type LogRow = {
  id: string;
  user_id: string;
  episode_number: number;
  listened_on: string;
  rating: number | null;
  liked: boolean;
  review: string | null;
  is_relisten: boolean;
  created_at: string;
  profiles: { username: string; display_name: string | null } | null;
  episodes: { number: number; title: string; cover_path: string | null } | null;
};

export const episodeLogsQuery = (n: number) =>
  queryOptions({
    queryKey: ["logs", "episode", n],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logs")
        .select(LOG_SELECT)
        .eq("episode_number", n)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as LogRow[];
    },
  });

export const recentReviewsQuery = () =>
  queryOptions({
    queryKey: ["logs", "recent-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logs")
        .select(LOG_SELECT)
        .not("review", "is", null)
        .neq("review", "")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as unknown as LogRow[];
    },
  });

export const feedQuery = (userIds: string[]) =>
  queryOptions({
    queryKey: ["logs", "feed", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [] as LogRow[];
      const { data, error } = await supabase
        .from("logs")
        .select(LOG_SELECT)
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      return data as unknown as LogRow[];
    },
  });

export type Profile = { id: string; username: string; display_name: string | null; bio: string | null; created_at: string };

export const profileQuery = (username: string) =>
  queryOptions({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data: profile, error } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      if (error) throw error;
      if (!profile) return null;
      const id = profile.id;
      const [logs, favs, watch, followers, following] = await Promise.all([
        supabase.from("logs").select(LOG_SELECT).eq("user_id", id).order("listened_on", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("favorites").select("position, episodes(number, title, cover_path)").eq("user_id", id).order("position"),
        supabase.from("watchlist").select("created_at, episodes(number, title, cover_path)").eq("user_id", id).order("created_at", { ascending: false }),
        supabase.from("follows").select("follower_id, profiles!follows_follower_id_fkey(username, display_name)").eq("following_id", id),
        supabase.from("follows").select("following_id, profiles!follows_following_id_fkey(username, display_name)").eq("follower_id", id),
      ]);
      return {
        profile: profile as Profile,
        logs: (logs.data ?? []) as unknown as LogRow[],
        favorites: (favs.data ?? []) as unknown as { position: number; episodes: Episode }[],
        watchlist: (watch.data ?? []) as unknown as { episodes: Episode }[],
        followers: (followers.data ?? []) as unknown as { follower_id: string; profiles: { username: string; display_name: string | null } }[],
        following: (following.data ?? []) as unknown as { following_id: string; profiles: { username: string; display_name: string | null } }[],
      };
    },
  });

export const myEpisodeStateQuery = (userId: string | undefined, n: number) =>
  queryOptions({
    queryKey: ["me", userId, "episode", n],
    enabled: !!userId,
    queryFn: async () => {
      const [logs, watch] = await Promise.all([
        supabase.from("logs").select("id, rating, liked, listened_on, review").eq("user_id", userId!).eq("episode_number", n).order("listened_on", { ascending: false }),
        supabase.from("watchlist").select("episode_number").eq("user_id", userId!).eq("episode_number", n).maybeSingle(),
      ]);
      return { logs: logs.data ?? [], onWatchlist: !!watch.data };
    },
  });

export const myFollowingQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["me", userId, "following"],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", userId!);
      return (data ?? []).map((r) => r.following_id);
    },
  });

export function formatDuration(min: number | null) {
  if (!min) return "";
  return `${min} Min.`;
}
