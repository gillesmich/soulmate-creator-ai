-- Migration 1: Nettoyage complet du système API keys personnalisé
-- Supprimer la table api_keys et toutes ses dépendances
DROP TABLE IF EXISTS public.api_keys CASCADE;

-- Supprimer la fonction validate_api_key
DROP FUNCTION IF EXISTS public.validate_api_key(text);

-- Supprimer la fonction dangereuse get_shared_api_keys
DROP FUNCTION IF EXISTS public.get_shared_api_keys();

-- Migration 2: Verrouillage de la table usage_tracking
-- Supprimer les politiques permissives actuelles
DROP POLICY IF EXISTS "Users can insert their own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can update their own usage" ON public.usage_tracking;

-- Créer une politique en lecture seule stricte (DROP d'abord si existe)
DROP POLICY IF EXISTS "Users can view their own usage" ON public.usage_tracking;
CREATE POLICY "Users can view their own usage"
  ON public.usage_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- Migration 3: Sécurisation de la table user_roles avec fonction administrative
-- Créer la table d'audit pour les changements de rôles
CREATE TABLE IF NOT EXISTS public.role_changes_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamp with time zone DEFAULT now()
);

-- Créer une fonction pour les changements de rôles (admin uniquement)
CREATE OR REPLACE FUNCTION public.change_user_role(
  _target_user_id uuid,
  _new_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_role app_role;
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  
  -- Récupérer l'ancien rôle pour l'audit
  SELECT role INTO _old_role
  FROM public.user_roles
  WHERE user_id = _target_user_id;
  
  -- Effectuer le changement
  UPDATE public.user_roles
  SET role = _new_role
  WHERE user_id = _target_user_id;
  
  -- Logger dans la table d'audit
  INSERT INTO public.role_changes_audit (user_id, old_role, new_role, changed_by)
  VALUES (_target_user_id, _old_role, _new_role, auth.uid());
  
  RAISE NOTICE 'Admin % changed role of user % from % to %', 
    auth.uid(), _target_user_id, _old_role, _new_role;
END;
$$;

-- Enable RLS sur la table d'audit
ALTER TABLE public.role_changes_audit ENABLE ROW LEVEL SECURITY;

-- Politique: Seuls les admins peuvent voir l'audit
DROP POLICY IF EXISTS "Admins can view role changes audit" ON public.role_changes_audit;
CREATE POLICY "Admins can view role changes audit"
  ON public.role_changes_audit
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Migration 4: Sécurisation du bucket storage girlfriend-images
-- Rendre le bucket privé
UPDATE storage.buckets 
SET public = false 
WHERE id = 'girlfriend-images';

-- Supprimer anciennes politiques si existent
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Ajouter des politiques RLS pour l'accès aux images
CREATE POLICY "Users can view their own images"
  ON storage.objects 
  FOR SELECT
  USING (
    bucket_id = 'girlfriend-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own images"
  ON storage.objects 
  FOR INSERT
  WITH CHECK (
    bucket_id = 'girlfriend-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own images"
  ON storage.objects 
  FOR UPDATE
  USING (
    bucket_id = 'girlfriend-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own images"
  ON storage.objects 
  FOR DELETE
  USING (
    bucket_id = 'girlfriend-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );