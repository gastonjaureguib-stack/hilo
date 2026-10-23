
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "../lib/supabase.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] =
    useState(false);

  const userIdRef = useRef(null);
  const profileRequestRef = useRef(0);
  const mountedRef = useRef(false);

  // =========================================================
  // CARGAR PERFIL
  // =========================================================

  const cargarPerfil = useCallback(async (userId) => {
    const requestId = ++profileRequestRef.current;

    if (!userId) {
      if (mountedRef.current) {
        setProfile(null);
        setProfileLoading(false);
      }

      return null;
    }

    if (mountedRef.current) {
      setProfileLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (
        mountedRef.current &&
        requestId === profileRequestRef.current &&
        userIdRef.current === userId
      ) {
        setProfile(data ?? null);
      }

      return data ?? null;
    } catch (error) {
      console.error("Error cargando perfil:", error);

      if (
        mountedRef.current &&
        requestId === profileRequestRef.current &&
        userIdRef.current === userId
      ) {
        setProfile(null);
      }

      return null;
    } finally {
      if (
        mountedRef.current &&
        requestId === profileRequestRef.current
      ) {
        setProfileLoading(false);
      }
    }
  }, []);

  // =========================================================
  // INICIALIZAR Y ESCUCHAR AUTENTICACIÓN
  // =========================================================

  useEffect(() => {
    mountedRef.current = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!mountedRef.current) return;

        const nextUser = nextSession?.user ?? null;
        const nextUserId = nextUser?.id ?? null;
        const previousUserId = userIdRef.current;

        userIdRef.current = nextUserId;

        setSession(nextSession);
        setUser(nextUser);

        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
        }

        if (event === "SIGNED_OUT") {
          setIsPasswordRecovery(false);
        }

        if (!nextUserId) {
          profileRequestRef.current += 1;
          setProfile(null);
          setProfileLoading(false);
        } else if (previousUserId !== nextUserId) {
          setProfile(null);

          // Evitamos hacer consultas asíncronas
          // directamente dentro del callback de Auth.
          setTimeout(() => {
            if (
              mountedRef.current &&
              userIdRef.current === nextUserId
            ) {
              cargarPerfil(nextUserId);
            }
          }, 0);
        }

        setLoading(false);
      }
    );

    return () => {
      mountedRef.current = false;
      profileRequestRef.current += 1;
      subscription.unsubscribe();
    };
  }, [cargarPerfil]);

  // =========================================================
  // LOGIN
  // =========================================================

  const login = async (email, password) => {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) throw error;

    return data;
  };

  // =========================================================
  // REGISTRO
  // =========================================================

  const register = async (email, password, fullName) => {
    const { data, error } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

    if (error) throw error;

    return data;
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    userIdRef.current = null;
    profileRequestRef.current += 1;

    setUser(null);
    setSession(null);
    setProfile(null);
    setProfileLoading(false);
    setIsPasswordRecovery(false);
  };

  // =========================================================
  // ACTUALIZAR PERFIL
  // =========================================================

  const actualizarPerfil = async (cambios) => {
    if (!user) {
      throw new Error("No hay un usuario autenticado.");
    }

    const userId = user.id;

    const { data, error } = await supabase
      .from("profiles")
      .update(cambios)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    if (
      mountedRef.current &&
      userIdRef.current === userId
    ) {
      setProfile(data);
    }

    return data;
  };

  // =========================================================
  // CAMBIAR CONTRASEÑA
  // =========================================================

  const cambiarPassword = async (nuevaPassword) => {
    const { data, error } =
      await supabase.auth.updateUser({
        password: nuevaPassword,
      });

    if (error) throw error;

    return data;
  };

  // =========================================================
  // FINALIZAR RECUPERACIÓN
  // =========================================================

  const finalizarRecuperacion = () => {
    setIsPasswordRecovery(false);
  };

  // =========================================================
  // CONTEXTO
  // =========================================================

  const isAdmin = profile?.role === "admin";

  const value = {
    user,
    session,
    profile,
    loading,
    profileLoading,
    isAdmin,
    isPasswordRecovery,

    login,
    register,
    logout,
    cargarPerfil,
    actualizarPerfil,
    cambiarPassword,
    finalizarRecuperacion,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider."
    );
  }

  return context;
};
