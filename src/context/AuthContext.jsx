import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================================================
  // CARGAR PERFIL
  // =========================================================

  const cargarPerfil = async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);

      return data;
    } catch (error) {
      console.error(
        "Error cargando perfil:",
        error
      );

      setProfile(null);

      return null;
    }
  };

  // =========================================================
  // INICIALIZAR AUTH
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const iniciarAuth = async () => {
      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await cargarPerfil(
            session.user.id
          );
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error(
          "Error iniciando autenticación:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    iniciarAuth();

    // =======================================================
    // ESCUCHAR CAMBIOS DE SESIÓN
    // =======================================================

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) {
            return;
          }

          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            setTimeout(() => {
              cargarPerfil(
                session.user.id
              );
            }, 0);
          } else {
            setProfile(null);
          }

          setLoading(false);
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =========================================================
  // LOGIN
  // =========================================================

  const login = async (
    email,
    password
  ) => {
    const { data, error } =
      await supabase.auth
        .signInWithPassword({
          email,
          password,
        });

    if (error) {
      throw error;
    }

    return data;
  };

  // =========================================================
  // REGISTRO
  // =========================================================

  const register = async (
    email,
    password,
    fullName
  ) => {
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

    if (error) {
      throw error;
    }

    return data;
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const logout = async () => {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // =========================================================
  // ACTUALIZAR PERFIL
  // =========================================================

  const actualizarPerfil = async (
    cambios
  ) => {
    if (!user) {
      throw new Error(
        "No hay un usuario autenticado."
      );
    }

    const { data, error } =
      await supabase
        .from("profiles")
        .update(cambios)
        .eq("id", user.id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    setProfile(data);

    return data;
  };

  // =========================================================
  // CAMBIAR CONTRASEÑA
  // =========================================================

  const cambiarPassword = async (
    nuevaPassword
  ) => {
    const { data, error } =
      await supabase.auth.updateUser({
        password: nuevaPassword,
      });

    if (error) {
      throw error;
    }

    return data;
  };

  // =========================================================
  // VALORES DERIVADOS
  // =========================================================

  const isAdmin =
    profile?.role === "admin";

  const value = {
    user,
    session,
    profile,
    loading,
    isAdmin,

    login,
    register,
    logout,
    cargarPerfil,
    actualizarPerfil,
    cambiarPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider."
    );
  }

  return context;
};