
CREATE OR REPLACE FUNCTION public.increment_team_income(_user_id uuid, _amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.wallets SET team_income = team_income + _amount WHERE user_id = _user_id;
END; $$;
REVOKE ALL ON FUNCTION public.increment_team_income(uuid, numeric) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_team_income(uuid, numeric) TO service_role;
