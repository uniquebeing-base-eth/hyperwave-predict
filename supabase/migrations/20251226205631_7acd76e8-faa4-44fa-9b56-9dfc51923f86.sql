-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  balance NUMERIC NOT NULL DEFAULT 1000,
  total_bets INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_losses INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create bets table
CREATE TABLE public.bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  result TEXT CHECK (result IN ('win', 'loss', 'pending')),
  payout NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  settled_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on bets
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- Create policies for bets
CREATE POLICY "Users can view own bets" ON public.bets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own bets" ON public.bets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bets" ON public.bets FOR UPDATE USING (auth.uid() = user_id);

-- Create game_rounds table
CREATE TABLE public.game_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number INTEGER NOT NULL,
  start_price NUMERIC NOT NULL,
  end_price NUMERIC,
  result TEXT CHECK (result IN ('up', 'down', 'pending')),
  total_pool NUMERIC NOT NULL DEFAULT 0,
  up_pool NUMERIC NOT NULL DEFAULT 0,
  down_pool NUMERIC NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on game_rounds (public read)
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game rounds" ON public.game_rounds FOR SELECT USING (true);

-- Enable realtime for bets and game_rounds
ALTER PUBLICATION supabase_realtime ADD TABLE public.bets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rounds;

-- Function to update profile stats
CREATE OR REPLACE FUNCTION public.update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.result IS NOT NULL AND NEW.result != 'pending' THEN
    UPDATE public.profiles
    SET 
      total_bets = total_bets + 1,
      total_wins = total_wins + CASE WHEN NEW.result = 'win' THEN 1 ELSE 0 END,
      total_losses = total_losses + CASE WHEN NEW.result = 'loss' THEN 1 ELSE 0 END,
      balance = balance + COALESCE(NEW.payout, 0) - CASE WHEN OLD.result IS NULL THEN 0 ELSE NEW.amount END,
      win_rate = CASE 
        WHEN (total_bets + 1) > 0 
        THEN ((total_wins + CASE WHEN NEW.result = 'win' THEN 1 ELSE 0 END)::NUMERIC / (total_bets + 1)) * 100 
        ELSE 0 
      END,
      updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for updating profile stats
CREATE TRIGGER on_bet_settled
  AFTER UPDATE ON public.bets
  FOR EACH ROW
  WHEN (OLD.result IS DISTINCT FROM NEW.result)
  EXECUTE FUNCTION public.update_profile_stats();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();