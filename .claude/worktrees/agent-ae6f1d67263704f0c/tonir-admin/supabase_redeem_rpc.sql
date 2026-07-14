-- ── Prize Redemption RPC + RLS ───────────────────────────────────────────────
-- Run this in the Supabase SQL editor

-- Atomic redemption function (SECURITY DEFINER = bypasses RLS safely)
CREATE OR REPLACE FUNCTION redeem_prize(p_user_id uuid, p_prize_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cost    integer;
  v_stock   integer;
  v_active  boolean;
  v_utype   text;
  v_points  integer;
  v_cnt     integer;
  v_code    text;
BEGIN
  SELECT points_cost, stock, is_active, unlock_type
    INTO v_cost, v_stock, v_active, v_utype
    FROM prizes WHERE id = p_prize_id;

  IF NOT FOUND OR NOT v_active OR v_utype <> 'points' THEN
    RETURN json_build_object('error', 'prize_not_available');
  END IF;

  IF v_stock IS NOT NULL THEN
    SELECT COUNT(*) INTO v_cnt FROM user_prizes WHERE prize_id = p_prize_id;
    IF v_cnt >= v_stock THEN
      RETURN json_build_object('error', 'out_of_stock');
    END IF;
  END IF;

  SELECT yel_points INTO v_points FROM profiles WHERE id = p_user_id;
  IF v_points < v_cost THEN
    RETURN json_build_object('error', 'insufficient_points');
  END IF;

  UPDATE profiles SET yel_points = yel_points - v_cost WHERE id = p_user_id;

  v_code := 'YEL-' || upper(substring(md5(gen_random_uuid()::text) FROM 1 FOR 6));
  INSERT INTO user_prizes (user_id, prize_id, code, status)
    VALUES (p_user_id, p_prize_id, v_code, 'active');

  RETURN json_build_object('success', true, 'code', v_code, 'new_points', v_points - v_cost);
END;
$$;

-- RLS policies
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view active prizes" ON prizes;
CREATE POLICY "Authenticated users can view active prizes" ON prizes
  FOR SELECT USING (is_active = true AND auth.role() = 'authenticated');

ALTER TABLE user_prizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own prizes" ON user_prizes;
CREATE POLICY "Users view own prizes" ON user_prizes
  FOR SELECT USING (auth.uid() = user_id);
