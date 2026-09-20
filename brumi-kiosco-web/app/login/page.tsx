    "use client";

    import { useState, useEffect } from "react";
    import { account } from "../../lib/appwrite";
    import { Moon, Sun } from "lucide-react";

    export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [cargando, setCargando] = useState(false);
    const [modoOscuro, setModoOscuro] = useState(false);

    useEffect(() => {
        const temaGuardado = localStorage.getItem("brumi_tema");
        if (temaGuardado === "oscuro") setModoOscuro(true);
    }, []);

    const toggleModoOscuro = () => {
        const nuevoEstado = !modoOscuro;
        setModoOscuro(nuevoEstado);
        localStorage.setItem("brumi_tema", nuevoEstado ? "oscuro" : "claro");
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
        setCargando(true);
        await account.createEmailPasswordSession(email, password);
        window.location.href = "/";
        } catch (error) {
        console.error(error);
        alert("Error al iniciar sesión. Verificá que el mail y la contraseña sean los registrados en Appwrite.");
        } finally {
        setCargando(false);
        }
    };

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center font-sans transition-colors duration-300 relative ${modoOscuro ? "bg-gray-950" : "bg-[#f9fafb]"}`}>
        <button
            onClick={toggleModoOscuro}
            className={`absolute top-6 right-6 p-2.5 rounded-xl border shadow-sm flex items-center justify-center transition-all ${
            modoOscuro 
                ? "bg-gray-800 border-gray-700 text-yellow-400 hover:bg-gray-700" 
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
            }`}
            title="Alternar Modo Oscuro/Claro"
        >
            {modoOscuro ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className={`p-8 rounded-2xl shadow-sm border w-full max-w-sm transition-colors ${modoOscuro ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
            <div className="text-2xl font-bold italic mb-6 text-center">
            <span className="text-blue-600">PROVEE</span>
            <span className={modoOscuro ? "text-gray-100" : "text-[#0a1e3f]"}>KIOSCO</span>
            </div>
            
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
                <label className={`block text-xs font-semibold uppercase mb-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>
                Email
                </label>
                <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors ${modoOscuro ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"}`}
                placeholder="tu@email.com"
                required 
                />
            </div>
            <div>
                <label className={`block text-xs font-semibold uppercase mb-1 ${modoOscuro ? "text-gray-400" : "text-gray-500"}`}>
                Contraseña
                </label>
                <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors ${modoOscuro ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"}`}
                placeholder="••••••••"
                required 
                />
            </div>
            <button 
                type="submit" 
                disabled={cargando}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition mt-2 text-sm disabled:opacity-50"
            >
                {cargando ? "Entrando..." : "Ingresar"}
            </button>
            </form>
        </div>
        </div>
    );
    }