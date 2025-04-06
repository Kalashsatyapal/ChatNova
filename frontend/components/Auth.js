import { useState } from "react";
import { supabase } from "../lib/supabase";

const Auth = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    const { data, error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) return setError(error.message);

    if (!isLogin) {
      setSuccess("Sign-up successful! Please check your email to verify your account.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) return setError(userError.message);

    if (!userData?.user?.email_confirmed_at) {
      return setError("Please confirm your email before logging in.");
    }

    onAuthSuccess(userData.user);
  };

  return (
    <div className="max-w-md mx-auto mt-24 p-8 bg-white shadow-2xl rounded-2xl border border-gray-100">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
        {isLogin ? "Sign In" : "Sign Up"}
      </h2>

      {error && (
        <p className="text-red-600 text-sm text-center mb-4">{error}</p>
      )}
      {success && (
        <p className="text-green-600 text-sm text-center mb-4">{success}</p>
      )}

      <div className="space-y-4">
        <input
          type="email"
          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          className={`w-full py-3 rounded-lg font-semibold transition duration-200 ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
          onClick={handleAuth}
          disabled={loading}
        >
          {loading
            ? isLogin
              ? "Logging in..."
              : "Signing up..."
            : isLogin
            ? "Login"
            : "Sign Up"}
        </button>
      </div>

      <p className="text-center mt-6 text-sm text-gray-600">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          className="text-blue-600 font-medium hover:underline"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Sign Up" : "Login"}
        </button>
      </p>
    </div>
  );
};

export default Auth;
