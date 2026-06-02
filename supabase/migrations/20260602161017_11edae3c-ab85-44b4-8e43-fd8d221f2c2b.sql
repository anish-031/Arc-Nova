
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- USERS profile table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  address VARCHAR(42) UNIQUE,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(100) UNIQUE,
  xp BIGINT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  streak INT NOT NULL DEFAULT 0,
  invites INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own profile" ON public.users FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "insert own profile" ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "update own profile" ON public.users FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins read all" ON public.users FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- PRODUCTS
CREATE TYPE public.product_type AS ENUM ('x-premium', 'topup', 'marketplace');

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type product_type NOT NULL,
  price NUMERIC(18,4) NOT NULL DEFAULT 0,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT USING (true);
CREATE POLICY "admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- QUESTS
CREATE TABLE public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  max_progress INT NOT NULL DEFAULT 1,
  xp_reward INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quests TO anon, authenticated;
GRANT ALL ON public.quests TO service_role;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quests public read" ON public.quests FOR SELECT USING (true);
CREATE POLICY "admins manage quests" ON public.quests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PURCHASES (orders ledger)
CREATE TYPE public.purchase_status AS ENUM ('pending', 'success', 'failed');

CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email VARCHAR(255) NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_type product_type NOT NULL,
  product_name TEXT NOT NULL,
  price NUMERIC(18,4) NOT NULL DEFAULT 0,
  tx_hash TEXT,
  custom_username TEXT,           -- X-Premium
  custom_uid TEXT,                -- Topup
  item_details JSONB,             -- Marketplace
  status purchase_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own purchases" ON public.purchases FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "insert own purchases" ON public.purchases FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins update purchases" ON public.purchases FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-grant admin role to master email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'mastergupta299@gmail.com' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed a few products
INSERT INTO public.products (name, type, price, description) VALUES
  ('X-Premium 1 Month', 'x-premium', 8.00, 'X Premium subscription, 1 month'),
  ('Token Topup 1000 ARC', 'topup', 9.99, '1000 ARC tokens added to your UID'),
  ('Neon Sword Skin', 'marketplace', 4.50, 'Limited cyberpunk weapon skin');
